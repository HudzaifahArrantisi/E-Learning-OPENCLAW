package controllers

import (
	"database/sql"
	"fmt"
	"net/http"
	"net/mail"
	"regexp"
	"strconv"
	"strings"
	"time"

	"nf-student-hub-backend/config"
	"nf-student-hub-backend/utils"

	"github.com/gin-gonic/gin"
	"golang.org/x/crypto/bcrypt"
)

const nurulFikriDomain = "@nurulfikri.ac.id"

const (
	minAcademicSemester = 1
	maxAcademicSemester = 14
)

var validSpecializations = map[string]string{
	"cyber_security": "peminatan_cs",
	"ai":             "peminatan_ai",
}

var (
	classNumberPattern = regexp.MustCompile(`\d{1,2}`)
	classLetterPattern = regexp.MustCompile(`[A-Z]`)
)

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

func GetRegistrationOptions(c *gin.Context) {
	prodi := strings.TrimSpace(c.Query("prodi"))
	semester, err := strconv.Atoi(strings.TrimSpace(c.Query("semester")))
	if err != nil || !isValidAcademicSemester(semester) {
		utils.ValidationError(c, "Semester harus diisi dengan angka 1 sampai 8.")
		return
	}
	angkatan, err := strconv.Atoi(strings.TrimSpace(c.Query("angkatan")))
	if err != nil || !isValidAngkatan(angkatan) {
		utils.ValidationError(c, "Angkatan harus diisi dengan tahun yang valid.")
		return
	}
	if prodi == "" {
		utils.ValidationError(c, "Prodi wajib diisi.")
		return
	}

	specializations := []gin.H{}
	if requiresSpecialization(semester) {
		specializations = []gin.H{
			{"value": "cyber_security", "label": "Cyber Security"},
			{"value": "ai", "label": "Artificial Intelligence"},
		}
	}

	classPrefix := classPrefixForProgram(prodi)
	utils.SuccessResponse(c, gin.H{
		"specializations": specializations,
		"class_prefix":    classPrefix,
		"class_example":   classPrefix + "-03",
	}, "Registration options retrieved")
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
		Semester          int    `json:"semester" binding:"required"`
		Angkatan          int    `json:"angkatan" binding:"required"`
		Peminatan         string `json:"peminatan,omitempty"`
		Kelas             string `json:"kelas" binding:"required"`
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
	input.Peminatan = strings.ToLower(strings.TrimSpace(input.Peminatan))
	if input.Role != "mahasiswa" {
		c.JSON(http.StatusBadRequest, gin.H{
			"success": false,
			"message": "Registrasi mandiri saat ini hanya tersedia untuk mahasiswa.",
		})
		return
	}

	if !isValidAcademicSemester(input.Semester) {
		c.JSON(http.StatusBadRequest, gin.H{"success": false, "message": "Semester harus 1 sampai 8."})
		return
	}
	if !isValidAngkatan(input.Angkatan) {
		c.JSON(http.StatusBadRequest, gin.H{"success": false, "message": "Angkatan tidak valid."})
		return
	}
	courseCategory, errMsg := resolveSpecializationCategory(input.Semester, input.Peminatan)
	if errMsg != "" {
		c.JSON(http.StatusBadRequest, gin.H{"success": false, "message": errMsg})
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

	kelasCode, errMsg := normalizeClassCodeForProgram(input.Kelas, verifiedStudent.StudyProgram)
	if errMsg != "" {
		c.JSON(http.StatusBadRequest, gin.H{"success": false, "message": errMsg})
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

	var mahasiswaID int
	err = tx.QueryRow(`INSERT INTO mahasiswa
		(user_id, name, nim, nama_pt, prodi, semester, angkatan, peminatan, kelas, pddikti_verified)
		VALUES ($1, $2, $3, $4, $5, $6, $7, NULLIF($8, ''), $9, true)
		RETURNING id`,
		userID, input.Name, input.NIM, verifiedStudent.Institution, verifiedStudent.StudyProgram,
		input.Semester, input.Angkatan, input.Peminatan, kelasCode).Scan(&mahasiswaID)
	redirect := "/mahasiswa"

	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"success": false, "message": "Failed to create profile"})
		return
	}

	enrolledCourses, err := enrollMahasiswaCourses(tx, mahasiswaID, input.Semester, courseCategory)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"success": false, "message": "Gagal memasukkan mata kuliah mahasiswa"})
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
					"id":        userID,
					"email":     input.Email,
					"role":      input.Role,
					"name":      input.Name,
					"nim":       input.NIM,
					"prodi":     verifiedStudent.StudyProgram,
					"semester":  input.Semester,
					"angkatan":  input.Angkatan,
					"peminatan": input.Peminatan,
					"kelas":     kelasCode,
				},
				"enrolled_courses": enrolledCourses,
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
				"id":        userID,
				"email":     input.Email,
				"role":      input.Role,
				"name":      input.Name,
				"nim":       input.NIM,
				"prodi":     verifiedStudent.StudyProgram,
				"semester":  input.Semester,
				"angkatan":  input.Angkatan,
				"peminatan": input.Peminatan,
				"kelas":     kelasCode,
			},
			"enrolled_courses": enrolledCourses,
		},
	})
}

func isValidAcademicSemester(value int) bool {
	return value >= minAcademicSemester && value <= maxAcademicSemester
}

func isValidAngkatan(value int) bool {
	return value >= 2000 && value <= time.Now().Year()+1
}

func requiresSpecialization(semester int) bool {
	return semester >= 3
}

func resolveSpecializationCategory(semester int, peminatan string) (string, string) {
	if !requiresSpecialization(semester) {
		return "", ""
	}
	category, ok := validSpecializations[peminatan]
	if !ok {
		return "", "Peminatan wajib dipilih untuk semester 3 ke atas."
	}
	return category, ""
}

func classPrefixForProgram(prodi string) string {
	normalized := strings.ToLower(strings.TrimSpace(prodi))
	normalized = strings.Join(strings.Fields(normalized), " ")
	switch {
	case strings.Contains(normalized, "teknik informatika"):
		return "TI"
	case strings.Contains(normalized, "sistem informasi"):
		return "SI"
	case strings.Contains(normalized, "bisnis digital"):
		return "BD"
	}

	words := strings.Fields(strings.NewReplacer("-", " ", "_", " ").Replace(strings.ToUpper(prodi)))
	var initials strings.Builder
	for _, word := range words {
		if word != "" {
			initials.WriteByte(word[0])
		}
		if initials.Len() == 3 {
			break
		}
	}
	if initials.Len() == 0 {
		return "KLS"
	}
	return initials.String()
}

func normalizeClassCodeForProgram(value, prodi string) (string, string) {
	prefix := classPrefixForProgram(prodi)
	raw := strings.ToUpper(strings.TrimSpace(value))
	raw = strings.ReplaceAll(raw, "_", "-")
	raw = strings.ReplaceAll(raw, " ", "-")
	if raw == "" {
		return "", "Kelas wajib diisi."
	}

	number := classNumberPattern.FindString(raw)
	if number == "" {
		return "", fmt.Sprintf("Format kelas harus %s-angka, contoh %s-03.", prefix, prefix)
	}
	if len(number) == 1 {
		number = "0" + number
	}

	compact := strings.ReplaceAll(raw, "-", "")
	if strings.HasPrefix(compact, prefix) || !classLetterPattern.MatchString(strings.Trim(compact, "0123456789")) {
		return prefix + "-" + number, ""
	}

	return "", fmt.Sprintf("Kelas untuk prodi ini harus diawali %s, contoh %s-03.", prefix, prefix)
}

func enrollMahasiswaCourses(tx *sql.Tx, mahasiswaID, semester int, peminatanCategory string) (int, error) {
	args := []interface{}{mahasiswaID, semester}
	categoryFilter := "COALESCE(kategori, 'wajib') = 'wajib'"
	if peminatanCategory != "" {
		args = append(args, peminatanCategory)
		categoryFilter = "(COALESCE(kategori, 'wajib') = 'wajib' OR kategori = $3)"
	}

	query := fmt.Sprintf(`
		INSERT INTO mahasiswa_mata_kuliah (mahasiswa_id, mata_kuliah_kode, status)
		SELECT $1, kode, 'active'
		FROM mata_kuliah
		WHERE semester = $2
		  AND deleted_at IS NULL
		  AND %s
		ON CONFLICT DO NOTHING
	`, categoryFilter)

	result, err := tx.Exec(query, args...)
	if err != nil {
		return 0, err
	}
	count, err := result.RowsAffected()
	if err != nil {
		return 0, nil
	}
	return int(count), nil
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
