package controllers

import (
	"database/sql"
	"net/http"
	"strings"

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

	// Insert post dulu (tanpa media_url)
	query := `
		INSERT INTO posts 
		(user_id, role, title, content, media_url, author_name, author_username, likes_count, comments_count, created_at)
		VALUES ($1, 'ukm', $2, $3, '', $4, $5, 0, 0, NOW())
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
	firstMediaURL, uploadErr := uploadMultipleMedia(c, int(postID), uid, "ukm")
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

// GetUKMProfile - Get profile for UKM
func GetUKMProfile(c *gin.Context) {
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
	if role != "ukm" {
		utils.ErrorResponse(c, http.StatusForbidden, "Endpoint ini hanya untuk role ukm")
		return
	}

	var ukm struct {
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
		SELECT uk.id, uk.user_id, uk.name, uk.username, uk.bio, uk.website, uk.phone,
		       uk.profile_picture, uk.followers_count, uk.following_count, u.email
		FROM ukm uk
		JOIN users u ON u.id = uk.user_id
		WHERE uk.user_id = $1 AND uk.deleted_at IS NULL
		LIMIT 1
	`, userID).Scan(
		&ukm.ID,
		&ukm.UserID,
		&ukm.Name,
		&ukm.Username,
		&ukm.Bio,
		&ukm.Website,
		&ukm.Phone,
		&ukm.ProfilePicture,
		&ukm.FollowersCount,
		&ukm.FollowingCount,
		&ukm.Email,
	)

	if err != nil {
		if err == sql.ErrNoRows {
			var email string
			var fallbackName sql.NullString
			userErr := config.DB.QueryRow(`
				SELECT email, NULLIF(TRIM(SPLIT_PART(email, '@', 1)), '')
				FROM users
				WHERE id = $1
			`, userID).Scan(&email, &fallbackName)
			if userErr != nil {
				utils.ErrorResponse(c, http.StatusNotFound, "Data ukm tidak ditemukan di tabel ukm")
				return
			}

			name := "UKM"
			if fallbackName.Valid && fallbackName.String != "" {
				name = "UKM " + fallbackName.String
			}
			username := strings.ToLower(strings.ReplaceAll(strings.TrimSpace(name), " ", "_"))

			utils.SuccessResponse(c, gin.H{
				"id":              0,
				"user_id":         userID,
				"name":            name,
				"username":        username,
				"bio":             "",
				"website":         "",
				"phone":           "",
				"profile_picture": "",
				"followers_count": 0,
				"following_count": 0,
				"email":           email,
				"role":            "ukm",
			}, "UKM profile retrieved")
			return
		}
		utils.ErrorResponse(c, http.StatusInternalServerError, "Gagal mengambil profile ukm: "+err.Error())
		return
	}

	utils.SuccessResponse(c, gin.H{
		"id":              ukm.ID,
		"user_id":         ukm.UserID,
		"name":            ukm.Name,
		"username":        ukm.Username.String,
		"bio":             ukm.Bio.String,
		"website":         ukm.Website.String,
		"phone":           ukm.Phone.String,
		"profile_picture": ukm.ProfilePicture.String,
		"followers_count": ukm.FollowersCount.Int64,
		"following_count": ukm.FollowingCount.Int64,
		"email":           ukm.Email,
		"role":            "ukm",
	}, "UKM profile retrieved")
}

func GetUKMStats(c *gin.Context) {
	userID, exists := c.Get("user_id")
	if !exists {
		utils.ErrorResponse(c, http.StatusUnauthorized, "Unauthorized")
		return
	}

	var postsCount, followersCount, membersCount, eventsCount int

	// Get stats
	config.DB.QueryRow("SELECT COUNT(*) FROM posts WHERE user_id = $1", userID).Scan(&postsCount)

	// Default values for now, can be expanded if tables exist
	followersCount = 0
	membersCount = 0
	eventsCount = 0

	utils.SuccessResponse(c, gin.H{
		"posts_count":     postsCount,
		"followers_count": followersCount,
		"members_count":   membersCount,
		"events_count":    eventsCount,
	}, "UKM statistics retrieved")
}
