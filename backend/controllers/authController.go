package controllers

import (
	"database/sql"
	"net/http"
	"strings"

	"nf-student-hub-backend/config"
	"nf-student-hub-backend/utils"

	"github.com/gin-gonic/gin"
	"golang.org/x/crypto/bcrypt"
)

// ============== VERIFIKASI TOKEN (WAJIB ADA!) ==============
func Verify(c *gin.Context) {
	userID, exists := c.Get("user_id")
	if !exists {
		c.JSON(http.StatusUnauthorized, gin.H{"success": false, "message": "Unauthorized"})
		return
	}

	role, _ := c.Get("role")

	var email string
	var name sql.NullString
	var nim sql.NullString

	err := config.DB.QueryRow(`
		SELECT u.email, COALESCE(m.name, ''), COALESCE(m.nim, '')
		FROM users u
		LEFT JOIN mahasiswa m ON u.id = m.user_id
		WHERE u.id = $1
	`, userID).Scan(&email, &name, &nim)

	if err != nil {
		c.JSON(http.StatusOK, gin.H{
			"success": true,
			"data": gin.H{
				"user": gin.H{
					"id":    userID,
					"email": "",
					"role":  role,
					"name":  "",
					"nim":   "",
				},
			},
		})
		return
	}

	// Get name from appropriate table based on role
	var nameFromTable sql.NullString
	switch role.(string) {
	case "mahasiswa":
		config.DB.QueryRow("SELECT name FROM mahasiswa WHERE user_id = $1", userID).Scan(&nameFromTable)
	case "dosen":
		config.DB.QueryRow("SELECT name FROM dosen WHERE user_id = $1", userID).Scan(&nameFromTable)
	case "admin":
		name = sql.NullString{String: email, Valid: true}
	case "ukm":
		name = sql.NullString{String: email, Valid: true}
	case "ormawa":
		name = sql.NullString{String: email, Valid: true}
	case "orangtua":
		config.DB.QueryRow("SELECT name FROM ortu WHERE user_id = $1", userID).Scan(&nameFromTable)
	}

	if nameFromTable.Valid {
		name = nameFromTable
	}

	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"data": gin.H{
			"user": gin.H{
				"id":    userID,
				"email": email,
				"role":  role.(string),
				"name":  name.String,
				"nim":   nim.String,
			},
		},
	})
}

func Login(c *gin.Context) {
	var input struct {
		Identifier string `json:"identifier" binding:"required"`
		Password   string `json:"password" binding:"required"`
	}

	if err := c.ShouldBindJSON(&input); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{
			"success": false,
			"message": "Invalid input format",
		})
		return
	}

	input.Identifier = strings.TrimSpace(input.Identifier)

	query := `
		SELECT u.id, u.email, u.password, u.role,
		       COALESCE(m.nim, '') as nim,
		       CASE
		         WHEN u.role = 'mahasiswa' THEN COALESCE(m.name, '')
		         WHEN u.role = 'dosen' THEN COALESCE(d.name, '')
		         WHEN u.role = 'admin' THEN u.email
		         WHEN u.role = 'ukm' THEN u.email
		         WHEN u.role = 'ormawa' THEN u.email
		         WHEN u.role = 'orangtua' THEN COALESCE(ot.name, '')
		         ELSE ''
		       END as name
		FROM users u
		LEFT JOIN mahasiswa m ON u.id = m.user_id
		LEFT JOIN dosen d ON u.id = d.user_id
		LEFT JOIN admin a ON u.id = a.user_id
		LEFT JOIN ukm uk ON u.id = uk.user_id
		LEFT JOIN ormawa o ON u.id = o.user_id
		LEFT JOIN ortu ot ON u.id = ot.user_id
		WHERE u.email = $1 OR m.nim = $2
	`

	var user struct {
		ID       int
		Email    string
		Password string
		Role     string
	}
	var nim sql.NullString
	var name sql.NullString

	err := config.DB.QueryRow(query, input.Identifier, input.Identifier).Scan(
		&user.ID, &user.Email, &user.Password, &user.Role, &nim, &name,
	)

	if err != nil {
		if err == sql.ErrNoRows {
			c.JSON(http.StatusUnauthorized, gin.H{
				"success": false,
				"message": "Invalid credentials",
			})
			return
		}
		c.JSON(http.StatusInternalServerError, gin.H{
			"success": false,
			"message": "Database error",
		})
		return
	}

	// Cek password
	if err := bcrypt.CompareHashAndPassword([]byte(user.Password), []byte(input.Password)); err != nil {
		c.JSON(http.StatusUnauthorized, gin.H{
			"success": false,
			"message": "Invalid credentials",
		})
		return
	}

	// Generate token
	token, err := utils.GenerateToken(user.ID, user.Role)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"success": false,
			"message": "Failed to generate token",
		})
		return
	}

	redirect := getRedirectPath(user.Role)

	// INI YANG PALING PENTING — FORMAT EXACTLY SAMA DENGAN FRONTEND!
	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"data": gin.H{
			"token":    token,
			"role":     user.Role,
			"redirect": redirect,
			"user": gin.H{
				"id":    user.ID,
				"email": user.Email,
				"role":  user.Role,
				"name":  name.String,
				"nim":   nim.String,
			},
		},
	})
}

// ============== REGISTER (SUDAH DIPERBAIKI JUGA) ==============
func Register(c *gin.Context) {
	var input struct {
		Email    string `json:"email" binding:"required,email"`
		Password string `json:"password" binding:"required,min=6"`
		Name     string `json:"name" binding:"required"`
		Role     string `json:"role" binding:"required,oneof=mahasiswa orangtua"`
		NIM      string `json:"nim,omitempty"`
	}

	if err := c.ShouldBindJSON(&input); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{
			"success": false,
			"message": err.Error(),
		})
		return
	}

	hashedPassword, _ := bcrypt.GenerateFromPassword([]byte(input.Password), bcrypt.DefaultCost)

	tx, err := config.DB.Begin()
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"success": false, "message": "Transaction error"})
		return
	}
	defer tx.Rollback()

	// PostgreSQL: use RETURNING id instead of LastInsertId
	var userID int
	err = tx.QueryRow("INSERT INTO users (email, password, role) VALUES ($1, $2, $3) RETURNING id",
		input.Email, hashedPassword, input.Role).Scan(&userID)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"success": false, "message": "Failed to create user"})
		return
	}

	var redirect string
	switch input.Role {
	case "mahasiswa":
		_, err = tx.Exec("INSERT INTO mahasiswa (user_id, name, nim) VALUES ($1, $2, $3)",
			userID, input.Name, input.NIM)
		redirect = "/mahasiswa"
	case "orangtua":
		_, err = tx.Exec("INSERT INTO ortu (user_id, name) VALUES ($1, $2)",
			userID, input.Name)
		redirect = "/ortu"
	}

	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"success": false, "message": "Failed to create profile"})
		return
	}

	if err := tx.Commit(); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"success": false, "message": "Commit failed"})
		return
	}

	token, _ := utils.GenerateToken(userID, input.Role)

	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"data": gin.H{
			"token":    token,
			"role":     input.Role,
			"redirect": redirect,
			"user": gin.H{
				"id":    userID,
				"email": input.Email,
				"role":  input.Role,
				"name":  input.Name,
				"nim":   input.NIM,
			},
		},
	})
}


// ============== HELPER REDIRECT PATH ==============
func getRedirectPath(role string) string {
	switch strings.ToLower(role) {
	case "admin":
		return "/admin"
	case "dosen":
		return "/dosen"
	case "mahasiswa":
		return "/mahasiswa"
	case "orangtua":
		return "/ortu"
	case "ukm":
		return "/ukm"
	case "ormawa":
		return "/ormawa"
	default:
		return "/"
	}
}
