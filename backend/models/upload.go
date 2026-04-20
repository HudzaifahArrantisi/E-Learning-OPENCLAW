package models

import (
	"database/sql"
	"time"
)

// Upload represents a file stored in the database (BYTEA)
type Upload struct {
	ID               int64          `json:"id"`
	UploaderID       int            `json:"uploader_id"`
	UploaderRole     string         `json:"uploader_role"`
	Type             string         `json:"type"`
	Variant          string         `json:"variant"`
	OriginalFilename string         `json:"original_filename"`
	MimeType         string         `json:"mime_type"`
	FileExtension    string         `json:"file_extension"`
	OriginalSize     int64          `json:"original_size"`
	CompressedSize   int64          `json:"compressed_size"`
	CompressionRatio float32        `json:"compression_ratio"`
	FileData         []byte         `json:"-"` // NEVER send binary in JSON response
	RelatedID        *int           `json:"related_id,omitempty"`
	RelatedTable     *string        `json:"related_table,omitempty"`
	Visibility       string         `json:"visibility"`
	Status           string         `json:"status"`
	ChecksumHash     *string        `json:"checksum_hash,omitempty"`
	ParentID         *int64         `json:"parent_id,omitempty"`
	CreatedAt        time.Time      `json:"created_at"`
	UpdatedAt        time.Time      `json:"updated_at"`
	DeletedAt        sql.NullTime   `json:"deleted_at,omitempty"`
}

// UploadMetadata is the JSON-safe version (tanpa binary data)
// Digunakan untuk response API list/feed
type UploadMetadata struct {
	ID               int64     `json:"id"`
	UploaderID       int       `json:"uploader_id"`
	UploaderRole     string    `json:"uploader_role"`
	Type             string    `json:"type"`
	Variant          string    `json:"variant"`
	OriginalFilename string    `json:"original_filename"`
	MimeType         string    `json:"mime_type"`
	FileExtension    string    `json:"file_extension"`
	OriginalSize     int64     `json:"original_size"`
	CompressedSize   int64     `json:"compressed_size"`
	CompressionRatio float32   `json:"compression_ratio"`
	Visibility       string    `json:"visibility"`
	Status           string    `json:"status"`
	FileURL          string    `json:"file_url"` // Virtual URL: /api/files/{id}
	CreatedAt        time.Time `json:"created_at"`
}

// UploadSession for chunked/resumable uploads (Instagram-style)
type UploadSession struct {
	ID             int64     `json:"id"`
	SessionToken   string    `json:"session_token"`
	UserID         int       `json:"user_id"`
	UserRole       string    `json:"user_role"`
	Filename       string    `json:"filename"`
	MimeType       string    `json:"mime_type"`
	TotalSize      int64     `json:"total_size"`
	TotalChunks    int       `json:"total_chunks"`
	UploadedChunks int       `json:"uploaded_chunks"`
	UploadType     string    `json:"upload_type"`
	Status         string    `json:"status"`
	UploadID       *int64    `json:"upload_id,omitempty"`
	CreatedAt      time.Time `json:"created_at"`
	ExpiresAt      time.Time `json:"expires_at"`
}
