// controllers/ormawaController.go
package controllers

import (
	"log"
	"net/http"
	"strings"

	"nf-student-hub-backend/config"
	"nf-student-hub-backend/utils"

	"github.com/gin-gonic/gin"
)

func CreateOrmawaPost(c *gin.Context) {
	userID, exists := c.Get("user_id")
	if !exists {
		utils.ErrorResponse(c, http.StatusUnauthorized, "Login dulu!")
		return
	}

	// Ambil name dan username dari tabel ormawa
	var authorName, authorUsername string
	err := config.DB.QueryRow("SELECT name, username FROM ormawa WHERE user_id = $1", userID).Scan(&authorName, &authorUsername)
	if err != nil || authorName == "" || authorUsername == "" {
		var email string
		config.DB.QueryRow("SELECT email FROM users WHERE id = $1", userID).Scan(&email)
		parts := strings.Split(email, "@")
		authorName = "Ormawa " + strings.Title(parts[0])
		authorUsername = strings.ToLower(parts[0])
	}

	title := c.PostForm("title")
	content := c.PostForm("content")
	if title == "" || content == "" {
		utils.ErrorResponse(c, http.StatusBadRequest, "Judul dan konten wajib diisi!")
		return
	}

	// Upload media ke database (BYTEA) — BUKAN filesystem
	var mediaURL string
	if _, err := c.FormFile("media"); err == nil {
		uid, _ := userID.(int)
		_, fileURL, uploadErr := UploadFileToDB(c, "media", uid, "ormawa", "post", nil, nil)
		if uploadErr != nil {
			utils.ErrorResponse(c, http.StatusBadRequest, uploadErr.Error())
			return
		}
		mediaURL = fileURL
		log.Printf("[Ormawa Post] Media uploaded to DB: %s", fileURL)
	}

	query := `
		INSERT INTO posts 
		(user_id, role, title, content, media_url, author_name, author_username, likes_count, comments_count, created_at)
		VALUES ($1, 'ormawa', $2, $3, $4, $5, $6, 0, 0, NOW())
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
	}, "Postingan ormawa berhasil dibuat!")
}

func GetOrmawaPosts(c *gin.Context) {
	query := `
		SELECT p.id, p.title, p.content, p.media_url, p.author_name, p.author_username,
			   p.likes_count, p.comments_count, p.created_at
		FROM posts p
		WHERE p.role = 'ormawa'
		ORDER BY p.created_at DESC
	`

	rows, err := config.DB.Query(query)
	if err != nil {
		utils.ErrorResponse(c, http.StatusInternalServerError, "Gagal mengambil postingan ormawa")
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
			"content":          content,
			"media_url":       mediaURL,
			"author_name":     authorName,
			"author_username": authorUsername,
			"role":            "ormawa",
			"likes_count":     likesCount,
			"comments_count":  commentsCount,
			"created_at":      createdAt,
		})
	}

	utils.SuccessResponse(c, posts, "Berhasil mengambil postingan ormawa")
}

// GetOrmawaProfile - Get profile for Ormawa
func GetOrmawaProfile(c *gin.Context) {
	userID, exists := c.Get("user_id")
	if !exists {
		utils.ErrorResponse(c, http.StatusUnauthorized, "Unauthorized")
		return
	}

	var ormawa struct {
		ID       int    `json:"id"`
		Name     string `json:"name"`
		Username string `json:"username"`
		Bio      string `json:"bio"`
		Email    string `json:"email"`
		Avatar   string `json:"avatar"`
	}

	err := config.DB.QueryRow(`
		SELECT COALESCE(o_profile.id, 0), COALESCE(o_profile.name, 'Ormawa'), 
		       COALESCE(o_profile.username, ''), COALESCE(o_profile.bio, ''), 
		       u.email, COALESCE(o_profile.avatar, '')
		FROM users u
		LEFT JOIN ormawa o_profile ON u.id = o_profile.user_id
		WHERE u.id = $1
	`, userID).Scan(&ormawa.ID, &ormawa.Name, &ormawa.Username, &ormawa.Bio, &ormawa.Email, &ormawa.Avatar)

	if err != nil {
		utils.ErrorResponse(c, http.StatusNotFound, "User not found")
		return
	}

	utils.SuccessResponse(c, ormawa, "Ormawa profile retrieved")
}

// GetOrmawaStats - Dashboard statistics for ormawa
func GetOrmawaStats(c *gin.Context) {
	userID, exists := c.Get("user_id")
	if !exists {
		utils.ErrorResponse(c, http.StatusUnauthorized, "Unauthorized")
		return
	}

	var postsCount, followersCount, membersCount, eventsCount int

	// Get stats from posts
	config.DB.QueryRow("SELECT COUNT(*) FROM posts WHERE user_id = $1", userID).Scan(&postsCount)
	
	// Default values
	followersCount = 0
	membersCount = 0
	eventsCount = 0

	utils.SuccessResponse(c, gin.H{
		"posts_count":     postsCount,
		"followers_count": followersCount,
		"members_count":   membersCount,
		"events_count":    eventsCount,
	}, "Ormawa statistics retrieved")
}