package utils

import (
	"fmt"
	"mime/multipart"
	"path/filepath"
	"strings"
)

// UploadConfig konfigurasi validasi upload
type UploadConfig struct {
	AllowedExtensions []string // e.g. [".jpg", ".png", ".gif", ".webp"]
	MaxFileSize       int64    // in bytes, e.g. 5 * 1024 * 1024 = 5MB
}

// DefaultImageConfig konfigurasi default untuk upload gambar
var DefaultImageConfig = UploadConfig{
	AllowedExtensions: []string{".jpg", ".jpeg", ".png", ".gif", ".webp"},
	MaxFileSize:       5 * 1024 * 1024, // 5MB
}

// DefaultDocumentConfig konfigurasi default untuk upload dokumen (tugas/materi)
var DefaultDocumentConfig = UploadConfig{
	AllowedExtensions: []string{".pdf", ".doc", ".docx", ".zip", ".jpg", ".jpeg", ".png"},
	MaxFileSize:       32 * 1024 * 1024, // 32MB
}

// ValidateUpload memvalidasi file upload terhadap konfigurasi
// Returns: sanitized filename extension, error message
func ValidateUpload(header *multipart.FileHeader, config UploadConfig) (string, error) {
	// 1. Sanitize filename — ambil hanya base name untuk mencegah path traversal
	baseName := filepath.Base(header.Filename)
	ext := strings.ToLower(filepath.Ext(baseName))

	// 2. Cek ekstensi
	allowed := false
	for _, allowedExt := range config.AllowedExtensions {
		if ext == allowedExt {
			allowed = true
			break
		}
	}
	if !allowed {
		return "", fmt.Errorf("tipe file '%s' tidak diizinkan. Gunakan: %s",
			ext, strings.Join(config.AllowedExtensions, ", "))
	}

	// 3. Cek ukuran file
	if header.Size > config.MaxFileSize {
		maxMB := config.MaxFileSize / (1024 * 1024)
		return "", fmt.Errorf("ukuran file terlalu besar. Maksimal %dMB", maxMB)
	}

	// 4. Cek nama file tidak mengandung karakter berbahaya
	if strings.Contains(baseName, "..") || strings.Contains(baseName, "/") || strings.Contains(baseName, "\\") {
		return "", fmt.Errorf("nama file mengandung karakter tidak valid")
	}

	return ext, nil
}
