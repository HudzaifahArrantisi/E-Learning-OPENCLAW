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
	MaxImageSize     = 20 * 1024 * 1024 // 20MB
	MaxDocumentSize  = 50 * 1024 * 1024 // 50MB
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


// handel file url menggunakan uuid
// save file di storage
// 
func processAndStoreFile(
	fileBytes []byte,
	fileHeader *multipart.FileHeader,
	uploaderID int,
	uploaderRole string,
	uploadType string,
	relatedID *int,
	relatedTable *string,
	visibility string,
) (int64, string, error) {

	// 1. Detect MIME type from content (security — not relying on extension)
	detectedMime := http.DetectContentType(fileBytes)

	// 2. Validate MIME type
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
	// Fallback: check declared Content-Type header for document types
	if !mimeValid && fileHeader != nil {
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
		return 0, "", fmt.Errorf("tipe file '%s' tidak diizinkan untuk upload %s", detectedMime, uploadType)
	}

	// 3. Generate SHA-256 checksum
	hash := sha256.Sum256(fileBytes)
	checksum := hex.EncodeToString(hash[:])

	// 4. Get file extension (sanitized)
	originalFilename := "file"
	if fileHeader != nil {
		originalFilename = filepath.Base(fileHeader.Filename)
	}
	ext := strings.ToLower(filepath.Ext(originalFilename))
	if ext == "" {
		ext = ".bin"
	}

	// 5. Smart image optimization (native Go — no Python subprocess)
	finalBytes := fileBytes
	originalSize := int64(len(fileBytes))
	compressedSize := originalSize
	compressionRatio := float32(0)
	imgWidth := 0
	imgHeight := 0

	if utils.IsImageMime(detectedMime) {
		processed, processErr := utils.ProcessUploadedImage(fileBytes, detectedMime)
		if processErr != nil {
			log.Printf("[Upload] ⚠️ Image optimization failed (%s): %v — storing original", originalFilename, processErr)
		} else {
			finalBytes = processed.Data
			compressedSize = processed.CompressedSize
			compressionRatio = processed.CompressionRatio
			detectedMime = processed.MimeType
			ext = processed.Extension
			imgWidth = processed.Width
			imgHeight = processed.Height
			log.Printf("[Upload] 🖼️ Image optimized: %dKB → %dKB (%.1f%% saved, %dx%d, %s)",
				originalSize/1024, compressedSize/1024, compressionRatio,
				imgWidth, imgHeight, detectedMime)
		}
	}

	// 6. Save file to filesystem
	filePath, err := utils.SaveToStorage(finalBytes, uploadType, ext)
	if err != nil {
		return 0, "", fmt.Errorf("gagal menyimpan file ke storage: %v", err)
	}

	// 7. Insert metadata to database (NO binary data — only path)
	fileUUID := uuid.New().String()

	query := `
		INSERT INTO uploads (
			uploader_id, uploader_role, type, variant,
			original_filename, mime_type, file_extension,
			original_size, compressed_size, compression_ratio,
			file_path, width, height,
			related_id, related_table,
			visibility, status, checksum_hash, uuid, created_at, updated_at
		) VALUES (
			$1, $2, $3, 'original',
			$4, $5, $6,
			$7, $8, $9,
			$10, $11, $12,
			$13, $14,
			$15, 'ready', $16, $17, NOW(), NOW()
		)
		RETURNING id, created_at
	`

	var uploadID int64
	var createdAt time.Time
	err = config.DB.QueryRow(query,
		uploaderID, uploaderRole, uploadType,
		originalFilename, detectedMime, ext,
		originalSize, compressedSize, compressionRatio,
		filePath, imgWidth, imgHeight,
		relatedID, relatedTable,
		visibility, checksum, fileUUID,
	).Scan(&uploadID, &createdAt)

	if err != nil {
		// Cleanup: remove file from storage if DB insert fails
		if cleanupErr := utils.DeleteFromStorage(filePath); cleanupErr != nil {
			log.Printf("[Upload] ⚠️ Failed to cleanup file after DB error: %v", cleanupErr)
		}
		return 0, "", fmt.Errorf("gagal menyimpan metadata ke database: %v", err)
	}

	fileURL := fmt.Sprintf("/api/files/%s", fileUUID)

	log.Printf("[Upload] ✅ File saved: id=%d, type=%s, path=%s, size=%dKB→%dKB, url=%s",
		uploadID, uploadType, filePath, originalSize/1024, compressedSize/1024, fileURL)

	return uploadID, fileURL, nil
}

// ============================================================
// POST /api/uploads — Upload file (filesystem + metadata in DB)
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

	// 4. Open and read file
	file, err := fileHeader.Open()
	if err != nil {
		utils.ErrorResponse(c, http.StatusInternalServerError, "Gagal membuka file")
		return
	}
	defer file.Close()

	fileBytes, err := io.ReadAll(file)
	if err != nil {
		utils.ErrorResponse(c, http.StatusInternalServerError, "Gagal membaca file")
		return
	}

	// 5. Parse optional related_id and related_table
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

	// 6. Parse visibility
	visibility := c.PostForm("visibility")
	if visibility == "" {
		visibility = "public"
	}
	validVisibility := map[string]bool{"public": true, "private": true, "restricted": true}
	if !validVisibility[visibility] {
		visibility = "public"
	}

	// 7. Process and store via unified pipeline
	uid, _ := userID.(int)
	roleStr, _ := role.(string)

	uploadID, fileURL, err := processAndStoreFile(
		fileBytes, fileHeader,
		uid, roleStr, uploadType,
		relatedID, relatedTable, visibility,
	)
	if err != nil {
		log.Printf("[Upload] ERROR: %v", err)
		utils.ErrorResponse(c, http.StatusInternalServerError, err.Error())
		return
	}

	// 8. Build response — query back the saved metadata for complete response
	var origSize, compSize int64
	var ratio float32
	var mime, createdAtStr string
	var width, height int
	config.DB.QueryRow(`
		SELECT original_size, compressed_size, compression_ratio, mime_type, width, height, created_at::text
		FROM uploads WHERE id = $1
	`, uploadID).Scan(&origSize, &compSize, &ratio, &mime, &width, &height, &createdAtStr)

	utils.SuccessResponse(c, gin.H{
		"id":                uploadID,
		"file_url":          fileURL,
		"original_filename": fileHeader.Filename,
		"mime_type":         mime,
		"original_size":     origSize,
		"compressed_size":   compSize,
		"compression_ratio": fmt.Sprintf("%.1f%%", ratio),
		"width":             width,
		"height":            height,
		"type":              uploadType,
		"visibility":        visibility,
		"status":            "ready",
	}, "File berhasil diupload!")
}

// ============================================================
// GET /api/files/:id — Stream file from filesystem (or DB fallback)
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

	// Build query — now includes file_path for filesystem serving
	var query string
	var args []interface{}

	if size != "original" {
		// Try to find variant first
		if isNumeric {
			query = `
				SELECT file_path, file_data, mime_type, original_filename, compressed_size,
				       visibility, uploader_id, uploader_role, checksum_hash
				FROM uploads
				WHERE parent_id = $1 AND variant = $2 
				      AND deleted_at IS NULL AND status = 'ready'
				LIMIT 1
			`
		} else {
			query = `
				SELECT file_path, file_data, mime_type, original_filename, compressed_size,
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
				SELECT file_path, file_data, mime_type, original_filename, compressed_size,
				       visibility, uploader_id, uploader_role, checksum_hash
				FROM uploads
				WHERE id = $1 AND deleted_at IS NULL AND status = 'ready'
			`
		} else {
			query = `
				SELECT file_path, file_data, mime_type, original_filename, compressed_size,
				       visibility, uploader_id, uploader_role, checksum_hash
				FROM uploads
				WHERE uuid = $1 AND deleted_at IS NULL AND status = 'ready'
			`
		}
		args = []interface{}{fileUUID}
	}

	var filePath *string
	var fileData []byte
	var mimeType, filename, visibility, uploaderRole string
	var checksum *string
	var fileSize int64
	var uploaderID int

	err := config.DB.QueryRow(query, args...).Scan(
		&filePath, &fileData, &mimeType, &filename, &fileSize,
		&visibility, &uploaderID, &uploaderRole, &checksum,
	)

	if err != nil {
		// If variant not found, fall back to original
		if size != "original" {
			var fallbackQuery string
			if isNumeric {
				fallbackQuery = `
					SELECT file_path, file_data, mime_type, original_filename, compressed_size,
					       visibility, uploader_id, uploader_role, checksum_hash
					FROM uploads
					WHERE id = $1 AND deleted_at IS NULL AND status = 'ready'
				`
			} else {
				fallbackQuery = `
					SELECT file_path, file_data, mime_type, original_filename, compressed_size,
					       visibility, uploader_id, uploader_role, checksum_hash
					FROM uploads
					WHERE uuid = $1 AND deleted_at IS NULL AND status = 'ready'
				`
			}
			err = config.DB.QueryRow(fallbackQuery, fileUUID).Scan(
				&filePath, &fileData, &mimeType, &filename, &fileSize,
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

	// Resolve file data: filesystem first, BYTEA fallback for legacy records
	var responseData []byte

	if filePath != nil && *filePath != "" {
		// New uploads: read from filesystem
		data, readErr := utils.ReadFromStorage(*filePath)
		if readErr != nil {
			log.Printf("[ServeFile] ⚠️ Failed to read from filesystem (%s), falling back to BYTEA: %v", *filePath, readErr)
			// Fall back to BYTEA if filesystem read fails
			if len(fileData) > 0 {
				responseData = fileData
			} else {
				c.Status(http.StatusNotFound)
				return
			}
		} else {
			responseData = data
		}
	} else if len(fileData) > 0 {
		// Legacy uploads: read from database BYTEA
		responseData = fileData
	} else {
		c.Status(http.StatusNotFound)
		return
	}

	// Set response headers
	c.Header("Content-Type", mimeType)
	c.Header("Content-Length", strconv.Itoa(len(responseData)))
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

	c.Data(http.StatusOK, mimeType, responseData)
}

// ============================================================
// GET /api/files/:id/download — Force download (Content-Disposition: attachment)
// ============================================================
func DownloadFile(c *gin.Context) {
	fileUUID := c.Param("id")

	var filePath *string
	var fileData []byte
	var mimeType, filename string

	err := config.DB.QueryRow(`
		SELECT file_path, file_data, mime_type, original_filename
		FROM uploads
		WHERE uuid = $1 AND deleted_at IS NULL AND status = 'ready'
	`, fileUUID).Scan(&filePath, &fileData, &mimeType, &filename)

	if err != nil {
		c.Status(http.StatusNotFound)
		return
	}

	// Resolve file data: filesystem first, BYTEA fallback
	var responseData []byte
	if filePath != nil && *filePath != "" {
		data, readErr := utils.ReadFromStorage(*filePath)
		if readErr != nil {
			if len(fileData) > 0 {
				responseData = fileData
			} else {
				c.Status(http.StatusNotFound)
				return
			}
		} else {
			responseData = data
		}
	} else if len(fileData) > 0 {
		responseData = fileData
	} else {
		c.Status(http.StatusNotFound)
		return
	}

	c.Header("Content-Type", mimeType)
	c.Header("Content-Length", strconv.Itoa(len(responseData)))
	c.Header("Content-Disposition", fmt.Sprintf(`attachment; filename="%s"`, filename))
	c.Data(http.StatusOK, mimeType, responseData)
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
		       COALESCE(width, 0), COALESCE(height, 0),
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
		var width, height int
		var createdAt time.Time

		err := rows.Scan(
			&id, &fileUUIDStr, &uploaderID, &uploaderRole, &uType,
			&filename, &mimeType, &extStr,
			&origSize, &compSize, &ratio,
			&width, &height,
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
			"width":             width,
			"height":            height,
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

	// Note: Physical files on filesystem are NOT deleted during soft delete.
	// They can be cleaned up later by a background job that scans for
	// records with deleted_at IS NOT NULL and removes their file_path files.

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

	// ngebuat signed url/token
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

// validashi hmac token masuk
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
// Now uses the unified processAndStoreFile pipeline (filesystem storage).
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

	// Use unified pipeline
	return processAndStoreFile(fileBytes, fileHeader, uploaderID, uploaderRole, uploadType, relatedID, relatedTable, "public")
}

// ============================================================
// readFileBytes reads all bytes from a multipart.File
// Used by carousel multi-upload in feedController
// ============================================================
func readFileBytes(file io.Reader) ([]byte, error) {
	return io.ReadAll(file)
}

// ============================================================
// uploadBytesToDB uploads raw file bytes directly
// Used by carousel multi-upload (avoids needing gin context per file)
// Now uses the unified processAndStoreFile pipeline (filesystem storage).
// ============================================================
func uploadBytesToDB(fh *multipart.FileHeader, fileBytes []byte, uploaderID int, uploaderRole string, uploadType string) (int64, string, error) {
	return processAndStoreFile(fileBytes, fh, uploaderID, uploaderRole, uploadType, nil, nil, "public")
}
