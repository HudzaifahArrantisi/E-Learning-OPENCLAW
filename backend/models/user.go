package models

import (
	"database/sql"
	"time"
)

type User struct {
	ID       int    `json:"id"`
	Email    string `json:"email"`
	Password string `json:"password"`
	Role     string `json:"role"`
	// Additional profile fields used by chat features
	Name     string `json:"name,omitempty" gorm:"-"`
	Username string `json:"username,omitempty" gorm:"-"`
	Phone    string `json:"phone,omitempty" gorm:"-"`
	Photo    string `json:"photo,omitempty" gorm:"-"`

	CreatedAt time.Time    `json:"created_at"`
	UpdatedAt time.Time    `json:"updated_at"`
	DeletedAt sql.NullTime `json:"deleted_at,omitempty"`

	// Relations for extended user info
	Mahasiswa *Mahasiswa `json:"mahasiswa,omitempty" gorm:"foreignKey:UserID"`
	Dosen     *Dosen     `json:"dosen,omitempty" gorm:"foreignKey:UserID"`
	Ukm       *UKM       `json:"ukm,omitempty" gorm:"foreignKey:UserID"`
	Ormawa    *Ormawa    `json:"ormawa,omitempty" gorm:"foreignKey:UserID"`
}

type UserProfile struct {
	ID        int          `json:"id"`
	Email     string       `json:"email"`
	Role      string       `json:"role"`
	Name      string       `json:"name"`
	NIM       string       `json:"nim,omitempty"`
	Alamat    string       `json:"alamat,omitempty"`
	Photo     string       `json:"photo,omitempty"`
	CreatedAt time.Time    `json:"created_at"`
	UpdatedAt time.Time    `json:"updated_at"`
	DeletedAt sql.NullTime `json:"deleted_at,omitempty"`
}
