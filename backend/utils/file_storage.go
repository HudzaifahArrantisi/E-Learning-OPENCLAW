package utils

import (
	"fmt"
	"os"
	"path/filepath"
	"runtime"
	"strings"
	"time"

	"github.com/google/uuid"
)


var storageBaseDir string

func init() {
	storageBaseDir = resolveStorageBase()
}

func resolveStorageBase() string {
	if dir := os.Getenv("UPLOAD_STORAGE_DIR"); dir != "" {
		return dir
	}

	_, currentFile, _, ok := runtime.Caller(0)
	if ok {
		return filepath.Join(filepath.Dir(currentFile), "..", "uploads")
	}

	return "uploads"
}

func GetStorageBaseDir() string {
	return storageBaseDir
}


func SaveToStorage(data []byte, uploadType string, ext string) (string, error) {
	if len(data) == 0 {
		return "", fmt.Errorf("cannot save empty file data")
	}

	uploadType = sanitizePath(uploadType)
	if uploadType == "" {
		uploadType = "general"
	}

	ext = strings.ToLower(ext)
	if !strings.HasPrefix(ext, ".") {
		ext = "." + ext
	}

	now := time.Now()
	yearDir := fmt.Sprintf("%d", now.Year())
	monthDir := fmt.Sprintf("%02d", now.Month())

	relDir := filepath.Join(uploadType, yearDir, monthDir)
	absDir := filepath.Join(storageBaseDir, relDir)

	if err := os.MkdirAll(absDir, 0o755); err != nil {
		return "", fmt.Errorf("failed to create storage directory %s: %w", absDir, err)
	}

	filename := uuid.New().String() + ext
	relPath := filepath.Join(relDir, filename)
	absPath := filepath.Join(storageBaseDir, relPath)

	if err := os.WriteFile(absPath, data, 0o644); err != nil {
		return "", fmt.Errorf("failed to write file %s: %w", absPath, err)
	}

	return filepath.ToSlash(relPath), nil
}


func ReadFromStorage(relativePath string) ([]byte, error) {
	if relativePath == "" {
		return nil, fmt.Errorf("empty file path")
	}

	absPath := filepath.Join(storageBaseDir, filepath.FromSlash(relativePath))

	// Verify the resolved path is within the storage directory (prevent traversal)
	absPath, err := filepath.Abs(absPath)
	if err != nil {
		return nil, fmt.Errorf("invalid file path: %w", err)
	}

	absBase, err := filepath.Abs(storageBaseDir)
	if err != nil {
		return nil, fmt.Errorf("invalid storage base: %w", err)
	}

	if !strings.HasPrefix(absPath, absBase) {
		return nil, fmt.Errorf("path traversal detected")
	}

	data, err := os.ReadFile(absPath)
	if err != nil {
		if os.IsNotExist(err) {
			return nil, fmt.Errorf("file not found: %s", relativePath)
		}
		return nil, fmt.Errorf("failed to read file: %w", err)
	}

	return data, nil
}

// DeleteFromStorage removes a file from the local filesystem.
//
// Parameter relativePath should be the path stored in the database.
// Returns nil if the file doesn't exist (idempotent).
func DeleteFromStorage(relativePath string) error {
	if relativePath == "" {
		return nil // Nothing to delete
	}

	absPath := filepath.Join(storageBaseDir, filepath.FromSlash(relativePath))

	// Verify path is within storage directory
	absPath, err := filepath.Abs(absPath)
	if err != nil {
		return fmt.Errorf("invalid file path: %w", err)
	}

	absBase, err := filepath.Abs(storageBaseDir)
	if err != nil {
		return fmt.Errorf("invalid storage base: %w", err)
	}

	if !strings.HasPrefix(absPath, absBase) {
		return fmt.Errorf("path traversal detected")
	}

	err = os.Remove(absPath)
	if err != nil && !os.IsNotExist(err) {
		return fmt.Errorf("failed to delete file: %w", err)
	}

	return nil
}

// GetAbsolutePath returns the absolute filesystem path for a relative storage path.
func GetAbsolutePath(relativePath string) string {
	return filepath.Join(storageBaseDir, filepath.FromSlash(relativePath))
}

// sanitizePath removes dangerous characters from path segments.
func sanitizePath(s string) string {
	s = strings.ReplaceAll(s, "..", "")
	s = strings.ReplaceAll(s, "/", "")
	s = strings.ReplaceAll(s, "\\", "")
	s = strings.ReplaceAll(s, ":", "")
	s = strings.ReplaceAll(s, "*", "")
	s = strings.ReplaceAll(s, "?", "")
	s = strings.ReplaceAll(s, "\"", "")
	s = strings.ReplaceAll(s, "<", "")
	s = strings.ReplaceAll(s, ">", "")
	s = strings.ReplaceAll(s, "|", "")
	return strings.TrimSpace(s)
}
