// controllers/profile_controller.go
package controllers

import (
    "net/http"
    "strings"
    "fmt"
    "log"
    "database/sql"
    "nf-student-hub-backend/config"
    "nf-student-hub-backend/utils"

    "github.com/gin-gonic/gin"
)

// Helper function untuk membersihkan username
func cleanUsernameParam(username string) string {
    cleaned := strings.ToLower(username)
    cleaned = strings.TrimSpace(cleaned)
    return cleaned
}

func GetMyProfile(c *gin.Context) {
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

    table := ""
    switch role {
    case "admin":
        table = "admin"
    case "ukm":
        table = "ukm"
    case "ormawa":
        table = "ormawa"
    case "mahasiswa":
        table = "mahasiswa"
    default:
        utils.ErrorResponse(c, http.StatusBadRequest, "Role tidak valid")
        return
    }

    // Query berbeda untuk mahasiswa
    var query string
    if role == "mahasiswa" {
        query = `
            SELECT id, user_id, name, nim, alamat, photo,
                   created_at, updated_at
            FROM ` + table + ` 
            WHERE user_id = $1 AND deleted_at IS NULL
        `
    } else {
        query = `
            SELECT id, user_id, name, username, bio, website, phone, 
                   profile_picture, followers_count, following_count,
                   created_at, updated_at
            FROM ` + table + ` 
            WHERE user_id = $1 AND deleted_at IS NULL
        `
    }

    if role == "mahasiswa" {
        var profile struct {
            ID        int            `json:"id"`
            UserID    int            `json:"user_id"`
            Name      string         `json:"name"`
            NIM       string         `json:"nim"`
            Alamat    sql.NullString `json:"alamat"`
            Photo     sql.NullString `json:"photo"`
            CreatedAt string         `json:"created_at"`
            UpdatedAt string         `json:"updated_at"`
        }

        err := config.DB.QueryRow(query, userID).Scan(
            &profile.ID, &profile.UserID, &profile.Name, &profile.NIM,
            &profile.Alamat, &profile.Photo, &profile.CreatedAt, &profile.UpdatedAt,
        )

        if err != nil {
            if err == sql.ErrNoRows {
                utils.ErrorResponse(c, http.StatusNotFound, "Profile mahasiswa tidak ditemukan")
                return
            }
            utils.ErrorResponse(c, http.StatusInternalServerError, "Database error: "+err.Error())
            return
        }

        utils.SuccessResponse(c, gin.H{
            "id":         profile.ID,
            "user_id":    profile.UserID,
            "name":       profile.Name,
            "nim":        profile.NIM,
            "alamat":     profile.Alamat.String,
            "photo":      profile.Photo.String,
            "role":       role,
            "created_at": profile.CreatedAt,
            "updated_at": profile.UpdatedAt,
        }, "Profile mahasiswa berhasil diambil")
    } else {
        var profile struct {
            ID             int            `json:"id"`
            UserID         int            `json:"user_id"`
            Name           string         `json:"name"`
            Username       string         `json:"username"`
            Bio            sql.NullString `json:"bio"`
            Website        sql.NullString `json:"website"`
            Phone          sql.NullString `json:"phone"`
            ProfilePicture sql.NullString `json:"profile_picture"`
            FollowersCount int            `json:"followers_count"`
            FollowingCount int            `json:"following_count"`
            CreatedAt      string         `json:"created_at"`
            UpdatedAt      string         `json:"updated_at"`
        }

        err := config.DB.QueryRow(query, userID).Scan(
            &profile.ID, &profile.UserID, &profile.Name, &profile.Username,
            &profile.Bio, &profile.Website, &profile.Phone,
            &profile.ProfilePicture, &profile.FollowersCount, &profile.FollowingCount,
            &profile.CreatedAt, &profile.UpdatedAt,
        )

        if err != nil {
            if err == sql.ErrNoRows {
                utils.ErrorResponse(c, http.StatusNotFound, "Profile tidak ditemukan")
                return
            }
            utils.ErrorResponse(c, http.StatusInternalServerError, "Database error: "+err.Error())
            return
        }

        utils.SuccessResponse(c, gin.H{
            "id":               profile.ID,
            "user_id":          profile.UserID,
            "name":             profile.Name,
            "username":         profile.Username,
            "bio":              profile.Bio.String,
            "website":          profile.Website.String,
            "phone":            profile.Phone.String,
            "profile_picture":  profile.ProfilePicture.String,
            "followers_count":  profile.FollowersCount,
            "following_count":  profile.FollowingCount,
            "role":             role,
            "created_at":       profile.CreatedAt,
            "updated_at":       profile.UpdatedAt,
        }, "Profile berhasil diambil")
    }
}

func UpdateMyProfile(c *gin.Context) {
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

    table := ""
    switch role {
    case "admin":
        table = "admin"
    case "ukm":
        table = "ukm"
    case "ormawa":
        table = "ormawa"
    default:
        utils.ErrorResponse(c, http.StatusBadRequest, "Role tidak valid atau tidak memiliki akses update profile")
        return
    }

    name := c.PostForm("name")
    username := c.PostForm("username")
    bio := c.PostForm("bio")
    website := c.PostForm("website")
    phone := c.PostForm("phone")

    // Retrieve existing to keep profile picture if not updated
    var existing struct {
        ProfilePicture sql.NullString
    }
    existingErr := config.DB.QueryRow("SELECT profile_picture FROM "+table+" WHERE user_id = $1", userID).Scan(&existing.ProfilePicture)
    profilePicture := ""
    if existingErr == nil {
        profilePicture = existing.ProfilePicture.String
    }

    if _, _, formErr := c.Request.FormFile("profile_picture"); formErr == nil {
        // We pass 0 for uid if not needed, but wait! UploadFileToDB takes (c, formField, userID, role, folderName, oldFileUrl, fallbackUrl)
        var uid int
        uidF, _ := userID.(float64)
        uid = int(uidF)
        
        // Coba upload ke DB (BYTEA)
        _, fileURL, uploadErr := UploadFileToDB(c, "profile_picture", uid, role.(string), "profile", nil, nil)
        if uploadErr != nil {
            utils.ErrorResponse(c, http.StatusBadRequest, uploadErr.Error())
            return
        }
        profilePicture = fileURL
    }

    // Upsert or update
    _, err := config.DB.Exec(`
        UPDATE `+table+`
        SET name = $1, username = $2, bio = $3, website = $4, phone = $5, profile_picture = $6, updated_at = NOW()
        WHERE user_id = $7 AND deleted_at IS NULL
    `, name, username, bio, website, phone, profilePicture, userID)

    if err != nil {
        utils.ErrorResponse(c, http.StatusInternalServerError, "Gagal mengupdate profile: "+err.Error())
        return
    }

    utils.SuccessResponse(c, gin.H{
        "name": name,
        "username": username,
        "bio": bio,
        "website": website,
        "phone": phone,
        "profile_picture": profilePicture,
    }, "Profile berhasil diupdate")
}

func GetPublicProfile(c *gin.Context) {
    role := c.Param("role")
    username := c.Param("username")

    // Validasi role dengan pesan lebih jelas
    validRoles := map[string]string{
        "admin":   "Administrator",
        "ukm":     "Unit Kegiatan Mahasiswa", 
        "ormawa":  "Organisasi Mahasiswa",
    }
    
    if _, exists := validRoles[role]; !exists {
        utils.ErrorResponse(c, http.StatusBadRequest, 
            "Role tidak valid. Harus: admin, ukm, atau ormawa")
        return
    }

    table := role
    cleanUsername := cleanUsernameParam(username)

    log.Printf("Mencari profile: role=%s, username=%s, cleanUsername=%s", role, username, cleanUsername)

    var profile struct {
        ID             int            `json:"id"`
        Name           string         `json:"name"`
        Username       string         `json:"username"`
        Bio            sql.NullString `json:"bio"`
        Website        sql.NullString `json:"website"`
        Phone          sql.NullString `json:"phone"`
        ProfilePicture sql.NullString `json:"profile_picture"`
        FollowersCount int            `json:"followers_count"`
        FollowingCount int            `json:"following_count"`
        CreatedAt      string         `json:"created_at"`
        UpdatedAt      string         `json:"updated_at"`
    }

        query := `
            SELECT id, name, username, bio, website, phone, profile_picture, 
                followers_count, following_count, created_at, updated_at
            FROM ` + table + ` 
            WHERE (username = $1 OR username = $2) AND deleted_at IS NULL
        `

    // Coba dengan username yang sudah dibersihkan
    err := config.DB.QueryRow(query, username, cleanUsername).Scan(
        &profile.ID, &profile.Name, &profile.Username,
        &profile.Bio, &profile.Website, &profile.Phone, &profile.ProfilePicture,
        &profile.FollowersCount, &profile.FollowingCount,
        &profile.CreatedAt, &profile.UpdatedAt,
    )

    // Jika tidak ditemukan, coba dengan name
    if err != nil {
        if err == sql.ErrNoRows {
            log.Printf("Tidak ditemukan dengan username %s, mencoba dengan name...", cleanUsername)
            
            // Generate name dari username
            nameFromUsername := strings.Replace(strings.Title(strings.Replace(cleanUsername, "_", " ", -1)), "Ukm ", "UKM ", -1)
            nameFromUsername = strings.Replace(nameFromUsername, "Ormawa ", "Ormawa ", -1)
            
            fallbackQuery := `
                SELECT id, name, username, bio, website, phone, profile_picture, 
                       followers_count, following_count, created_at, updated_at
                FROM ` + table + ` 
                WHERE name LIKE $1 AND deleted_at IS NULL
            `
            
            err = config.DB.QueryRow(fallbackQuery, "%"+nameFromUsername+"%").Scan(
                &profile.ID, &profile.Name, &profile.Username,
                &profile.Bio, &profile.Website, &profile.Phone, &profile.ProfilePicture,
                &profile.FollowersCount, &profile.FollowingCount,
                &profile.CreatedAt, &profile.UpdatedAt,
            )
            
            if err != nil {
                if err == sql.ErrNoRows {
                    utils.ErrorResponse(c, http.StatusNotFound, 
                        fmt.Sprintf("Profile @%s tidak ditemukan untuk role %s", username, validRoles[role]))
                    return
                }
                utils.ErrorResponse(c, http.StatusInternalServerError, "Database error: "+err.Error())
                return
            }
        } else {
            utils.ErrorResponse(c, http.StatusInternalServerError, "Database error: "+err.Error())
            return
        }
    }

    utils.SuccessResponse(c, gin.H{
        "id":               profile.ID,
        "name":             profile.Name,
        "username":         profile.Username,
        "bio":              profile.Bio.String,
        "website":          profile.Website.String,
        "phone":            profile.Phone.String,
        "profile_picture":  profile.ProfilePicture.String,
        "followers_count":  profile.FollowersCount,
        "following_count":  profile.FollowingCount,
        "role":             role,
        "created_at":       profile.CreatedAt,
        "updated_at":       profile.UpdatedAt,
    }, "Profile publik berhasil diambil")
}

// GetUserPosts - Endpoint baru untuk mengambil postingan user berdasarkan role dan username
func GetUserPosts(c *gin.Context) {
    role := c.Param("role")
    username := c.Param("username")

    // Validasi role
    validRoles := map[string]bool{
        "admin":   true,
        "ukm":     true,
        "ormawa":  true,
    }
    if !validRoles[role] {
        utils.ErrorResponse(c, http.StatusBadRequest, "Role tidak valid. Harus admin, ukm, atau ormawa")
        return
    }

    cleanUsername := cleanUsernameParam(username)

    log.Printf("Mencari postingan: role=%s, username=%s, cleanUsername=%s", role, username, cleanUsername)

    query := `
        SELECT 
            p.id, p.title, p.content, p.media_url, p.created_at,
            p.author_name, p.author_username, p.role,
            COALESCE(p.likes_count, 0) AS likes_count,
            COALESCE(p.comments_count, 0) AS comments_count
        FROM posts p
        WHERE p.role = $1 
        AND (p.author_username = $2 OR p.author_username LIKE $3)
        ORDER BY p.created_at DESC
        LIMIT 50
    `

    rows, err := config.DB.Query(query, role, cleanUsername, "%"+cleanUsername+"%")
    if err != nil {
        utils.ErrorResponse(c, http.StatusInternalServerError, "Gagal mengambil postingan user: " + err.Error())
        return
    }
    defer rows.Close()

    var posts []map[string]interface{}
    var postIDs []int
    for rows.Next() {
        var id int
        var title, content, mediaURL, authorName, authorUsername, role string
        var createdAt interface{}
        var likesCount, commentsCount int

        err = rows.Scan(&id, &title, &content, &mediaURL, &createdAt, 
                       &authorName, &authorUsername, &role, &likesCount, &commentsCount)
        if err != nil {
            log.Printf("Error scanning post: %v", err)
            continue
        }

        // Bersihkan username untuk konsistensi
        authorUsername = cleanUsernameParam(authorUsername)

        posts = append(posts, map[string]interface{}{
            "id":               id,
            "title":            title,
            "content":          content,
            "media_url":        mediaURL,
            "author_name":      authorName,
            "author_username":  authorUsername,
            "role":             role,
            "likes_count":      likesCount,
            "comments_count":   commentsCount,
            "created_at":       createdAt,
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
        utils.SuccessResponse(c, []interface{}{}, "Tidak ada postingan ditemukan untuk user ini")
        return
    }

    utils.SuccessResponse(c, posts, "Postingan user berhasil diambil")
}

// GetRecommendedAccounts fetches UKM and Ormawa profiles for the sidebar
func GetRecommendedAccounts(c *gin.Context) {
	// Ambil rekomendasi ormawa
	ormawaQuery := `
		SELECT id, name, username, profile_picture
		FROM ormawa
		WHERE deleted_at IS NULL
		ORDER BY created_at DESC
		LIMIT 6
	`
	ormawaRows, err := config.DB.Query(ormawaQuery)
	var ormawaList []map[string]interface{}
	if err == nil {
		defer ormawaRows.Close()
		for ormawaRows.Next() {
			var id int
			var name, username string
			var profilePicture sql.NullString
			if err := ormawaRows.Scan(&id, &name, &username, &profilePicture); err == nil {
				ormawaList = append(ormawaList, map[string]interface{}{
					"id":              id,
					"name":            name,
					"username":        username,
					"type":            "ormawa",
					"profile_picture": profilePicture.String,
				})
			}
		}
	} else {
	    log.Printf("Error fetching recommended ormawa: %v", err)
	}

	// Ambil rekomendasi ukm
	ukmQuery := `
		SELECT id, name, username, profile_picture
		FROM ukm
		WHERE deleted_at IS NULL
		ORDER BY created_at DESC
		LIMIT 6
	`
	ukmRows, err := config.DB.Query(ukmQuery)
	var ukmList []map[string]interface{}
	if err == nil {
		defer ukmRows.Close()
		for ukmRows.Next() {
			var id int
			var name, username string
			var profilePicture sql.NullString
			if err := ukmRows.Scan(&id, &name, &username, &profilePicture); err == nil {
				ukmList = append(ukmList, map[string]interface{}{
					"id":              id,
					"name":            name,
					"username":        username,
					"type":            "ukm",
					"profile_picture": profilePicture.String,
				})
			}
		}
	} else {
	    log.Printf("Error fetching recommended ukm: %v", err)
	}

	utils.SuccessResponse(c, gin.H{
		"ormawa": ormawaList,
		"ukm":    ukmList,
	}, "Rekomendasi akun berhasil diambil")
}