package main

// ============================================================
// MIGRATION TOOL: /uploads filesystem → PostgreSQL BYTEA
// ============================================================
// Usage: go run tools/migrate_uploads_to_db.go
// 
// This script:
// 1. Scans all files in uploads/ subdirectories
// 2. Reads each file as binary
// 3. Inserts into uploads table
// 4. Updates posts.media_url to use /api/files/{id}
// 5. Prints a migration report
//
// IMPORTANT: Run this AFTER creating the uploads table (migration_uploads.sql)
// IMPORTANT: Backup your database BEFORE running this script
// ============================================================

import (
	"crypto/sha256"
	"database/sql"
	"encoding/hex"
	"fmt"
	"log"
	"net/http"
	"os"
	"path/filepath"
	"strings"

	"github.com/joho/godotenv"
	_ "github.com/jackc/pgx/v5/stdlib"
)

// folderMapping maps directory → upload_type
var folderMapping = map[string]string{
	"uploads/posts":     "post",
	"uploads/materi":    "materi",
	"uploads/tugas":     "tugas_mahasiswa",
	"uploads/tugasdosen": "tugas_dosen",
	"uploads/profile":   "profile",
}

type migrationResult struct {
	folder    string
	fileName  string
	uploadID  int64
	oldPath   string
	newURL    string
	sizeKB    int64
	success   bool
	errMsg    string
}

func main() {
	godotenv.Load()
	godotenv.Load("../.env") // try parent dir too

	dsn := os.Getenv("DB_DSN")
	if dsn == "" {
		log.Fatal("DB_DSN environment variable is required")
	}

	db, err := sql.Open("pgx", dsn)
	if err != nil {
		log.Fatalf("Failed to connect: %v", err)
	}
	defer db.Close()

	if err := db.Ping(); err != nil {
		log.Fatalf("Failed to ping database: %v", err)
	}

	fmt.Println("============================================================")
	fmt.Println("  📦 NF-Student-HUB Upload Migration Tool")
	fmt.Println("  Filesystem /uploads → PostgreSQL BYTEA")
	fmt.Println("============================================================")
	fmt.Println()

	var results []migrationResult
	var totalFiles, successCount, failCount int
	var totalOriginalKB, totalNewKB int64

	for folder, uploadType := range folderMapping {
		// Auto-detect correct path (check current and parent dir)
		targetFolder := folder
		if _, err := os.Stat(targetFolder); os.IsNotExist(err) {
			// Try parent directory path
			targetFolder = filepath.Join("..", folder)
		}

		fmt.Printf("📁 Scanning %s → type=%s\n", targetFolder, uploadType)

		if _, err := os.Stat(targetFolder); os.IsNotExist(err) {
			fmt.Printf("   ⏭️  Directory '%s' not found, skipping\n\n", targetFolder)
			continue
		}

		filepath.Walk(targetFolder, func(path string, info os.FileInfo, err error) error {
			if err != nil || info.IsDir() {
				return nil
			}

			totalFiles++

			// Read file
			data, err := os.ReadFile(path)
			if err != nil {
				failCount++
				results = append(results, migrationResult{
					folder: folder, fileName: info.Name(),
					success: false, errMsg: err.Error(),
				})
				return nil
			}

			// Detect MIME type
			mimeType := http.DetectContentType(data)
			ext := strings.ToLower(filepath.Ext(info.Name()))
			fileSize := int64(len(data))

			// Generate checksum
			hash := sha256.Sum256(data)
			checksum := hex.EncodeToString(hash[:])

			// Build old URL path
			oldURL := "/" + strings.ReplaceAll(path, "\\", "/")

			// Insert into database
			var uploadID int64
			err = db.QueryRow(`
				INSERT INTO uploads (
					uploader_id, uploader_role, type, variant,
					original_filename, mime_type, file_extension,
					original_size, compressed_size, compression_ratio,
					file_data, visibility, status, checksum_hash,
					created_at, updated_at
				) VALUES (
					0, 'admin', $1, 'original',
					$2, $3, $4,
					$5, $5, 0,
					$6, 'public', 'ready', $7,
					NOW(), NOW()
				)
				RETURNING id
			`, uploadType, info.Name(), mimeType, ext,
				fileSize, data, checksum,
			).Scan(&uploadID)

			if err != nil {
				failCount++
				results = append(results, migrationResult{
					folder: folder, fileName: info.Name(),
					success: false, errMsg: err.Error(),
				})
				fmt.Printf("   ❌ %s — ERROR: %v\n", info.Name(), err)
				return nil
			}

			newURL := fmt.Sprintf("/api/files/%d", uploadID)

			// Update posts.media_url references
			result, _ := db.Exec(
				"UPDATE posts SET media_url = $1 WHERE media_url = $2",
				newURL, oldURL,
			)
			rowsAffected, _ := result.RowsAffected()

			successCount++
			totalOriginalKB += fileSize / 1024
			totalNewKB += fileSize / 1024

			results = append(results, migrationResult{
				folder:   folder,
				fileName: info.Name(),
				uploadID: uploadID,
				oldPath:  oldURL,
				newURL:   newURL,
				sizeKB:   fileSize / 1024,
				success:  true,
			})

			fmt.Printf("   ✅ %s → id=%d (%dKB)", info.Name(), uploadID, fileSize/1024)
			if rowsAffected > 0 {
				fmt.Printf(" [%d post(s) updated]", rowsAffected)
			}
			fmt.Println()

			return nil
		})
		fmt.Println()
	}

	// Print summary
	fmt.Println("============================================================")
	fmt.Println("  📊 MIGRATION REPORT")
	fmt.Println("============================================================")
	fmt.Printf("  Total files scanned:    %d\n", totalFiles)
	fmt.Printf("  Successfully migrated:  %d ✅\n", successCount)
	fmt.Printf("  Failed:                 %d ❌\n", failCount)
	fmt.Printf("  Total size:             %d KB (~%d MB)\n", totalOriginalKB, totalOriginalKB/1024)
	fmt.Println()
	fmt.Println("  ⚠️  NEXT STEPS:")
	fmt.Println("  1. Verify all media_url in posts table now point to /api/files/{id}")
	fmt.Println("  2. Update materi/tugas file references manually if needed")
	fmt.Println("  3. Deploy the new backend with /api/files/:id endpoint")
	fmt.Println("  4. Test all file serving in browser")
	fmt.Println("  5. ONLY THEN delete the /uploads directory")
	fmt.Println("============================================================")
}
