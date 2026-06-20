package controllers

import (
	"database/sql"
	"log"
	"net/http"
	"net/url"
	"os"
	"strings"
	"time"

	"nf-student-hub-backend/config"
	"nf-student-hub-backend/utils"

	"github.com/gin-gonic/gin"
)

const emailVerificationTTL = 24 * time.Hour

// emailVerificationEnabled reports whether login should be gated on a verified email.
func emailVerificationEnabled() bool {
	v := strings.ToLower(strings.TrimSpace(os.Getenv("EMAIL_VERIFICATION_REQUIRED")))
	return v == "true" || v == "1" || v == "yes"
}

// frontendURL returns the configured frontend base URL (no trailing slash).
func frontendURL() string {
	base := strings.TrimSpace(os.Getenv("FRONTEND_URL"))
	if base == "" {
		base = strings.TrimSpace(os.Getenv("APP_URL"))
	}
	if base == "" {
		base = "http://localhost:3000"
	}
	return strings.TrimRight(base, "/")
}

// backendBaseURL derives the backend's externally reachable base URL from the request.
func backendBaseURL(c *gin.Context) string {
	scheme := "http"
	if c.Request.TLS != nil || strings.EqualFold(c.GetHeader("X-Forwarded-Proto"), "https") {
		scheme = "https"
	}
	return scheme + "://" + c.Request.Host
}

// createEmailVerificationToken inserts a fresh single-use token and returns it.
func createEmailVerificationToken(userID int) (string, error) {
	token := utils.GenerateRandomString(48)
	expiresAt := time.Now().Add(emailVerificationTTL)
	_, err := config.DB.Exec(
		"INSERT INTO email_verifications (user_id, token, expires_at) VALUES ($1, $2, $3)",
		userID, token, expiresAt,
	)
	if err != nil {
		return "", err
	}
	return token, nil
}

// sendVerificationEmailBestEffort issues a token and emails the link.
// Returns false (and logs) on any failure so callers can continue without blocking registration.
func sendVerificationEmailBestEffort(c *gin.Context, userID int, email, name string) bool {
	token, err := createEmailVerificationToken(userID)
	if err != nil {
		log.Printf("[email-verif] gagal membuat token untuk user %d: %v", userID, err)
		return false
	}

	link := backendBaseURL(c) + "/api/auth/verify-email?token=" + url.QueryEscape(token)
	if err := utils.SendVerificationEmail(email, name, link); err != nil {
		log.Printf("[email-verif] gagal mengirim email ke %s: %v", email, err)
		return false
	}
	return true
}

// VerifyEmail handles GET /api/auth/verify-email?token=... (public).
// On success it flips users.is_email_verified and redirects to the frontend.
func VerifyEmail(c *gin.Context) {
	token := strings.TrimSpace(c.Query("token"))
	redirectOK := frontendURL() + "/?email_verified=success"
	redirectFail := frontendURL() + "/?email_verified=failed"

	if token == "" {
		c.Redirect(http.StatusFound, redirectFail)
		return
	}

	var (
		id        int
		userID    int
		used      bool
		expiresAt time.Time
	)
	err := config.DB.QueryRow(
		"SELECT id, user_id, used, expires_at FROM email_verifications WHERE token = $1",
		token,
	).Scan(&id, &userID, &used, &expiresAt)
	if err != nil || used || time.Now().After(expiresAt) {
		c.Redirect(http.StatusFound, redirectFail)
		return
	}

	tx, err := config.DB.Begin()
	if err != nil {
		c.Redirect(http.StatusFound, redirectFail)
		return
	}
	defer tx.Rollback()

	if _, err := tx.Exec("UPDATE email_verifications SET used = true WHERE id = $1", id); err != nil {
		c.Redirect(http.StatusFound, redirectFail)
		return
	}
	if _, err := tx.Exec("UPDATE users SET is_email_verified = true, updated_at = NOW() WHERE id = $1", userID); err != nil {
		c.Redirect(http.StatusFound, redirectFail)
		return
	}
	if err := tx.Commit(); err != nil {
		c.Redirect(http.StatusFound, redirectFail)
		return
	}

	c.Redirect(http.StatusFound, redirectOK)
}

// ResendVerification handles POST /api/auth/resend-verification { email } (public).
// Responds generically to avoid account enumeration.
func ResendVerification(c *gin.Context) {
	var input struct {
		Email string `json:"email" binding:"required,email"`
	}
	if err := c.ShouldBindJSON(&input); err != nil {
		utils.ErrorResponse(c, http.StatusBadRequest, "Email tidak valid.")
		return
	}

	generic := "Jika email terdaftar dan belum terverifikasi, tautan verifikasi telah dikirim ulang."
	email := strings.TrimSpace(input.Email)

	var (
		userID     int
		isVerified bool
	)
	err := config.DB.QueryRow(
		"SELECT id, COALESCE(is_email_verified, false) FROM users WHERE LOWER(email) = LOWER($1)",
		email,
	).Scan(&userID, &isVerified)
	if err == sql.ErrNoRows || (err == nil && isVerified) {
		utils.SuccessResponse(c, nil, generic)
		return
	}
	if err != nil {
		utils.SuccessResponse(c, nil, generic)
		return
	}

	// Best-effort name lookup for a nicer email.
	var name sql.NullString
	config.DB.QueryRow("SELECT name FROM mahasiswa WHERE user_id = $1", userID).Scan(&name)

	sendVerificationEmailBestEffort(c, userID, email, name.String)
	utils.SuccessResponse(c, nil, generic)
}
