package models

import (
	"database/sql"
	"time"
)

type Mahasiswa struct {
	ID        int          `json:"id"`
	UserID    int          `json:"user_id"`
	Name      string       `json:"name"`
	NIM       string       `json:"nim"`
	Alamat    string       `json:"alamat"`
	Photo     string       `json:"photo"`
	CreatedAt time.Time    `json:"created_at"`
	UpdatedAt time.Time    `json:"updated_at"`
	DeletedAt sql.NullTime `json:"deleted_at,omitempty"`
}

func (Mahasiswa) TableName() string { return "mahasiswa" }

type Attendance struct {
	ID           int          `json:"id"`
	StudentID    int          `json:"student_id"`
	SessionID    string       `json:"session_id"`
	StudentCode  string       `json:"student_code"`
	Status       string       `json:"status"`
	CreatedAt    time.Time    `json:"created_at"`
	UpdatedAt    time.Time    `json:"updated_at"`
	DeletedAt    sql.NullTime `json:"deleted_at,omitempty"`
}

type UKTInvoice struct {
	ID        int          `json:"id"`
	StudentID int          `json:"student_id"`
	Amount    float64      `json:"amount"`
	UUID      string       `json:"uuid"`
	Status    string       `json:"status"`
	CreatedAt time.Time    `json:"created_at"`
	UpdatedAt time.Time    `json:"updated_at"`
	DeletedAt sql.NullTime `json:"deleted_at,omitempty"`
}