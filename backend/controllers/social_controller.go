package controllers

import (
	"errors"
	"fmt"
	"net/http"
	"strconv"
	"strings"

	"nf-student-hub-backend/config"
	"nf-student-hub-backend/models"
	"nf-student-hub-backend/utils"

	"github.com/gin-gonic/gin"
	"gorm.io/gorm"
	"gorm.io/gorm/clause"
)

type socialAccount struct {
	ID       int    `json:"id"`
	Name     string `json:"name"`
	Username string `json:"username"`
	Role     string `json:"role"`
	Photo    string `json:"profile_picture"`
}

func socialUserID(c *gin.Context) (int, bool) {
	value, exists := c.Get("user_id")
	if !exists {
		utils.ErrorResponse(c, http.StatusUnauthorized, "Unauthorized")
		return 0, false
	}
	switch id := value.(type) {
	case int:
		return id, true
	case float64:
		return int(id), true
	case string:
		parsed, err := strconv.Atoi(id)
		if err == nil {
			return parsed, true
		}
	}
	utils.ErrorResponse(c, http.StatusUnauthorized, "Identitas pengguna tidak valid")
	return 0, false
}

func socialTargetID(c *gin.Context) (int, bool) {
	id, err := strconv.Atoi(c.Param("id"))
	if err != nil || id <= 0 {
		utils.ErrorResponse(c, http.StatusBadRequest, "ID pengguna tidak valid")
		return 0, false
	}
	return id, true
}

func socialPagination(c *gin.Context) (int, int) {
	page, _ := strconv.Atoi(c.DefaultQuery("page", "1"))
	limit, _ := strconv.Atoi(c.DefaultQuery("limit", "20"))
	if page < 1 {
		page = 1
	}
	if limit < 1 || limit > 50 {
		limit = 20
	}
	return page, limit
}

func getSocialAccount(db *gorm.DB, userID int) (socialAccount, error) {
	var account socialAccount
	var user models.User
	if err := db.Select("id", "role", "email").First(&user, userID).Error; err != nil {
		return account, err
	}

	account.ID = user.ID
	account.Role = user.Role
	account.Username = strings.Split(user.Email, "@")[0]
	account.Name = account.Username

	table := map[string]string{
		"admin": "admin", "ukm": "ukm", "ormawa": "ormawa",
		"mahasiswa": "mahasiswa", "dosen": "dosen",
	}[user.Role]
	if table == "" {
		return account, nil
	}

	nameColumn, usernameColumn, photoColumn := "name", "username", "profile_picture"
	if user.Role == "mahasiswa" {
		usernameColumn, photoColumn = "nim", "photo"
	}
	if user.Role == "dosen" {
		usernameColumn, photoColumn = "nip", "''"
	}
	query := fmt.Sprintf(
		"SELECT COALESCE(%s, ''), COALESCE(%s, ''), COALESCE(%s, '') FROM %s WHERE user_id = ? AND deleted_at IS NULL LIMIT 1",
		nameColumn, usernameColumn, photoColumn, table,
	)
	_ = db.Raw(query, userID).Row().Scan(&account.Name, &account.Username, &account.Photo)
	return account, nil
}

func FollowUser(c *gin.Context) {
	actorID, ok := socialUserID(c)
	if !ok {
		return
	}
	targetID, ok := socialTargetID(c)
	if !ok {
		return
	}
	if actorID == targetID {
		utils.ErrorResponse(c, http.StatusBadRequest, "Anda tidak dapat mengikuti akun sendiri")
		return
	}

	db := config.GetGormDB()
	target, err := getSocialAccount(db, targetID)
	if err != nil {
		utils.ErrorResponse(c, http.StatusNotFound, "Akun tujuan tidak ditemukan")
		return
	}
	actor, err := getSocialAccount(db, actorID)
	if err != nil {
		utils.ErrorResponse(c, http.StatusUnauthorized, "Akun pengguna tidak ditemukan")
		return
	}

	created := false
	err = db.Transaction(func(tx *gorm.DB) error {
		follow := models.Follow{FollowerID: actorID, FollowingID: targetID}
		result := tx.Clauses(clause.OnConflict{DoNothing: true}).Create(&follow)
		if result.Error != nil {
			return result.Error
		}
		if result.RowsAffected == 0 {
			return nil
		}
		created = true
		return tx.Create(&models.SocialNotification{
			RecipientID: targetID,
			ActorID:     actorID,
			Type:        "follow",
			ReferenceID: &follow.ID,
			Message:     actor.Name + " mulai mengikuti Anda.",
		}).Error
	})
	if err != nil {
		utils.ErrorResponse(c, http.StatusInternalServerError, "Gagal mengikuti akun")
		return
	}

	count := int64(0)
	db.Model(&models.Follow{}).Where("following_id = ?", targetID).Count(&count)
	message := "Akun sudah diikuti"
	if created {
		message = "Berhasil mengikuti akun"
	}
	utils.SuccessResponse(c, gin.H{"is_following": true, "followers_count": count, "account": target}, message)
}

func UnfollowUser(c *gin.Context) {
	actorID, ok := socialUserID(c)
	if !ok {
		return
	}
	targetID, ok := socialTargetID(c)
	if !ok {
		return
	}
	result := config.GetGormDB().Where("follower_id = ? AND following_id = ?", actorID, targetID).Delete(&models.Follow{})
	if result.Error != nil {
		utils.ErrorResponse(c, http.StatusInternalServerError, "Gagal berhenti mengikuti akun")
		return
	}
	count := int64(0)
	config.GetGormDB().Model(&models.Follow{}).Where("following_id = ?", targetID).Count(&count)
	utils.SuccessResponse(c, gin.H{"is_following": false, "followers_count": count}, "Berhasil berhenti mengikuti akun")
}

func GetFollowStatus(c *gin.Context) {
	actorID, ok := socialUserID(c)
	if !ok {
		return
	}
	targetID, ok := socialTargetID(c)
	if !ok {
		return
	}
	db := config.GetGormDB()
	var relationCount, followersCount, followingCount int64
	db.Model(&models.Follow{}).Where("follower_id = ? AND following_id = ?", actorID, targetID).Count(&relationCount)
	db.Model(&models.Follow{}).Where("following_id = ?", targetID).Count(&followersCount)
	db.Model(&models.Follow{}).Where("follower_id = ?", targetID).Count(&followingCount)
	utils.SuccessResponse(c, gin.H{
		"is_following": relationCount > 0, "is_own_account": actorID == targetID,
		"followers_count": followersCount, "following_count": followingCount,
	}, "Status follow berhasil diambil")
}

func listFollowAccounts(c *gin.Context, followers bool) {
	targetID, ok := socialTargetID(c)
	if !ok {
		return
	}
	viewerID, ok := socialUserID(c)
	if !ok {
		return
	}
	page, limit := socialPagination(c)
	db := config.GetGormDB()
	var relations []models.Follow
	query := db.Order("created_at DESC, id DESC").Limit(limit).Offset((page - 1) * limit)
	if followers {
		query = query.Where("following_id = ?", targetID)
	} else {
		query = query.Where("follower_id = ?", targetID)
	}
	if err := query.Find(&relations).Error; err != nil {
		utils.ErrorResponse(c, http.StatusInternalServerError, "Gagal mengambil daftar akun")
		return
	}

	accounts := make([]gin.H, 0, len(relations))
	for _, relation := range relations {
		accountID := relation.FollowingID
		if followers {
			accountID = relation.FollowerID
		}
		account, err := getSocialAccount(db, accountID)
		if err != nil {
			continue
		}
		var count int64
		db.Model(&models.Follow{}).Where("follower_id = ? AND following_id = ?", viewerID, accountID).Count(&count)
		accounts = append(accounts, gin.H{"account": account, "is_following": count > 0, "followed_at": relation.CreatedAt})
	}
	utils.SuccessResponse(c, gin.H{"items": accounts, "page": page, "limit": limit, "has_more": len(relations) == limit}, "Daftar akun berhasil diambil")
}

func GetFollowers(c *gin.Context) { listFollowAccounts(c, true) }
func GetFollowing(c *gin.Context) { listFollowAccounts(c, false) }

func GetSocialNotifications(c *gin.Context) {
	userID, ok := socialUserID(c)
	if !ok {
		return
	}
	page, limit := socialPagination(c)
	db := config.GetGormDB()
	var notifications []models.SocialNotification
	if err := db.Where("recipient_id = ?", userID).Order("created_at DESC, id DESC").
		Limit(limit).Offset((page - 1) * limit).Find(&notifications).Error; err != nil {
		utils.ErrorResponse(c, http.StatusInternalServerError, "Gagal mengambil notifikasi")
		return
	}
	items := make([]gin.H, 0, len(notifications))
	for _, notification := range notifications {
		actor, _ := getSocialAccount(db, notification.ActorID)
		items = append(items, gin.H{"id": notification.ID, "type": notification.Type, "message": notification.Message, "is_read": notification.IsRead, "created_at": notification.CreatedAt, "actor": actor})
	}
	var unread int64
	db.Model(&models.SocialNotification{}).Where("recipient_id = ? AND is_read = ?", userID, false).Count(&unread)
	utils.SuccessResponse(c, gin.H{"items": items, "unread_count": unread, "page": page, "limit": limit, "has_more": len(notifications) == limit}, "Notifikasi berhasil diambil")
}

func MarkSocialNotificationRead(c *gin.Context) {
	userID, ok := socialUserID(c)
	if !ok {
		return
	}
	id, err := strconv.Atoi(c.Param("id"))
	if err != nil {
		utils.ErrorResponse(c, http.StatusBadRequest, "ID notifikasi tidak valid")
		return
	}
	result := config.GetGormDB().Model(&models.SocialNotification{}).Where("id = ? AND recipient_id = ?", id, userID).Update("is_read", true)
	if errors.Is(result.Error, gorm.ErrRecordNotFound) || result.RowsAffected == 0 {
		utils.ErrorResponse(c, http.StatusNotFound, "Notifikasi tidak ditemukan")
		return
	}
	utils.SuccessResponse(c, gin.H{"id": id, "is_read": true}, "Notifikasi ditandai sudah dibaca")
}

func MarkAllSocialNotificationsRead(c *gin.Context) {
	userID, ok := socialUserID(c)
	if !ok {
		return
	}
	if err := config.GetGormDB().Model(&models.SocialNotification{}).Where("recipient_id = ? AND is_read = ?", userID, false).Update("is_read", true).Error; err != nil {
		utils.ErrorResponse(c, http.StatusInternalServerError, "Gagal menandai notifikasi")
		return
	}
	utils.SuccessResponse(c, gin.H{"unread_count": 0}, "Semua notifikasi ditandai sudah dibaca")
}
