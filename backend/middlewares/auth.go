// middlewares/auth.go
package middlewares

import (
    "net/http"
    "nf-student-hub-backend/config"
    "nf-student-hub-backend/utils"
    "github.com/gin-gonic/gin"
)

// AdminKemahasiswaanMiddleware - Middleware khusus untuk Admin Kemahasiswaan
func AdminKemahasiswaanMiddleware() gin.HandlerFunc {
    return func(c *gin.Context) {
        userID, exists := c.Get("user_id")
        if !exists {
            utils.ErrorResponse(c, http.StatusUnauthorized, "Unauthorized")
            c.Abort()
            return
        }

        // Cek apakah user adalah admin
        var role string
        var email string
        err := config.DB.QueryRow("SELECT role, email FROM users WHERE id = $1", userID).Scan(&role, &email)
        if err != nil || role != "admin" {
            utils.ErrorResponse(c, http.StatusForbidden, "Access denied")
            c.Abort()
            return
        }

        // Hanya admin dengan email kemahasiswaan@nurulfikri.ac.id yang boleh akses
        if email != "kemahasiswaan@nurulfikri.ac.id" {
            utils.ErrorResponse(c, http.StatusForbidden, "Hanya Admin Kemahasiswaan yang dapat mengakses")
            c.Abort()
            return
        }

        // Ambil nama admin dari tabel admin
        var adminName string
        config.DB.QueryRow("SELECT name FROM admin WHERE user_id = $1", userID).Scan(&adminName)
        
        // Set admin name ke context
        c.Set("admin_name", adminName)
        c.Set("admin_email", email)
        
        c.Next()
    }
}

// GetAdminProfileMiddleware - Middleware untuk mendapatkan profile admin
func GetAdminProfileMiddleware() gin.HandlerFunc {
    return func(c *gin.Context) {
        userID, exists := c.Get("user_id")
        if !exists {
            c.Next()
            return
        }

        var role string
        err := config.DB.QueryRow("SELECT role FROM users WHERE id = $1", userID).Scan(&role)
        if err != nil || role != "admin" {
            c.Next()
            return
        }

        var adminName, username string
        err = config.DB.QueryRow("SELECT name, username FROM admin WHERE user_id = $1", userID).Scan(&adminName, &username)
        if err == nil {
            c.Set("admin_name", adminName)
            c.Set("admin_username", username)
        }

        c.Next()
    }
}