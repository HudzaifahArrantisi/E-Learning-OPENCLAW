// controllers/ormawaController.go
package controllers

import (
	"database/sql"
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

	// Insert post dulu (tanpa media_url)
	query := `
		INSERT INTO posts 
		(user_id, role, title, content, media_url, author_name, author_username, likes_count, comments_count, created_at)
		VALUES ($1, 'ormawa', $2, $3, '', $4, $5, 0, 0, NOW())
		RETURNING id
	`
	var postID int64
	err = config.DB.QueryRow(query, userID, title, content, authorName, authorUsername).Scan(&postID)
	if err != nil {
		utils.ErrorResponse(c, http.StatusInternalServerError, "Gagal simpan ke database: "+err.Error())
		return
	}

	// Upload multiple media (carousel) dan insert ke post_media
	uid, _ := userID.(int)
	firstMediaURL, uploadErr := uploadMultipleMedia(c, int(postID), uid, "ormawa")
	if uploadErr != nil {
		utils.ErrorResponse(c, http.StatusBadRequest, uploadErr.Error())
		return
	}

	// Update posts.media_url dengan URL media pertama (backward compat)
	if firstMediaURL != "" {
		config.DB.Exec("UPDATE posts SET media_url = $1 WHERE id = $2", firstMediaURL, postID)
	}

	utils.SuccessResponse(c, gin.H{
		"id":              postID,
		"title":           title,
		"content":         content,
		"media_url":       firstMediaURL,
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
			"content":         content,
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

	var role string
	if err := config.DB.QueryRow("SELECT role FROM users WHERE id = $1", userID).Scan(&role); err != nil {
		utils.ErrorResponse(c, http.StatusInternalServerError, "Gagal membaca role user")
		return
	}
	if role != "ormawa" {
		utils.ErrorResponse(c, http.StatusForbidden, "Endpoint ini hanya untuk role ormawa")
		return
	}

	var ormawa struct {
		ID             int            `json:"id"`
		UserID         int            `json:"user_id"`
		Name           string         `json:"name"`
		Username       sql.NullString `json:"username"`
		Bio            sql.NullString `json:"bio"`
		Website        sql.NullString `json:"website"`
		Phone          sql.NullString `json:"phone"`
		ProfilePicture sql.NullString `json:"profile_picture"`
		FollowersCount sql.NullInt64  `json:"followers_count"`
		FollowingCount sql.NullInt64  `json:"following_count"`
		Email          string         `json:"email"`
	}

	err := config.DB.QueryRow(`
		SELECT o.id, o.user_id, o.name, o.username, o.bio, o.website, o.phone,
		       o.profile_picture, o.followers_count, o.following_count, u.email
		FROM ormawa o
		JOIN users u ON u.id = o.user_id
		WHERE o.user_id = $1 AND o.deleted_at IS NULL
		LIMIT 1
	`, userID).Scan(
		&ormawa.ID,
		&ormawa.UserID,
		&ormawa.Name,
		&ormawa.Username,
		&ormawa.Bio,
		&ormawa.Website,
		&ormawa.Phone,
		&ormawa.ProfilePicture,
		&ormawa.FollowersCount,
		&ormawa.FollowingCount,
		&ormawa.Email,
	)

	if err != nil {
		if err == sql.ErrNoRows {
			utils.ErrorResponse(c, http.StatusNotFound, "Data ormawa tidak ditemukan di tabel ormawa")
			return
		}
		utils.ErrorResponse(c, http.StatusInternalServerError, "Gagal mengambil profile ormawa: "+err.Error())
		return
	}

	utils.SuccessResponse(c, gin.H{
		"id":              ormawa.ID,
		"user_id":         ormawa.UserID,
		"name":            ormawa.Name,
		"username":        ormawa.Username.String,
		"bio":             ormawa.Bio.String,
		"website":         ormawa.Website.String,
		"phone":           ormawa.Phone.String,
		"profile_picture": ormawa.ProfilePicture.String,
		"followers_count": ormawa.FollowersCount.Int64,
		"following_count": ormawa.FollowingCount.Int64,
		"email":           ormawa.Email,
		"role":            "ormawa",
	}, "Ormawa profile retrieved")
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
