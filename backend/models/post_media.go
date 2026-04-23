package models

import (
	"database/sql"
	"time"
)

// PostMedia represents a single media item in a carousel post
type PostMedia struct {
	ID        int          `json:"id"`
	PostID    int          `json:"post_id"`
	UploadID  *int64       `json:"upload_id,omitempty"`
	MediaType string       `json:"media_type"`
	MediaURL  string       `json:"media_url"`
	SortOrder int          `json:"sort_order"`
	CreatedAt time.Time    `json:"created_at"`
	DeletedAt sql.NullTime `json:"deleted_at,omitempty"`
}
