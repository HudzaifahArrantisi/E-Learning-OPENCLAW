package models

import (
	"database/sql"
	"time"
)

type UKM struct {
	ID        int          `json:"id"`
	UserID    int          `json:"user_id"`
	Name           string       `json:"name"`
	Username       string       `json:"username"`
	Phone          string       `json:"phone"`
	ProfilePicture string       `json:"profile_picture"`
	CreatedAt      time.Time    `json:"created_at"`
	UpdatedAt      time.Time    `json:"updated_at"`
	DeletedAt      sql.NullTime `json:"deleted_at,omitempty"`
}

func (UKM) TableName() string { return "ukm" }