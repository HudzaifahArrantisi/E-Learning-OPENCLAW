package controllers

import (
	"crypto/hmac"
	"crypto/sha256"
	"encoding/hex"
	"fmt"
	"io"
	"log"
	"mime/multipart"
	"net/http"
	"os"
	"path/filepath"
	"strconv"
	"strings"
	"time"

	"nf-student-hub-backend/config"
	"nf-student-hub-backend/utils"

	"github.com/gin-gonic/gin"
	"github.com/google/uuid"
)

// ============================================================
// UPLOAD CONFIGURATION
// ============================================================

const (
	MaxImageSize     = 10 * 1024 * 1024 // 10MB
	MaxDocumentSize  = 32 * 1024 * 1024 // 32MB
	DefaultURLSecret = "nf-student-hub-signed-url-secret-change-me"
	SignedURLExpiry   = 1 * time.Hour
)

// Allowed MIME types per upload type
var allowedMimeTypes = map[string][]string{
	"post": {
		"image/jpeg", "image/png", "image/gif", "image/webp",
	},
	"profile": {
		"image/jpeg", "image/png", "image/webp",
	},
	"materi": {
		"application/pdf",
		"application/msword",
		"application/vnd.openxmlformats-officedocument.wordprocessingml.document",
		"image/jpeg", "image/png",
		"application/zip",
	},
	"tugas_mahasiswa": {
		"application/pdf",
		"application/msword",
		"application/vnd.openxmlformats-officedocument.wordprocessingml.document",
		"image/jpeg", "image/png",
		"application/zip",
	},
	"tugas_dosen": {
		"application/pdf",
		"application/msword",
		"application/vnd.openxmlformats-officedocument.wordprocessingml.document",
		"image/jpeg", "image/png",
		"application/zip",
	},
	"document": {
		"application/pdf",
		"application/msword",
		"application/vnd.openxmlformats-officedocument.wordprocessingml.document",
		"application/zip",
	},
}

func getSignedURLSecret() string {
	secret := os.Getenv("SIGNED_URL_SECRET")
	if secret == "" {
		return DefaultURLSecret
	}
	return secret
}

// ============================================================
// POST /api/uploads — Upload file ke database (BYTEA)
// ============================================================
func UploadFile(c *gin.Context) {
	userID, exists := c.Get("user_id")
	if !exists {
		utils.ErrorResponse(c, http.StatusUnauthorized, "Unauthorized")
		return
	}

	role, exists := c.Get("role")
	if !exists {
		utils.ErrorResponse(c, http.StatusBadRequest, "Role tidak valid")
		return
	}

	// 1. Parse upload type
	uploadType := c.PostForm("type")
	if uploadType == "" {
		uploadType = "document"
	}

	validTypes := map[string]bool{
		"post": true, "materi": true, "tugas_mahasiswa": true,
		"tugas_dosen": true, "profile": true, "document": true,
	}
	if !validTypes[uploadType] {
		utils.ErrorResponse(c, http.StatusBadRequest,
			"Tipe upload tidak valid. Gunakan: post, materi, tugas_mahasiswa, tugas_dosen, profile, document")
		return
	}

	// 2. Get file from request
	fileHeader, err := c.FormFile("file")
	if err != nil {
		utils.ErrorResponse(c, http.StatusBadRequest, "File wajib diupload")
		return
	}

	// 3. Validate file size
	maxSize := int64(MaxDocumentSize)
	if uploadType == "post" || uploadType == "profile" {
		maxSize = MaxImageSize
	}
	if fileHeader.Size > maxSize {
		maxMB := maxSize / (1024 * 1024)
		utils.ErrorResponse(c, http.StatusBadRequest,
			fmt.Sprintf("File terlalu besar. Maksimal %dMB", maxMB))
		return
	}

	// 4. Open file
	file, err := fileHeader.Open()
	if err != nil {
		utils.ErrorResponse(c, http.StatusInternalServerError, "Gagal membuka file")
		return
	}
	defer file.Close()

	// 5. Read file into memory
	fileBytes, err := io.ReadAll(file)
	if err != nil {
		utils.ErrorResponse(c, http.StatusInternalServerError, "Gagal membaca file")
		return
	}

	// 6. Detect MIME type from content (keamanan — tidak bergantung pada extension)
	detectedMime := http.DetectContentType(fileBytes)

	// Validate MIME type
	allowed, ok := allowedMimeTypes[uploadType]
	if !ok {
		utils.ErrorResponse(c, http.StatusBadRequest, "Tipe upload tidak dikenali")
		return
	}

	mimeValid := false
	for _, m := range allowed {
		if strings.HasPrefix(detectedMime, m) || detectedMime == m {
			mimeValid = true
			break
		}
	}
	// Fallback: check declared Content-Type header for document types
	// (http.DetectContentType returns "application/octet-stream" for many doc types)
	if !mimeValid {
		declaredMime := fileHeader.Header.Get("Content-Type")
		for _, m := range allowed {
			if declaredMime == m {
				mimeValid = true
				detectedMime = declaredMime
				break
			}
		}
	}
	if !mimeValid {
		utils.ErrorResponse(c, http.StatusBadRequest,
			fmt.Sprintf("Tipe file '%s' tidak diizinkan untuk upload %s", detectedMime, uploadType))
		return
	}

	// 7. Generate SHA-256 checksum
	hash := sha256.Sum256(fileBytes)
	checksum := hex.EncodeToString(hash[:])

	// 8. Get file extension (sanitized)
	ext := strings.ToLower(filepath.Ext(filepath.Base(fileHeader.Filename)))
	if ext == "" {
		ext = ".bin"
	}

	// 9. Parse optional related_id and related_table
	var relatedID *int
	var relatedTable *string
	if rid := c.PostForm("related_id"); rid != "" {
		if id, err := strconv.Atoi(rid); err == nil {
			relatedID = &id
		}
	}
	if rt := c.PostForm("related_table"); rt != "" {
		relatedTable = &rt
	}

	// 10. Parse visibility
	visibility := c.PostForm("visibility")
	if visibility == "" {
		visibility = "public"
	}
	validVisibility := map[string]bool{"public": true, "private": true, "restricted": true}
	if !validVisibility[visibility] {
		visibility = "public"
	}

	// 11. Optimize file via Python (image/pdf supported, others passthrough)
	compressedBytes := fileBytes
	originalSize := int64(len(fileBytes))
	compressedSize := originalSize
	compressionRatio := float32(0)

	optimizedBytes, optimizedMime, optimizedExt, optimized, optimizeErr := utils.OptimizeFileWithPython(fileBytes, detectedMime, ext, 1200, 75)
	if optimizeErr != nil {
		log.Printf("[Upload] Python optimizer skipped (%s): %v", fileHeader.Filename, optimizeErr)
	} else if optimized {
		compressedBytes = optimizedBytes
		compressedSize = int64(len(optimizedBytes))
		compressionRatio = float32(100.0 - (float64(compressedSize) / float64(originalSize) * 100.0))
		detectedMime = optimizedMime
		ext = optimizedExt
		log.Printf("[Upload] File optimized by Python: %dKB → %dKB (%.1f%% saved)",
			originalSize/1024, compressedSize/1024, compressionRatio)
	}

	// 12. Insert ke database
	// Generate UUID for secure file access
	fileUUID := uuid.New().String()

	query := `
		INSERT INTO uploads (
			uploader_id, uploader_role, type, variant,
			original_filename, mime_type, file_extension,
			original_size, compressed_size, compression_ratio,
			file_data, related_id, related_table,
			visibility, status, checksum_hash, uuid, created_at, updated_at
		) VALUES (
			$1, $2, $3, 'original',
			$4, $5, $6,
			$7, $8, $9,
			$10, $11, $12,
			$13, 'ready', $14, $15, NOW(), NOW()
		)
		RETURNING id, created_at
	`

	var uploadID int64
	var createdAt time.Time
	err = config.DB.QueryRow(query,
		userID, role, uploadType,
		filepath.Base(fileHeader.Filename), detectedMime, ext,
		originalSize, compressedSize, compressionRatio,
		compressedBytes, relatedID, relatedTable,
		visibility, checksum, fileUUID,
	).Scan(&uploadID, &createdAt)

	if err != nil {
		log.Printf("[Upload] ERROR inserting to DB: %v", err)
		utils.ErrorResponse(c, http.StatusInternalServerError,
			"Gagal menyimpan file ke database: "+err.Error())
		return
	}

	// 13. Generate virtual URL (UUID-based for security)
	fileURL := fmt.Sprintf("/api/files/%s", fileUUID)

	log.Printf("[Upload] ✅ File saved: id=%d, type=%s, size=%dKB→%dKB, url=%s",
		uploadID, uploadType, originalSize/1024, compressedSize/1024, fileURL)

	utils.SuccessResponse(c, gin.H{
		"id":                uploadID,
		"file_url":          fileURL,
		"original_filename": fileHeader.Filename,
		"mime_type":         detectedMime,
		"original_size":     originalSize,
		"compressed_size":   compressedSize,
		"compression_ratio": fmt.Sprintf("%.1f%%", compressionRatio),
		"type":              uploadType,
		"visibility":        visibility,
		"status":            "ready",
		"created_at":        createdAt,
	}, "File berhasil diupload!")
}

// ============================================================
// GET /api/files/:id — Stream file dari database ke browser
// ============================================================
func ServeFile(c *gin.Context) {
	fileUUID := c.Param("id")

	// Check for signed URL token
	token := c.Query("token")
	if token != "" {
		if !validateSignedURL(fileUUID, token) {
			c.JSON(http.StatusForbidden, gin.H{"error": "Token tidak valid atau sudah expired"})
			return
		}
	}

	// Variant query parameter
	size := c.DefaultQuery("size", "original")

	// Determine if param is numeric (legacy ID) or UUID
	isNumeric := false
	if _, err := strconv.Atoi(fileUUID); err == nil {
		isNumeric = true
	}

	// Build query based on variant and ID type
	var query string
	var args []interface{}

	if size != "original" {
		// Try to find variant first
		if isNumeric {
			query = `
				SELECT file_data, mime_type, original_filename, compressed_size,
					   visibility, uploader_id, uploader_role, checksum_hash
				FROM uploads
				WHERE parent_id = $1 AND variant = $2 
					  AND deleted_at IS NULL AND status = 'ready'
				LIMIT 1
			`
		} else {
			query = `
				SELECT file_data, mime_type, original_filename, compressed_size,
					   visibility, uploader_id, uploader_role, checksum_hash
				FROM uploads
				WHERE parent_id = (SELECT id FROM uploads WHERE uuid = $1 LIMIT 1) AND variant = $2 
					  AND deleted_at IS NULL AND status = 'ready'
				LIMIT 1
			`
		}
		args = []interface{}{fileUUID, size}
	} else {
		if isNumeric {
			query = `
				SELECT file_data, mime_type, original_filename, compressed_size,
					   visibility, uploader_id, uploader_role, checksum_hash
				FROM uploads
				WHERE id = $1 AND deleted_at IS NULL AND status = 'ready'
			`
		} else {
			query = `
				SELECT file_data, mime_type, original_filename, compressed_size,
					   visibility, uploader_id, uploader_role, checksum_hash
				FROM uploads
				WHERE uuid = $1 AND deleted_at IS NULL AND status = 'ready'
			`
		}
		args = []interface{}{fileUUID}
	}

	var fileData []byte
	var mimeType, filename, visibility, uploaderRole string
	var checksum *string
	var fileSize int64
	var uploaderID int

	err := config.DB.QueryRow(query, args...).Scan(
		&fileData, &mimeType, &filename, &fileSize,
		&visibility, &uploaderID, &uploaderRole, &checksum,
	)

	if err != nil {
		// If variant not found, fall back to original
		if size != "original" {
			var fallbackQuery string
			if isNumeric {
				fallbackQuery = `
					SELECT file_data, mime_type, original_filename, compressed_size,
						   visibility, uploader_id, uploader_role, checksum_hash
					FROM uploads
					WHERE id = $1 AND deleted_at IS NULL AND status = 'ready'
				`
			} else {
				fallbackQuery = `
					SELECT file_data, mime_type, original_filename, compressed_size,
						   visibility, uploader_id, uploader_role, checksum_hash
					FROM uploads
					WHERE uuid = $1 AND deleted_at IS NULL AND status = 'ready'
				`
			}
			err = config.DB.QueryRow(fallbackQuery, fileUUID).Scan(
				&fileData, &mimeType, &filename, &fileSize,
				&visibility, &uploaderID, &uploaderRole, &checksum,
			)
		}

		if err != nil {
			c.Status(http.StatusNotFound)
			return
		}
	}

	// Access control for private files
	if visibility == "private" && token == "" {
		currentUserID, exists := c.Get("user_id")
		if !exists {
			c.JSON(http.StatusForbidden, gin.H{"error": "File ini bersifat privat. Login diperlukan."})
			return
		}
		if uid, ok := currentUserID.(int); ok && uid != uploaderID {
			currentRole, _ := c.Get("role")
			if currentRole != "admin" {
				c.JSON(http.StatusForbidden, gin.H{"error": "Anda tidak memiliki akses ke file ini"})
				return
			}
		}
	}

	// Set response headers
	c.Header("Content-Type", mimeType)
	c.Header("Content-Length", strconv.Itoa(len(fileData)))
	c.Header("Content-Disposition", fmt.Sprintf(`inline; filename="%s"`, filename))

	// Aggressive caching — files are immutable (identified by checksum)
	c.Header("Cache-Control", "public, max-age=31536000, immutable")
	c.Header("X-Content-Type-Options", "nosniff")

	if checksum != nil && *checksum != "" {
		c.Header("ETag", `"`+*checksum+`"`)

		// Check If-None-Match (browser cache hit)
		if match := c.GetHeader("If-None-Match"); match != "" {
			if match == `"`+*checksum+`"` {
				c.Status(http.StatusNotModified)
				return
			}
		}
	}

	c.Data(http.StatusOK, mimeType, fileData)
}

// ============================================================
// GET /api/files/:id/download — Force download (Content-Disposition: attachment)
// ============================================================
func DownloadFile(c *gin.Context) {
	fileUUID := c.Param("id")

	var fileData []byte
	var mimeType, filename string

	err := config.DB.QueryRow(`
		SELECT file_data, mime_type, original_filename
		FROM uploads
		WHERE uuid = $1 AND deleted_at IS NULL AND status = 'ready'
	`, fileUUID).Scan(&fileData, &mimeType, &filename)

	if err != nil {
		c.Status(http.StatusNotFound)
		return
	}

	c.Header("Content-Type", mimeType)
	c.Header("Content-Length", strconv.Itoa(len(fileData)))
	c.Header("Content-Disposition", fmt.Sprintf(`attachment; filename="%s"`, filename))
	c.Data(http.StatusOK, mimeType, fileData)
}

// ============================================================
// GET /api/uploads/type/:type — List uploads by type (metadata only, NO binary)
// ============================================================
func GetUploadsByType(c *gin.Context) {
	uploadType := c.Param("type")
	cursor := c.DefaultQuery("cursor", "0")
	limit := c.DefaultQuery("limit", "20")

	limitInt, _ := strconv.Atoi(limit)
	if limitInt <= 0 {
		limitInt = 20
	}
	if limitInt > 50 {
		limitInt = 50
	}

	query := `
		SELECT id, uuid, uploader_id, uploader_role, type,
		       original_filename, mime_type, file_extension,
		       original_size, compressed_size, compression_ratio,
		       visibility, status, created_at
		FROM uploads
		WHERE type = $1 AND deleted_at IS NULL AND status = 'ready'
		      AND variant = 'original'
		      AND ($2 = '0' OR id < $2::bigint)
		ORDER BY created_at DESC
		LIMIT $3
	`

	rows, err := config.DB.Query(query, uploadType, cursor, limitInt)
	if err != nil {
		utils.ErrorResponse(c, http.StatusInternalServerError, "Gagal mengambil data: "+err.Error())
		return
	}
	defer rows.Close()

	var uploads []gin.H
	var lastID int64
	for rows.Next() {
		var id, origSize, compSize int64
		var uploaderID int
		var fileUUIDStr, uploaderRole, uType, filename, mimeType, extStr, vis, status string
		var ratio float32
		var createdAt time.Time

		err := rows.Scan(
			&id, &fileUUIDStr, &uploaderID, &uploaderRole, &uType,
			&filename, &mimeType, &extStr,
			&origSize, &compSize, &ratio,
			&vis, &status, &createdAt,
		)
		if err != nil {
			continue
		}

		lastID = id
		uploads = append(uploads, gin.H{
			"id":                id,
			"file_url":          fmt.Sprintf("/api/files/%s", fileUUIDStr),
			"uploader_id":      uploaderID,
			"uploader_role":    uploaderRole,
			"type":             uType,
			"original_filename": filename,
			"mime_type":         mimeType,
			"original_size":     origSize,
			"compressed_size":   compSize,
			"compression_ratio": ratio,
			"visibility":        vis,
			"created_at":        createdAt,
		})
	}

	if uploads == nil {
		uploads = []gin.H{}
	}

	utils.SuccessResponse(c, gin.H{
		"uploads":     uploads,
		"next_cursor": lastID,
		"has_more":    len(uploads) == limitInt,
	}, "Data berhasil diambil")
}

// ============================================================
// DELETE /api/uploads/:id — Soft delete upload
// ============================================================
func DeleteUpload(c *gin.Context) {
	fileUUID := c.Param("id")
	userID, _ := c.Get("user_id")
	role, _ := c.Get("role")

	// Verify ownership
	var uploaderID int
	var uploadID int64
	err := config.DB.QueryRow(
		"SELECT id, uploader_id FROM uploads WHERE uuid = $1 AND deleted_at IS NULL",
		fileUUID,
	).Scan(&uploadID, &uploaderID)

	if err != nil {
		utils.ErrorResponse(c, http.StatusNotFound, "File tidak ditemukan")
		return
	}

	uid, _ := userID.(int)
	roleStr, _ := role.(string)
	if uid != uploaderID && roleStr != "admin" {
		utils.ErrorResponse(c, http.StatusForbidden, "Tidak memiliki izin untuk menghapus file ini")
		return
	}

	// Soft delete file + all variants
	_, err = config.DB.Exec(
		"UPDATE uploads SET deleted_at = NOW() WHERE (id = $1 OR parent_id = $1) AND deleted_at IS NULL",
		uploadID,
	)
	if err != nil {
		utils.ErrorResponse(c, http.StatusInternalServerError, "Gagal menghapus file: "+err.Error())
		return
	}

	utils.SuccessResponse(c, nil, "File berhasil dihapus")
}

// ============================================================
// GET /api/uploads/:id/signed-url — Generate Signed URL
// ============================================================
func GenerateSignedURL(c *gin.Context) {
	fileUUID := c.Param("id")
	userID, _ := c.Get("user_id")

	// Verify file exists
	var uploaderID int
	var visibility string
	var err error

	if _, numErr := strconv.Atoi(fileUUID); numErr == nil {
		err = config.DB.QueryRow(
			"SELECT uploader_id, visibility FROM uploads WHERE id = $1 AND deleted_at IS NULL",
			fileUUID,
		).Scan(&uploaderID, &visibility)
	} else {
		err = config.DB.QueryRow(
			"SELECT uploader_id, visibility FROM uploads WHERE uuid = $1 AND deleted_at IS NULL",
			fileUUID,
		).Scan(&uploaderID, &visibility)
	}

	if err != nil {
		utils.ErrorResponse(c, http.StatusNotFound, "File tidak ditemukan")
		return
	}

	// Generate signed token
	expiry := time.Now().Add(SignedURLExpiry).Unix()
	payload := fmt.Sprintf("%s:%d:%d", fileUUID, userID, expiry)

	mac := hmac.New(sha256.New, []byte(getSignedURLSecret()))
	mac.Write([]byte(payload))
	signature := hex.EncodeToString(mac.Sum(nil))

	token := fmt.Sprintf("%d:%d:%s", userID, expiry, signature)
	signedURL := fmt.Sprintf("/api/files/%s?token=%s", fileUUID, token)

	utils.SuccessResponse(c, gin.H{
		"signed_url": signedURL,
		"expires_at": time.Unix(expiry, 0),
		"expires_in": int(SignedURLExpiry.Seconds()),
	}, "Signed URL berhasil dibuat")
}

// validateSignedURL verifies an HMAC-signed token
func validateSignedURL(fileID, token string) bool {
	parts := strings.SplitN(token, ":", 3)
	if len(parts) != 3 {
		return false
	}

	userIDStr, expiryStr, signature := parts[0], parts[1], parts[2]

	expiry, err := strconv.ParseInt(expiryStr, 10, 64)
	if err != nil || time.Now().Unix() > expiry {
		return false
	}

	// Reconstruct expected signature
	payload := fmt.Sprintf("%s:%s:%s", fileID, userIDStr, expiryStr)
	mac := hmac.New(sha256.New, []byte(getSignedURLSecret()))
	mac.Write([]byte(payload))
	expectedSig := hex.EncodeToString(mac.Sum(nil))

	return hmac.Equal([]byte(signature), []byte(expectedSig))
}

// ============================================================
// GET /api/upload-status/:session_id — Check upload session status
// ============================================================
func GetUploadStatus(c *gin.Context) {
	sessionID := c.Param("session_id")

	var status, filename string
	var totalChunks, uploadedChunks int
	var uploadID *int64

	err := config.DB.QueryRow(`
		SELECT status, filename, total_chunks, uploaded_chunks, upload_id
		FROM upload_sessions
		WHERE session_token = $1
	`, sessionID).Scan(&status, &filename, &totalChunks, &uploadedChunks, &uploadID)

	if err != nil {
		utils.ErrorResponse(c, http.StatusNotFound, "Upload session tidak ditemukan")
		return
	}

	response := gin.H{
		"status":          status,
		"filename":        filename,
		"total_chunks":    totalChunks,
		"uploaded_chunks": uploadedChunks,
		"progress":        float64(uploadedChunks) / float64(totalChunks) * 100,
	}

	if uploadID != nil {
		// Look up UUID for this upload
		var fileUUIDStr string
		if err := config.DB.QueryRow("SELECT uuid FROM uploads WHERE id = $1", *uploadID).Scan(&fileUUIDStr); err == nil {
			response["file_url"] = fmt.Sprintf("/api/files/%s", fileUUIDStr)
		}
	}

	utils.SuccessResponse(c, response, "Status upload")
}

// ============================================================
// HELPER: UploadFileToDB — Reusable function untuk controller lain
// ============================================================
// Digunakan dari UKM/Ormawa/Admin CreatePost, Dosen UploadMateri, dll.
func UploadFileToDB(c *gin.Context, formFieldName string, uploaderID int, uploaderRole string, uploadType string, relatedID *int, relatedTable *string) (int64, string, error) {
	fileHeader, err := c.FormFile(formFieldName)
	if err != nil {
		return 0, "", fmt.Errorf("file tidak ditemukan di field '%s'", formFieldName)
	}

	// Validate file size
	maxSize := int64(MaxDocumentSize)
	if uploadType == "post" || uploadType == "profile" {
		maxSize = MaxImageSize
	}
	if fileHeader.Size > maxSize {
		return 0, "", fmt.Errorf("file terlalu besar (max %dMB)", maxSize/(1024*1024))
	}

	// Open and read file
	file, err := fileHeader.Open()
	if err != nil {
		return 0, "", fmt.Errorf("gagal membuka file")
	}
	defer file.Close()

	fileBytes, err := io.ReadAll(file)
	if err != nil {
		return 0, "", fmt.Errorf("gagal membaca file")
	}

	// Detect MIME type
	detectedMime := http.DetectContentType(fileBytes)

	// Validate MIME
	allowed, ok := allowedMimeTypes[uploadType]
	if !ok {
		return 0, "", fmt.Errorf("tipe upload tidak dikenali")
	}
	mimeValid := false
	for _, m := range allowed {
		if strings.HasPrefix(detectedMime, m) || detectedMime == m {
			mimeValid = true
			break
		}
	}
	if !mimeValid {
		declaredMime := fileHeader.Header.Get("Content-Type")
		for _, m := range allowed {
			if declaredMime == m {
				mimeValid = true
				detectedMime = declaredMime
				break
			}
		}
	}
	if !mimeValid {
		return 0, "", fmt.Errorf("tipe file '%s' tidak diizinkan", detectedMime)
	}

	// Checksum
	hash := sha256.Sum256(fileBytes)
	checksum := hex.EncodeToString(hash[:])

	// Extension
	ext := strings.ToLower(filepath.Ext(filepath.Base(fileHeader.Filename)))
	if ext == "" {
		ext = ".bin"
	}

	// Optimize file via Python (image/pdf supported, others passthrough)
	compressedBytes := fileBytes
	originalSize := int64(len(fileBytes))
	compressedSize := originalSize
	compressionRatio := float32(0)

	optimizedBytes, optimizedMime, optimizedExt, optimized, optimizeErr := utils.OptimizeFileWithPython(fileBytes, detectedMime, ext, 1200, 75)
	if optimizeErr != nil {
		log.Printf("[Upload] Python optimizer skipped (%s): %v", fileHeader.Filename, optimizeErr)
	} else if optimized {
		compressedBytes = optimizedBytes
		compressedSize = int64(len(optimizedBytes))
		compressionRatio = float32(100.0 - (float64(compressedSize) / float64(originalSize) * 100.0))
		detectedMime = optimizedMime
		ext = optimizedExt
	}

	// Insert ke database
	var uploadIDResult int64
	var returnedUUID string
	err = config.DB.QueryRow(`
		INSERT INTO uploads (
			uploader_id, uploader_role, type, variant,
			original_filename, mime_type, file_extension,
			original_size, compressed_size, compression_ratio,
			file_data, related_id, related_table,
			visibility, status, checksum_hash, uuid, created_at, updated_at
		) VALUES (
			$1, $2, $3, 'original',
			$4, $5, $6,
			$7, $8, $9,
			$10, $11, $12,
			'public', 'ready', $13, $14, NOW(), NOW()
		)
		RETURNING id, uuid
	`, uploaderID, uploaderRole, uploadType,
		filepath.Base(fileHeader.Filename), detectedMime, ext,
		originalSize, compressedSize, compressionRatio,
		compressedBytes, relatedID, relatedTable,
		checksum, uuid.New().String(),
	).Scan(&uploadIDResult, &returnedUUID)

	if err != nil {
		return 0, "", fmt.Errorf("gagal menyimpan file ke database: %v", err)
	}

	fileURL := fmt.Sprintf("/api/files/%s", returnedUUID)

	log.Printf("[Upload] ✅ Saved: id=%d, type=%s, role=%s, %dKB→%dKB",
		uploadIDResult, uploadType, uploaderRole, originalSize/1024, compressedSize/1024)

	return uploadIDResult, fileURL, nil
}

// ============================================================
// readFileBytes reads all bytes from a multipart.File
// Used by carousel multi-upload in feedController
// ============================================================
func readFileBytes(file io.Reader) ([]byte, error) {
	return io.ReadAll(file)
}

// ============================================================
// uploadBytesToDB uploads raw file bytes directly to the uploads table
// Used by carousel multi-upload (avoids needing gin context per file)
// ============================================================
func uploadBytesToDB(fh *multipart.FileHeader, fileBytes []byte, uploaderID int, uploaderRole string, uploadType string) (int64, string, error) {
	// Detect MIME type
	detectedMime := http.DetectContentType(fileBytes)

	// Validate MIME
	allowed, ok := allowedMimeTypes[uploadType]
	if !ok {
		return 0, "", fmt.Errorf("tipe upload tidak dikenali")
	}
	mimeValid := false
	for _, m := range allowed {
		if strings.HasPrefix(detectedMime, m) || detectedMime == m {
			mimeValid = true
			break
		}
	}
	if !mimeValid {
		declaredMime := fh.Header.Get("Content-Type")
		for _, m := range allowed {
			if declaredMime == m {
				mimeValid = true
				detectedMime = declaredMime
				break
			}
		}
	}
	if !mimeValid {
		return 0, "", fmt.Errorf("tipe file '%s' tidak diizinkan", detectedMime)
	}

	// Checksum
	hash := sha256.Sum256(fileBytes)
	checksum := hex.EncodeToString(hash[:])

	// Extension
	ext := strings.ToLower(filepath.Ext(filepath.Base(fh.Filename)))
	if ext == "" {
		ext = ".bin"
	}

	// Optimize file via Python
	compressedBytes := fileBytes
	originalSize := int64(len(fileBytes))
	compressedSize := originalSize
	compressionRatio := float32(0)

	optimizedBytes, optimizedMime, optimizedExt, optimized, optimizeErr := utils.OptimizeFileWithPython(fileBytes, detectedMime, ext, 1200, 75)
	if optimizeErr != nil {
		log.Printf("[Upload] Python optimizer skipped (%s): %v", fh.Filename, optimizeErr)
	} else if optimized {
		compressedBytes = optimizedBytes
		compressedSize = int64(len(optimizedBytes))
		compressionRatio = float32(100.0 - (float64(compressedSize) / float64(originalSize) * 100.0))
		detectedMime = optimizedMime
		ext = optimizedExt
	}

	// Insert ke database
	var uploadIDResult int64
	var returnedUUID string
	err := config.DB.QueryRow(`
		INSERT INTO uploads (
			uploader_id, uploader_role, type, variant,
			original_filename, mime_type, file_extension,
			original_size, compressed_size, compression_ratio,
			file_data, related_id, related_table,
			visibility, status, checksum_hash, uuid, created_at, updated_at
		) VALUES (
			$1, $2, $3, 'original',
			$4, $5, $6,
			$7, $8, $9,
			$10, NULL, NULL,
			'public', 'ready', $11, $12, NOW(), NOW()
		)
		RETURNING id, uuid
	`, uploaderID, uploaderRole, uploadType,
		filepath.Base(fh.Filename), detectedMime, ext,
		originalSize, compressedSize, compressionRatio,
		compressedBytes, checksum, uuid.New().String(),
	).Scan(&uploadIDResult, &returnedUUID)

	if err != nil {
		return 0, "", fmt.Errorf("gagal menyimpan file ke database: %v", err)
	}

	fileURL := fmt.Sprintf("/api/files/%s", returnedUUID)

	log.Printf("[Upload] ✅ Carousel file saved: id=%d, %dKB→%dKB",
		uploadIDResult, originalSize/1024, compressedSize/1024)

	return uploadIDResult, fileURL, nil
}
