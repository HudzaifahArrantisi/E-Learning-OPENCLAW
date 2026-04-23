// controllers/feedController.go
package controllers

import (
	"database/sql"
	"fmt"
	"log"
	"net/http"
	"strings"
	"time"

	"nf-student-hub-backend/config"
	"nf-student-hub-backend/utils"

	"github.com/gin-gonic/gin"
)

// cleanUsername cleans username by removing known prefixes and trimming spaces
func cleanUsername(username string) string {
	if username == "" {
		return username
	}

	cleaned := strings.ToLower(strings.TrimSpace(username))
	cleaned = strings.TrimPrefix(cleaned, "ormawa_")
	cleaned = strings.TrimPrefix(cleaned, "ukm_")
	cleaned = strings.TrimPrefix(cleaned, "admin_")

	return cleaned
}

// getPostMediaItems fetches carousel media items for a batch of post IDs
func getPostMediaItems(postIDs []int) map[int][]map[string]interface{} {
	result := make(map[int][]map[string]interface{})
	if len(postIDs) == 0 {
		return result
	}

	// Build placeholder list: $1,$2,$3...
	placeholders := make([]string, len(postIDs))
	args := make([]interface{}, len(postIDs))
	for i, id := range postIDs {
		placeholders[i] = fmt.Sprintf("$%d", i+1)
		args[i] = id
	}

	query := fmt.Sprintf(`
		SELECT id, post_id, media_type, media_url, sort_order
		FROM post_media
		WHERE post_id IN (%s) AND deleted_at IS NULL
		ORDER BY post_id, sort_order ASC
	`, strings.Join(placeholders, ","))

	rows, err := config.DB.Query(query, args...)
	if err != nil {
		log.Printf("[Feed] Error fetching post_media: %v", err)
		return result
	}
	defer rows.Close()

	for rows.Next() {
		var id, postID, sortOrder int
		var mediaType, mediaURL string
		err := rows.Scan(&id, &postID, &mediaType, &mediaURL, &sortOrder)
		if err != nil {
			continue
		}
		result[postID] = append(result[postID], map[string]interface{}{
			"id":         id,
			"media_type": mediaType,
			"media_url":  mediaURL,
			"sort_order": sortOrder,
		})
	}

	return result
}

// insertPostMedia inserts a single media item into post_media table
func insertPostMedia(postID int, uploadID int64, mediaType string, mediaURL string, sortOrder int) error {
	_, err := config.DB.Exec(`
		INSERT INTO post_media (post_id, upload_id, media_type, media_url, sort_order, created_at)
		VALUES ($1, $2, $3, $4, $5, NOW())
	`, postID, uploadID, mediaType, mediaURL, sortOrder)
	return err
}

// uploadMultipleMedia uploads multiple files from multipart form and inserts into post_media
// Returns the first media URL (for backward compat with posts.media_url)
func uploadMultipleMedia(c *gin.Context, postID int, userID int, role string) (string, error) {
	form, err := c.MultipartForm()
	if err != nil {
		return "", nil // No multipart form = no media, that's OK
	}

	files := form.File["media"]
	if len(files) == 0 {
		return "", nil
	}

	if len(files) > 10 {
		return "", fmt.Errorf("maksimal 10 file per postingan")
	}

	var firstMediaURL string

	// Iterate through "media" files using form file headers
	for i, fh := range files {
		file, err := fh.Open()
		if err != nil {
			log.Printf("[Carousel] Skip file %d: %v", i, err)
			continue
		}

		fileBytes, err := readFileBytes(file)
		file.Close()
		if err != nil {
			log.Printf("[Carousel] Skip file %d read error: %v", i, err)
			continue
		}

		uploadID, fileURL, err := uploadBytesToDB(fh, fileBytes, userID, role, "post")
		if err != nil {
			log.Printf("[Carousel] Skip file %d upload error: %v", i, err)
			continue
		}

		// Insert into post_media
		insertErr := insertPostMedia(postID, uploadID, "image", fileURL, i)
		if insertErr != nil {
			log.Printf("[Carousel] Error inserting post_media: %v", insertErr)
			continue
		}

		if i == 0 {
			firstMediaURL = fileURL
		}

		log.Printf("[Carousel] ✅ File %d/%d uploaded: %s", i+1, len(files), fileURL)
	}

	return firstMediaURL, nil
}

func GetFeed(c *gin.Context) {
	userID, _ := c.Get("user_id")

	query := `
        SELECT 
            p.id, p.title, p.content, p.media_url, p.created_at,
            p.author_name, 
            COALESCE(NULLIF(p.author_username, ''), 
                LOWER(REPLACE(REPLACE(REPLACE(p.author_username, ' ', '_'), 'Ormawa_', ''), 'UKM_', ''))
            ) as author_username,
            p.role,
            COALESCE(p.likes_count, 0) AS likes_count,
            COALESCE(p.comments_count, 0) AS comments_count,
            EXISTS(SELECT 1 FROM likes l WHERE l.post_id = p.id AND l.user_id = $1 AND l.deleted_at IS NULL) as user_has_liked,
            EXISTS(SELECT 1 FROM saved_posts sp WHERE sp.post_id = p.id AND sp.user_id = $2 AND sp.deleted_at IS NULL) as user_has_saved,
            CASE p.role
                WHEN 'admin' THEN (SELECT profile_picture FROM admin WHERE user_id = p.user_id)
                WHEN 'ukm' THEN (SELECT profile_picture FROM ukm WHERE user_id = p.user_id)
                WHEN 'ormawa' THEN (SELECT profile_picture FROM ormawa WHERE user_id = p.user_id)
                WHEN 'mahasiswa' THEN (SELECT photo FROM mahasiswa WHERE user_id = p.user_id)
                ELSE NULL
            END as author_avatar
        FROM posts p
        WHERE p.role IN ('admin', 'ukm', 'ormawa', 'dosen', 'mahasiswa', 'orangtua') AND p.deleted_at IS NULL
        ORDER BY p.created_at DESC
        LIMIT 50
    `

	rows, err := config.DB.Query(query, userID, userID)
	if err != nil {
		utils.ErrorResponse(c, http.StatusInternalServerError, "Gagal mengambil feed: "+err.Error())
		return
	}
	defer rows.Close()

	var posts []map[string]interface{}
	var postIDs []int
	for rows.Next() {
		var id int
		var title, content, mediaURL, authorName, authorUsername, role string
		var createdAt time.Time
		var likesCount, commentsCount int
		var userHasLiked, userHasSaved bool
		var authorAvatar sql.NullString

		err = rows.Scan(&id, &title, &content, &mediaURL, &createdAt, &authorName, &authorUsername, &role, &likesCount, &commentsCount, &userHasLiked, &userHasSaved, &authorAvatar)
		if err != nil {
			utils.ErrorResponse(c, http.StatusInternalServerError, "Error scan post: "+err.Error())
			return
		}

		// Bersihkan username dari prefix yang tidak diinginkan
		authorUsername = cleanUsername(authorUsername)

		// Get comments untuk post ini
		comments, _ := getPostComments(id)

		posts = append(posts, map[string]interface{}{
			"id":               id,
			"title":            title,
			"content":          content,
			"media_url":        mediaURL,
			"created_at":       createdAt,
			"author_name":      authorName,
			"author_username":  authorUsername,
			"author_avatar":    authorAvatar.String,
			"role":             role,
			"likes_count":      likesCount,
			"comments_count":   commentsCount,
			"user_has_liked":   userHasLiked,
			"user_has_saved":   userHasSaved,
			"comments":         comments,
		})
		postIDs = append(postIDs, id)
	}

	// Batch-fetch carousel media for all posts
	mediaMap := getPostMediaItems(postIDs)
	for _, post := range posts {
		pid := post["id"].(int)
		if mediaItems, ok := mediaMap[pid]; ok && len(mediaItems) > 0 {
			post["media"] = mediaItems
		} else if post["media_url"] != "" {
			// Fallback: wrap legacy single media_url as array
			post["media"] = []map[string]interface{}{{
				"id":         0,
				"media_type": "image",
				"media_url":  post["media_url"],
				"sort_order": 0,
			}}
		} else {
			post["media"] = []map[string]interface{}{}
		}
	}

	if len(posts) == 0 {
		utils.SuccessResponse(c, []interface{}{}, "Tidak ada postingan ditemukan")
		return
	}

	utils.SuccessResponse(c, posts, "Feed berhasil diambil")
}

// Helper function untuk mendapatkan komentar dengan struktur nested
func getPostComments(postID int) ([]map[string]interface{}, error) {
	query := `
        SELECT 
            c.id, 
            c.content, 
            c.created_at, 
            c.parent_id,
            c.author_name,
            c.user_role,
            c.user_id
        FROM comments c
        WHERE c.post_id = $1 AND c.deleted_at IS NULL
        ORDER BY 
            CASE WHEN c.parent_id IS NULL THEN c.id ELSE c.parent_id END,
            c.created_at ASC
    `

	rows, err := config.DB.Query(query, postID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	// Map untuk menyimpan semua komentar
	allComments := make(map[int]map[string]interface{})
	var topLevelComments []map[string]interface{}

	for rows.Next() {
		var id int
		var content, authorName, userRole string
		var parentID *int
		var createdAt time.Time
		var userID int

		err = rows.Scan(&id, &content, &createdAt, &parentID, &authorName, &userRole, &userID)
		if err != nil {
			return nil, err
		}

		var authorAvatar sql.NullString
		switch userRole {
		case "mahasiswa":
			_ = config.DB.QueryRow("SELECT photo FROM mahasiswa WHERE user_id = $1", userID).Scan(&authorAvatar)
		case "admin":
			_ = config.DB.QueryRow("SELECT profile_picture FROM admin WHERE user_id = $1", userID).Scan(&authorAvatar)
		case "ukm":
			_ = config.DB.QueryRow("SELECT profile_picture FROM ukm WHERE user_id = $1", userID).Scan(&authorAvatar)
		case "ormawa":
			_ = config.DB.QueryRow("SELECT profile_picture FROM ormawa WHERE user_id = $1", userID).Scan(&authorAvatar)
		}

		comment := map[string]interface{}{
			"id":            id,
			"content":       content,
			"author_name":   authorName,
			"user_role":     userRole,
			"author_avatar": authorAvatar.String,
			"created_at":    createdAt,
			"parent_id":     parentID,
			"replies":       []map[string]interface{}{},
		}

		allComments[id] = comment

		// Jika ini komentar tingkat atas (tidak punya parent)
		if parentID == nil {
			topLevelComments = append(topLevelComments, comment)
		}
	}

	// Organisasi replies - loop lagi untuk menghubungkan parent-child
	for _, comment := range allComments {
		if parentID, ok := comment["parent_id"].(*int); ok && parentID != nil {
			if parentComment, exists := allComments[*parentID]; exists {
				replies := parentComment["replies"].([]map[string]interface{})
				parentComment["replies"] = append(replies, comment)
			}
		}
	}

	return topLevelComments, nil
}

func CreatePost(c *gin.Context) {
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

	var input struct {
		Title    string `json:"title" binding:"required"`
		Content  string `json:"content" binding:"required"`
		MediaURL string `json:"media_url"`
	}

	if err := c.ShouldBindJSON(&input); err != nil {
		utils.ErrorResponse(c, http.StatusBadRequest, "Data tidak valid: "+err.Error())
		return
	}

	// Ambil data dari tabel sesuai role
	var authorName string
	var authorUsername string

	table := ""
	switch role {
	case "admin":
		table = "admin"
	case "ukm":
		table = "ukm"
	case "ormawa":
		table = "ormawa"
	case "dosen":
		table = "dosen"
	case "mahasiswa":
		table = "mahasiswa"
	case "orangtua":
		table = "ortu"
	default:
		utils.ErrorResponse(c, http.StatusForbidden, "Role tidak diizinkan membuat post")
		return
	}

	err := config.DB.QueryRow(
		"SELECT name, username FROM "+table+" WHERE user_id = $1 AND deleted_at IS NULL",
		userID,
	).Scan(&authorName, &authorUsername)

	if err != nil {
		// Fallback ke user email jika tidak ada di tabel spesifik
		err = config.DB.QueryRow(
			"SELECT email, email FROM users WHERE id = $2",
			userID,
		).Scan(&authorName, &authorUsername)
		if err != nil {
			utils.ErrorResponse(c, http.StatusNotFound, "Profile tidak ditemukan")
			return
		}
	}

	// Bersihkan username sebelum insert
	authorUsername = cleanUsername(authorUsername)

	// Insert post dengan author_username
	query := `
        INSERT INTO posts 
        (user_id, role, title, content, media_url, author_name, author_username, likes_count, comments_count, created_at)
        VALUES ($1, $2, $3, $4, $5, $6, $7, 0, 0, NOW())
        RETURNING id
    `

	var postID int64
	err = config.DB.QueryRow(query, userID, role, input.Title, input.Content, input.MediaURL, authorName, authorUsername).Scan(&postID)
	if err != nil {
		utils.ErrorResponse(c, http.StatusInternalServerError, "Gagal membuat post: "+err.Error())
		return
	}

	utils.SuccessResponse(c, gin.H{
		"id":              postID,
		"title":           input.Title,
		"content":         input.Content,
		"media_url":       input.MediaURL,
		"author_name":     authorName,
		"author_username": authorUsername,
		"role":            role,
	}, "Post berhasil dibuat!")
}

func LikePost(c *gin.Context) {
	postID := c.Param("id")
	userID, exists := c.Get("user_id")
	if !exists {
		utils.ErrorResponse(c, http.StatusUnauthorized, "Unauthorized")
		return
	}

	// Cek apakah post exists
	var postExistsInt int
	err := config.DB.QueryRow(
		"SELECT COUNT(*) FROM posts WHERE id = $1 AND deleted_at IS NULL",
		postID,
	).Scan(&postExistsInt)

	if err != nil || postExistsInt == 0 {
		utils.ErrorResponse(c, http.StatusNotFound, "Post tidak ditemukan")
		return
	}

	// Cek apakah user sudah like post ini (termasuk yang soft-deleted)
	var hasLikeRecord bool
	var isDeleted bool
	err = config.DB.QueryRow(
		"SELECT true, (deleted_at IS NOT NULL) FROM likes WHERE post_id = $1 AND user_id = $2",
		postID, userID,
	).Scan(&hasLikeRecord, &isDeleted)

	if err != nil {
		// Jika err == sql.ErrNoRows (baris belum ada sama sekali)
		if err.Error() == "sql: no rows in result set" {
			hasLikeRecord = false
		} else {
			utils.ErrorResponse(c, http.StatusInternalServerError, "Database error: "+err.Error())
			return
		}
	}

	if hasLikeRecord && !isDeleted {
		// Kondisi: Aktif -> Unlike
		_, err = config.DB.Exec(
			"UPDATE likes SET deleted_at = NOW() WHERE post_id = $1 AND user_id = $2",
			postID, userID,
		)
		if err != nil {
			utils.ErrorResponse(c, http.StatusInternalServerError, "Gagal unlike: "+err.Error())
			return
		}

		// Update likes count
		_, err = config.DB.Exec(
			"UPDATE posts SET likes_count = GREATEST(likes_count - 1, 0) WHERE id = $1",
			postID,
		)
		if err != nil {
			utils.ErrorResponse(c, http.StatusInternalServerError, "Gagal update likes count: "+err.Error())
			return
		}

		utils.SuccessResponse(c, gin.H{"liked": false}, "Post di-unlike")
	} else {
		// Kondisi: Belum ada ATAU sudah di-unlike (deleted_at IS NOT NULL) -> Like lagi
		if hasLikeRecord && isDeleted {
			// Update yang sudah ada
			_, err = config.DB.Exec(
				"UPDATE likes SET deleted_at = NULL WHERE post_id = $1 AND user_id = $2",
				postID, userID,
			)
		} else {
			// Insert baru
			_, err = config.DB.Exec(
				"INSERT INTO likes (post_id, user_id, created_at) VALUES ($1, $2, NOW())",
				postID, userID,
			)
		}

		if err != nil {
			utils.ErrorResponse(c, http.StatusInternalServerError, "Gagal like: "+err.Error())
			return
		}

		// Update likes count
		_, err = config.DB.Exec(
			"UPDATE posts SET likes_count = likes_count + 1 WHERE id = $1",
			postID,
		)
		if err != nil {
			utils.ErrorResponse(c, http.StatusInternalServerError, "Gagal update likes count: "+err.Error())
			return
		}

		utils.SuccessResponse(c, gin.H{"liked": true}, "Post di-like")
	}
}

func CommentPost(c *gin.Context) {
	postID := c.Param("id")
	userID, exists := c.Get("user_id")
	if !exists {
		utils.ErrorResponse(c, http.StatusUnauthorized, "Unauthorized")
		return
	}

	var input struct {
		Content  string `json:"content" binding:"required"`
		ParentID *int   `json:"parent_id"`
	}

	if err := c.ShouldBindJSON(&input); err != nil {
		utils.ErrorResponse(c, http.StatusBadRequest, "Data tidak valid: "+err.Error())
		return
	}

	// Cek apakah post exists
	var postExistsInt int
	err := config.DB.QueryRow(
		"SELECT COUNT(*) FROM posts WHERE id = $1 AND deleted_at IS NULL",
		postID,
	).Scan(&postExistsInt)

	if err != nil || postExistsInt == 0 {
		utils.ErrorResponse(c, http.StatusNotFound, "Post tidak ditemukan")
		return
	}

	// Jika ini adalah reply, cek apakah parent comment exists
	if input.ParentID != nil {
		var parentExists int
		err := config.DB.QueryRow(
			"SELECT COUNT(*) FROM comments WHERE id = $1 AND post_id = $2 AND deleted_at IS NULL",
			input.ParentID, postID,
		).Scan(&parentExists)
		
		if err != nil || parentExists == 0 {
			utils.ErrorResponse(c, http.StatusNotFound, "Komentar parent tidak ditemukan")
			return
		}
	}

	// Ambil data user untuk komentar
	var userName, userRole string
	var authorAvatar sql.NullString
	
	// Coba ambil dari tabel spesifik berdasarkan role
	role, exists := c.Get("role")
	if exists {
		switch role {
		case "mahasiswa":
			config.DB.QueryRow("SELECT name, photo FROM mahasiswa WHERE user_id = $1", userID).Scan(&userName, &authorAvatar)
		case "dosen":
			config.DB.QueryRow("SELECT name FROM dosen WHERE user_id = $1", userID).Scan(&userName)
		case "admin":
			config.DB.QueryRow("SELECT name, profile_picture FROM admin WHERE user_id = $1", userID).Scan(&userName, &authorAvatar)
		case "ukm":
			config.DB.QueryRow("SELECT name, profile_picture FROM ukm WHERE user_id = $1", userID).Scan(&userName, &authorAvatar)
		case "ormawa":
			config.DB.QueryRow("SELECT name, profile_picture FROM ormawa WHERE user_id = $1", userID).Scan(&userName, &authorAvatar)
		case "orangtua":
			config.DB.QueryRow("SELECT name FROM ortu WHERE user_id = $1", userID).Scan(&userName)
		}
	}

	// Fallback ke users table jika tidak ditemukan
	if userName == "" {
		err = config.DB.QueryRow(
			"SELECT email FROM users WHERE id = $1",
			userID,
		).Scan(&userName)
		if err != nil {
			userName = "Anonymous"
		}
	}

	// Dapatkan user_role
	err = config.DB.QueryRow(
		"SELECT role FROM users WHERE id = $1",
		userID,
	).Scan(&userRole)
	if err != nil {
		userRole = "mahasiswa" // default
	}

	query := `
        INSERT INTO comments 
        (post_id, user_id, content, author_name, user_role, parent_id, created_at)
        VALUES ($1, $2, $3, $4, $5, $6, NOW())
        RETURNING id
    `
	var commentID int64
	err = config.DB.QueryRow(query, postID, userID, input.Content, userName, userRole, input.ParentID).Scan(&commentID)
	if err != nil {
		utils.ErrorResponse(c, http.StatusInternalServerError, "Gagal menyimpan komentar: "+err.Error())
		return
	}

	// Update comment count di post (hanya untuk komentar tingkat atas)
	if input.ParentID == nil {
		_, err = config.DB.Exec("UPDATE posts SET comments_count = comments_count + 1 WHERE id = $1", postID)
		if err != nil {
			utils.ErrorResponse(c, http.StatusInternalServerError, "Gagal update comment count: "+err.Error())
			return
		}
	}

	utils.SuccessResponse(c, gin.H{
		"id":            commentID,
		"post_id":       postID,
		"content":       input.Content,
		"author_name":   userName,
		"user_role":     userRole,
		"author_avatar": authorAvatar.String,
		"parent_id":     input.ParentID,
		"created_at":    time.Now(),
	}, "Komentar berhasil ditambahkan!")
}

func GetPost(c *gin.Context) {
    postID := c.Param("id")
    userID, _ := c.Get("user_id")

    query := `
        SELECT 
            p.id, p.title, p.content, p.media_url, p.created_at,
            p.author_name, 
            COALESCE(NULLIF(p.author_username, ''), 
                LOWER(REPLACE(REPLACE(REPLACE(p.author_name, ' ', '_'), 'Ormawa_', ''), 'UKM_', ''))
            ) as author_username,
            p.role,
            COALESCE(p.likes_count, 0) AS likes_count,
            COALESCE(p.comments_count, 0) AS comments_count,
            EXISTS(SELECT 1 FROM likes l WHERE l.post_id = p.id AND l.user_id = $1 AND l.deleted_at IS NULL) as user_has_liked,
            EXISTS(SELECT 1 FROM saved_posts sp WHERE sp.post_id = p.id AND sp.user_id = $2 AND sp.deleted_at IS NULL) as user_has_saved,
            CASE p.role
                WHEN 'admin' THEN (SELECT profile_picture FROM admin WHERE user_id = p.user_id)
                WHEN 'ukm' THEN (SELECT profile_picture FROM ukm WHERE user_id = p.user_id)
                WHEN 'ormawa' THEN (SELECT profile_picture FROM ormawa WHERE user_id = p.user_id)
                WHEN 'mahasiswa' THEN (SELECT photo FROM mahasiswa WHERE user_id = p.user_id)
                ELSE NULL
            END as author_avatar
        FROM posts p
        WHERE p.id = $3 AND p.deleted_at IS NULL
    `

    var post struct {
        ID              int       `json:"id"`
        Title           string    `json:"title"`
        Content         string    `json:"content"`
        MediaURL        string    `json:"media_url"`
        CreatedAt       time.Time `json:"created_at"`
        AuthorName      string    `json:"author_name"`
        AuthorUsername  string    `json:"author_username"`
        AuthorAvatar    string    `json:"author_avatar"`
        Role            string    `json:"role"`
        LikesCount      int       `json:"likes_count"`
        CommentsCount   int       `json:"comments_count"`
        UserHasLiked    bool      `json:"user_has_liked"`
        UserHasSaved    bool      `json:"user_has_saved"`
        Comments        []map[string]interface{} `json:"comments"`
    }

    var authorAvatar sql.NullString

    err := config.DB.QueryRow(query, userID, userID, postID).Scan(
        &post.ID,
        &post.Title,
        &post.Content,
        &post.MediaURL,
        &post.CreatedAt,
        &post.AuthorName,
        &post.AuthorUsername,
        &post.Role,
        &post.LikesCount,
        &post.CommentsCount,
        &post.UserHasLiked,
        &post.UserHasSaved,
        &authorAvatar,
    )

    if err == nil {
        post.AuthorAvatar = authorAvatar.String
    }

    if err != nil {
        utils.ErrorResponse(c, http.StatusNotFound, "Post tidak ditemukan")
        return
    }

    // Bersihkan username dari prefix yang tidak diinginkan
    post.AuthorUsername = cleanUsername(post.AuthorUsername)

    // Get comments untuk post ini
    comments, err := getPostComments(post.ID)
    if err != nil {
        utils.ErrorResponse(c, http.StatusInternalServerError, "Gagal mengambil komentar: "+err.Error())
        return
    }
    post.Comments = comments

    utils.SuccessResponse(c, post, "Post berhasil diambil")
}


// SavePost - Function untuk save/unsave post
func SavePost(c *gin.Context) {
    postID := c.Param("id")
    userID, exists := c.Get("user_id")
    if !exists {
        utils.ErrorResponse(c, http.StatusUnauthorized, "Unauthorized")
        return
    }

    // Cek apakah post exists
    var postExistsInt int
    err := config.DB.QueryRow(
        "SELECT COUNT(*) FROM posts WHERE id = $1 AND deleted_at IS NULL",
        postID,
    ).Scan(&postExistsInt)

    if err != nil || postExistsInt == 0 {
        utils.ErrorResponse(c, http.StatusNotFound, "Post tidak ditemukan")
        return
    }

    // Cek apakah sudah disimpan
    var existingSave int
    err = config.DB.QueryRow(
        "SELECT COUNT(*) FROM saved_posts WHERE post_id = $1 AND user_id = $2 AND deleted_at IS NULL",
        postID, userID,
    ).Scan(&existingSave)

    if err != nil {
        utils.ErrorResponse(c, http.StatusInternalServerError, "Database error: "+err.Error())
        return
    }

    if existingSave > 0 {
        // Unsave
        _, err = config.DB.Exec(
            "UPDATE saved_posts SET deleted_at = NOW() WHERE post_id = $1 AND user_id = $2",
            postID, userID,
        )
        if err != nil {
            utils.ErrorResponse(c, http.StatusInternalServerError, "Gagal unsave: "+err.Error())
            return
        }
        utils.SuccessResponse(c, gin.H{"saved": false}, "Post di-unsave")
    } else {
        // Save
        _, err = config.DB.Exec(
            "INSERT INTO saved_posts (post_id, user_id, created_at) VALUES ($1, $2, NOW())",
            postID, userID,
        )
        if err != nil {
            utils.ErrorResponse(c, http.StatusInternalServerError, "Gagal save: "+err.Error())
            return
        }
        utils.SuccessResponse(c, gin.H{"saved": true}, "Post disimpan")
    }
}
