// controllers/debug_controller.go
package controllers

import (
    "net/http"
    "log"
    "nf-student-hub-backend/config"
    "nf-student-hub-backend/utils"

    "github.com/gin-gonic/gin"
)

func DebugProfiles(c *gin.Context) {
    userID, exists := c.Get("user_id")
    if !exists {
        utils.ErrorResponse(c, http.StatusUnauthorized, "Unauthorized")
        return
    }

    role, exists := c.Get("role")
    if !exists {
        utils.ErrorResponse(c, http.StatusBadRequest, "Role tidak valid")
        return
    }

    log.Printf("=== DEBUG PROFILE ===")
    log.Printf("UserID: %v, Role: %v", userID, role)

    // Cek data di semua tabel
    tables := []string{"admin", "ukm", "ormawa"}
    
    for _, table := range tables {
        query := `
            SELECT COUNT(*) as count 
            FROM ` + table + ` 
            WHERE user_id = ? AND deleted_at IS NULL
        `
        var count int
        err := config.DB.QueryRow(query, userID).Scan(&count)
        if err != nil {
            log.Printf("Error checking table %s: %v", table, err)
        } else {
            log.Printf("Table %s: %d records found for user_id %v", table, count, userID)
        }

        if count > 0 {
            detailQuery := `
                SELECT id, user_id, name, username 
                FROM ` + table + ` 
                WHERE user_id = ? AND deleted_at IS NULL
            `
            var id, userID int
            var name, username string
            err := config.DB.QueryRow(detailQuery, userID).Scan(&id, &userID, &name, &username)
            if err == nil {
                log.Printf("  Detail - ID: %d, Name: '%s', Username: '%s'", id, name, username)
            }
        }
    }

    utils.SuccessResponse(c, gin.H{
        "user_id": userID,
        "role":    role,
    }, "Debug information")
}