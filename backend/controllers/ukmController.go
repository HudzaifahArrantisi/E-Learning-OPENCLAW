package controllers

import (
	"fmt"
	"net/http"
	"os"
	"path/filepath"
	"strings"
	"time"

	"nf-student-hub-backend/config"
	"nf-student-hub-backend/utils"

	"github.com/gin-gonic/gin"
)

func CreateUKMPost(c *gin.Context) {
	userID, exists := c.Get("user_id")
	if !exists {
		utils.ErrorResponse(c, http.StatusUnauthorized, "Login dulu!")
		return
	}

	// Ambil name dan username dari tabel ukm
	var authorName, authorUsername string
	err := config.DB.QueryRow("SELECT name, username FROM ukm WHERE user_id = $1", userID).Scan(&authorName, &authorUsername)
	if err != nil || authorName == "" || authorUsername == "" {
		var email string
		config.DB.QueryRow("SELECT email FROM users WHERE id = $1", userID).Scan(&email)
		parts := strings.Split(email, "@")
		if len(parts) > 0 {
			authorName = "UKM " + parts[0]
			authorUsername = strings.ToLower(parts[0])
		} else {
			authorName = "UKM User"
			authorUsername = "ukm_user"
		}
	}

	title := c.PostForm("title")
	content := c.PostForm("content")
	if title == "" || content == "" {
		utils.ErrorResponse(c, http.StatusBadRequest, "Judul dan konten wajib diisi!")
		return
	}

	var mediaURL string
	if file, err := c.FormFile("media"); err == nil {
		// 🔒 Validasi file upload
		ext, valErr := utils.ValidateUpload(file, utils.DefaultImageConfig)
		if valErr != nil {
			utils.ErrorResponse(c, http.StatusBadRequest, valErr.Error())
			return
		}

		filename := fmt.Sprintf("ukm_%v_%d%s", userID, time.Now().UnixNano(), ext)
		savePath := filepath.Join("uploads/posts", filename)
		
		// Ensure directory exists
		if errDir := os.MkdirAll("uploads/posts", 0755); errDir != nil {
			fmt.Println("Warning: failed to create directory:", errDir)
		}
		
		if errSave := c.SaveUploadedFile(file, savePath); errSave != nil {
			// If saving fails (e.g., ReadOnly filesystem in Serverless), try /tmp fallback
			tmpPath := filepath.Join("/tmp", filename)
			if errTmp := c.SaveUploadedFile(file, tmpPath); errTmp == nil {
				savePath = tmpPath
			} else {
				utils.ErrorResponse(c, http.StatusInternalServerError, "Gagal menyimpan foto")
				return
			}
		}
		// Selalu simpan URL yang benar untuk frontend / image optimizer
		mediaURL = "/uploads/posts/" + filename
	}

	query := `
		INSERT INTO posts 
		(user_id, role, title, content, media_url, author_name, author_username, likes_count, comments_count, created_at)
		VALUES ($1, 'ukm', $2, $3, $4, $5, $6, 0, 0, NOW())
		RETURNING id
	`
	var postID int64
	err = config.DB.QueryRow(query, userID, title, content, mediaURL, authorName, authorUsername).Scan(&postID)
	if err != nil {
		utils.ErrorResponse(c, http.StatusInternalServerError, "Gagal simpan ke database: "+err.Error())
		return
	}

	utils.SuccessResponse(c, gin.H{
		"id":              postID,
		"title":           title,
		"content":         content,
		"media_url":       mediaURL,
		"author_name":     authorName,
		"author_username": authorUsername,
	}, "Postingan UKM berhasil dibuat!")
}

func GetUKMPosts(c *gin.Context) {
	query := `
		SELECT p.id, p.title, p.content, p.media_url, p.author_name, p.author_username,
			   p.likes_count, p.comments_count, p.created_at
		FROM posts p
		WHERE p.role = 'ukm'
		ORDER BY p.created_at DESC
	`

	rows, err := config.DB.Query(query)
	if err != nil {
		utils.ErrorResponse(c, http.StatusInternalServerError, "Gagal mengambil data")
		return
	}
	defer rows.Close()

	var posts []gin.H
	for rows.Next() {
		var id int
		var title, content, mediaURL, authorName, authorUsername string
		var likesCount, commentsCount int
		var createdAt interface{}

		rows.Scan(&id, &title, &content, &mediaURL, &authorName, &authorUsername, &likesCount, &commentsCount, &createdAt)

		posts = append(posts, gin.H{
			"id":              id,
			"title":           title,
			"content":         content,
			"media_url":       mediaURL,
			"author_name":     authorName,
			"author_username": authorUsername,
			"role":            "ukm",
			"likes_count":     likesCount,
			"comments_count":  commentsCount,
			"created_at":      createdAt,
		})
	}

	utils.SuccessResponse(c, posts, "Berhasil mengambil postingan UKM")
}

func GetUKMStats(c *gin.Context) {
	query := `
		SELECT COUNT(*) FROM posts WHERE role = 'ukm'
	`

	var postsCount int
	err := config.DB.QueryRow(query).Scan(&postsCount)
	if err != nil {
		utils.ErrorResponse(c, http.StatusInternalServerError, "Gagal mengambil data statistik")
		return
	}
}