package middlewares

import (
	"log"
	"net/http"
	"strings"

	"nf-student-hub-backend/config"

	"github.com/gin-gonic/gin"
)

// =============================================
// SUPER DOSEN - Konfigurasi Terpusat
// =============================================

// SuperDosenEmail — satu-satunya tempat email super dosen didefinisikan.
const SuperDosenEmail = "superdosen@nurulfikri.ac.id"

// IsSuperDosen - Helper terpusat: cek apakah user_id milik super dosen.
// Dipanggil dari controller manapun tanpa duplikasi logika.
func IsSuperDosen(userID interface{}) bool {
	var email string
	err := config.DB.QueryRow("SELECT email FROM users WHERE id = $1", userID).Scan(&email)
	if err != nil {
		log.Printf("[SuperDosen] lookup failed for userID %v: %v", userID, err)
		return false
	}

	email = strings.ToLower(strings.TrimSpace(email))
	return email == SuperDosenEmail
}

// SuperDosenMiddleware - Gin middleware yang memblokir akses jika bukan super dosen.
// Gunakan di route group yang khusus super dosen.
func SuperDosenMiddleware() gin.HandlerFunc {
	return func(c *gin.Context) {
		userID, exists := c.Get("user_id")
		if !exists {
			c.JSON(http.StatusUnauthorized, gin.H{
				"success": false,
				"message": "Unauthorized",
			})
			c.Abort()
			return
		}

		if !IsSuperDosen(userID) {
			c.JSON(http.StatusForbidden, gin.H{
				"success": false,
				"message": "Akses ditolak. Hanya Super Dosen yang dapat mengakses fitur ini.",
			})
			c.Abort()
			return
		}

		c.Next()
	}
}
