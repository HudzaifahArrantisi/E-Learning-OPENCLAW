package controllers

import (
	"database/sql"
	"fmt"
	"net/http"
	"net/mail"
	"strings"

	"nf-student-hub-backend/config"
	"nf-student-hub-backend/utils"

	"github.com/gin-gonic/gin"
	"golang.org/x/crypto/bcrypt"
)

const nurulFikriDomain = "@nurulfikri.ac.id"

// isInstitutionalEmail: cek domain @nurulfikri.ac.id (case-insensitive).
func isInstitutionalEmail(s string) bool {
	return strings.HasSuffix(strings.ToLower(strings.TrimSpace(s)), nurulFikriDomain)
}

func normalizeLoginIdentifier(identifier string) string {
	return strings.TrimSpace(identifier)
}

func getLoginAccountIdentifier(identifier string) (string, bool) {
	identifier = normalizeLoginIdentifier(identifier)
	if identifier == "" {
		return "", false
	}
	if !strings.Contains(identifier, "@") {
		return identifier, true
	}
	if !isInstitutionalEmail(identifier) {
		return identifier, false
	}

	localPart, _, found := strings.Cut(identifier, "@")
	if !found || localPart == "" {
		return identifier, false
	}
	return localPart, true
}

func isValidLoginInput(identifier, password string) bool {
	if len(identifier) == 0 || len(identifier) > 254 || len(password) == 0 || len(password) > 128 {
		return false
	}
	if strings.ContainsAny(identifier, " \t\r\n") {
		return false
	}
	if !strings.Contains(identifier, "@") {
		return true
	}
	_, err := mail.ParseAddress(identifier)
	return err == nil
}

// ============== VERIFIKASI TOKEN (WAJIB ADA!) ==============
func Verify(c *gin.Context) {
	userID, exists := c.Get("user_id")
	if !exists {
		c.JSON(http.StatusUnauthorized, gin.H{"success": false, "message": "Unauthorized"})
		return
	}

	role, _ := c.Get("role")

	var email string
	var name sql.NullString
	var nim sql.NullString

	err := config.DB.QueryRow(`
		SELECT u.email, COALESCE(m.name, ''), COALESCE(m.nim, '')
		FROM users u
		LEFT JOIN mahasiswa m ON u.id = m.user_id
		WHERE u.id = $1
	`, userID).Scan(&email, &name, &nim)

	if err != nil {
		c.JSON(http.StatusOK, gin.H{
			"success": true,
			"data": gin.H{
				"user": gin.H{
					"id":    userID,
					"email": "",
					"role":  role,
					"name":  "",
					"nim":   "",
				},
			},
		})
		return
	}

	// Get name from appropriate table based on role
	var nameFromTable sql.NullString
	switch role.(string) {
	case "mahasiswa":
		config.DB.QueryRow("SELECT name FROM mahasiswa WHERE user_id = $1", userID).Scan(&nameFromTable)
	case "dosen":
		config.DB.QueryRow("SELECT name FROM dosen WHERE user_id = $1", userID).Scan(&nameFromTable)
	case "admin":
		name = sql.NullString{String: email, Valid: true}
	case "ukm":
		name = sql.NullString{String: email, Valid: true}
	case "ormawa":
		name = sql.NullString{String: email, Valid: true}
	case "orangtua":
		config.DB.QueryRow("SELECT name FROM ortu WHERE user_id = $1", userID).Scan(&nameFromTable)
	}

	if nameFromTable.Valid {
		name = nameFromTable
	}

	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"data": gin.H{
			"user": gin.H{
				"id":    userID,
				"email": email,
				"role":  role.(string),
				"name":  name.String,
				"nim":   nim.String,
			},
		},
	})
}

func Login(c *gin.Context) {
	var input struct {
		Identifier string `json:"identifier"`
		Email      string `json:"email"`
		Password   string `json:"password" binding:"required"`
	}

	if err := c.ShouldBindJSON(&input); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{
			"success": false,
			"message": "Invalid input format",
		})
		return
	}

	identifier := normalizeLoginIdentifier(input.Identifier)
	if identifier == "" {
		identifier = normalizeLoginIdentifier(input.Email)
	}
	if !isValidLoginInput(identifier, input.Password) {
		c.JSON(http.StatusBadRequest, gin.H{
			"success": false,
			"message": "Login gagal. Periksa kembali kredensial Anda.",
		})
		return
	}
	accountIdentifier, allowAccountLookup := getLoginAccountIdentifier(identifier)

	query := `
		SELECT u.id, u.email, u.password, u.role,
		       COALESCE(u.is_email_verified, false) as is_email_verified,
		       COALESCE(m.nim, '') as nim,
		       CASE
		         WHEN u.role = 'mahasiswa' THEN COALESCE(m.name, '')
		         WHEN u.role = 'dosen' THEN COALESCE(d.name, '')
		         WHEN u.role = 'admin' THEN u.email
		         WHEN u.role = 'ukm' THEN u.email
		         WHEN u.role = 'ormawa' THEN u.email
		         WHEN u.role = 'orangtua' THEN COALESCE(ot.name, '')
		         ELSE ''
		       END as name
		FROM users u
		LEFT JOIN mahasiswa m ON u.id = m.user_id
		LEFT JOIN dosen d ON u.id = d.user_id
		LEFT JOIN admin a ON u.id = a.user_id
		LEFT JOIN ukm uk ON u.id = uk.user_id
		LEFT JOIN ormawa o ON u.id = o.user_id
		LEFT JOIN ortu ot ON u.id = ot.user_id
		WHERE LOWER(u.email) = LOWER($1)
		   OR (
		     $2
		     AND (
		       LOWER(SPLIT_PART(u.email, '@', 1)) = LOWER($3)
		       OR m.nim = $3
		       OR d.nip = $3
		       OR LOWER(uk.username) = LOWER($3)
		       OR LOWER(o.username) = LOWER($3)
		     )
		   )
		ORDER BY CASE WHEN LOWER(u.email) = LOWER($1) THEN 0 ELSE 1 END
		LIMIT 1
	`

	var user struct {
		ID       int
		Email    string
		Password string
		Role     string
	}
	var nim sql.NullString
	var name sql.NullString
	var isEmailVerified bool

	err := config.DB.QueryRow(query, identifier, allowAccountLookup, accountIdentifier).Scan(
		&user.ID, &user.Email, &user.Password, &user.Role, &isEmailVerified, &nim, &name,
	)

	if err != nil {
		if err == sql.ErrNoRows {
			c.JSON(http.StatusBadRequest, gin.H{
				"success": false,
				"message": "Login gagal. Periksa kembali kredensial Anda.",
			})
			return
		}
		fmt.Println("Login DB Error:", err)
		c.JSON(http.StatusInternalServerError, gin.H{
			"success": false,
			"message": "Login tidak dapat diproses saat ini.",
		})
		return
	}

	// Cek password
	if err := bcrypt.CompareHashAndPassword([]byte(user.Password), []byte(input.Password)); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{
			"success": false,
			"message": "Login gagal. Periksa kembali kredensial Anda.",
		})
		return
	}

	// Gate login on email verification (students only) when enabled.
	if emailVerificationEnabled() && user.Role == "mahasiswa" && !isEmailVerified {
		c.JSON(http.StatusForbidden, gin.H{
			"success":          false,
			"email_unverified": true,
			"email":            user.Email,
			"message":          "Email belum diverifikasi. Silakan cek email kampus Anda atau kirim ulang tautan verifikasi.",
		})
		return
	}

	// Generate token
	token, err := utils.GenerateToken(user.ID, user.Role)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"success": false,
			"message": "Login tidak dapat diproses saat ini.",
		})
		return
	}

	redirect := getRedirectPath(user.Role)

	// INI YANG PALING PENTING — FORMAT EXACTLY SAMA DENGAN FRONTEND!
	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"data": gin.H{
			"token":    token,
			"role":     user.Role,
			"redirect": redirect,
			"user": gin.H{
				"id":    user.ID,
				"email": user.Email,
				"role":  user.Role,
				"name":  name.String,
				"nim":   nim.String,
			},
		},
	})
}

// ============== REGISTER (SUDAH DIPERBAIKI JUGA) ==============
func Register(c *gin.Context) {
	var input struct {
		Email             string `json:"email" binding:"required,email"`
		Password          string `json:"password" binding:"required,min=6"`
		Name              string `json:"name"`
		Role              string `json:"role" binding:"required"`
		NIM               string `json:"nim,omitempty"`
		VerificationToken string `json:"verification_token,omitempty"`
	}

	if err := c.ShouldBindJSON(&input); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{
			"success": false,
			"message": err.Error(),
		})
		return
	}

	if !isInstitutionalEmail(input.Email) {
		c.JSON(http.StatusBadRequest, gin.H{
			"success": false,
			"message": "Email harus menggunakan domain @nurulfikri.ac.id.",
		})
		return
	}

	input.Role = strings.ToLower(strings.TrimSpace(input.Role))
	input.Email = strings.TrimSpace(input.Email)
	if input.Role != "mahasiswa" {
		c.JSON(http.StatusBadRequest, gin.H{
			"success": false,
			"message": "Registrasi mandiri saat ini hanya tersedia untuk mahasiswa.",
		})
		return
	}

	studentNIM, ok := normalizeStudentNIM(input.NIM)
	if !ok {
		c.JSON(http.StatusBadRequest, gin.H{
			"success": false,
			"message": "Format NIM tidak valid.",
		})
		return
	}

	verifiedStudent, ok := validateStudentVerificationToken(input.VerificationToken, studentNIM)
	if !ok {
		c.JSON(http.StatusBadRequest, gin.H{
			"success": false,
			"message": "Verifikasi NIM belum valid atau sudah kedaluwarsa. Silakan cek NIM ulang.",
		})
		return
	}
	input.Name = verifiedStudent.Name
	input.NIM = verifiedStudent.NIM

	emailLocalPart, _, _ := strings.Cut(input.Email, "@")
	if !strings.EqualFold(emailLocalPart, input.NIM) {
		c.JSON(http.StatusBadRequest, gin.H{
			"success": false,
			"message": "Email kampus harus menggunakan format NIM@nurulfikri.ac.id.",
		})
		return
	}

	if conflict, err := checkRegistrationDuplicate(input.Email, input.NIM); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"success": false, "message": "Gagal memeriksa data registrasi"})
		return
	} else if conflict != "" {
		c.JSON(http.StatusConflict, gin.H{"success": false, "message": conflict})
		return
	}

	hashedPassword, _ := bcrypt.GenerateFromPassword([]byte(input.Password), bcrypt.DefaultCost)

	tx, err := config.DB.Begin()
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"success": false, "message": "Transaction error"})
		return
	}
	defer tx.Rollback()

	// PostgreSQL: use RETURNING id instead of LastInsertId
	var userID int
	err = tx.QueryRow("INSERT INTO users (email, password, role) VALUES ($1, $2, $3) RETURNING id",
		input.Email, hashedPassword, input.Role).Scan(&userID)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"success": false, "message": "Failed to create user"})
		return
	}

	_, err = tx.Exec(`INSERT INTO mahasiswa (user_id, name, nim, nama_pt, prodi, pddikti_verified)
		VALUES ($1, $2, $3, $4, $5, true)`,
		userID, input.Name, input.NIM, verifiedStudent.Institution, verifiedStudent.StudyProgram)
	redirect := "/mahasiswa"

	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"success": false, "message": "Failed to create profile"})
		return
	}

	if err := tx.Commit(); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"success": false, "message": "Commit failed"})
		return
	}

	// Send verification email (best-effort; never blocks registration).
	emailSent := sendVerificationEmailBestEffort(c, userID, input.Email, input.Name)

	// When verification is required, do NOT auto-login: force the student to verify first.
	if emailVerificationEnabled() {
		c.JSON(http.StatusOK, gin.H{
			"success": true,
			"message": "Akun berhasil dibuat. Silakan cek email kampus Anda untuk memverifikasi sebelum masuk.",
			"data": gin.H{
				"email_verification_required": true,
				"email_verification_sent":     emailSent,
				"email":                       input.Email,
				"user": gin.H{
					"id":    userID,
					"email": input.Email,
					"role":  input.Role,
					"name":  input.Name,
					"nim":   input.NIM,
				},
			},
		})
		return
	}

	token, _ := utils.GenerateToken(userID, input.Role)

	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"data": gin.H{
			"token":                   token,
			"role":                    input.Role,
			"redirect":                redirect,
			"email_verification_sent": emailSent,
			"user": gin.H{
				"id":    userID,
				"email": input.Email,
				"role":  input.Role,
				"name":  input.Name,
				"nim":   input.NIM,
			},
		},
	})
}

// ============== HELPER REDIRECT PATH ==============
func getRedirectPath(role string) string {
	switch strings.ToLower(role) {
	case "admin":
		return "/admin"
	case "dosen":
		return "/dosen"
	case "mahasiswa":
		return "/mahasiswa"
	case "orangtua":
		return "/ortu"
	case "ukm":
		return "/ukm"
	case "ormawa":
		return "/ormawa"
	default:
		return "/"
	}
}

// ============== CHANGE PASSWORD ==============
func ChangePassword(c *gin.Context) {
	userID, exists := c.Get("user_id")
	if !exists {
		utils.ErrorResponse(c, http.StatusUnauthorized, "Unauthorized")
		return
	}

	var input struct {
		NewPassword string `json:"new_password" binding:"required,min=6"`
	}
	if err := c.ShouldBindJSON(&input); err != nil {
		utils.ErrorResponse(c, http.StatusBadRequest, "Invalid input: "+err.Error())
		return
	}

	newHash, err := bcrypt.GenerateFromPassword([]byte(input.NewPassword), bcrypt.DefaultCost)
	if err != nil {
		utils.ErrorResponse(c, http.StatusInternalServerError, "Gagal mengenkripsi password")
		return
	}

	_, err = config.DB.Exec("UPDATE users SET password = $1, updated_at = NOW() WHERE id = $2", string(newHash), userID)
	if err != nil {
		utils.ErrorResponse(c, http.StatusInternalServerError, "Gagal menyimpan password baru")
		return
	}

	utils.SuccessResponse(c, nil, "Password berhasil diubah")
}
