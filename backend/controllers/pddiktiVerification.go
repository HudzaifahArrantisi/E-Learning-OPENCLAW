package controllers

import (
	"context"
	"crypto/hmac"
	"crypto/sha256"
	"database/sql"
	"encoding/base64"
	"encoding/json"
	"errors"
	"fmt"
	"io"
	"net/http"
	"os"
	"regexp"
	"strconv"
	"strings"
	"time"

	"nf-student-hub-backend/config"
	"nf-student-hub-backend/utils"

	"github.com/gin-gonic/gin"
)

const (
	defaultPDDiktiVerifyURL       = "https://api-frontend.kemdikbud.go.id/hit_mhs/{nim}"
	defaultPDDiktiTimeout         = 5 * time.Second
	studentVerificationTokenTTL   = 15 * time.Minute
	studentVerificationMaxBody    = 2 << 20
	studentVerificationTokenParts = 2
)

var (
	errPDDiktiUnavailable = errors.New("pddikti verification provider unavailable")
	errPDDiktiNotFound    = errors.New("student not found in pddikti")
	errPDDiktiNotAllowed  = errors.New("student institution is not allowed")
	nimPattern            = regexp.MustCompile(`^[A-Za-z0-9.-]{4,32}$`)
)

type pddiktiStudent struct {
	NIM            string `json:"nim"`
	Name           string `json:"name"`
	Gender         string `json:"gender"`
	Institution    string `json:"institution"`
	EntryDate      string `json:"entry_date"`
	EducationLevel string `json:"education_level"`
	StudyProgram   string `json:"study_program"`
	StudentStatus  string `json:"student_status"`
	RawText        string `json:"-"`
}

type studentVerificationClaims struct {
	NIM            string `json:"nim"`
	Name           string `json:"name"`
	Gender         string `json:"gender"`
	Institution    string `json:"institution"`
	EntryDate      string `json:"entry_date"`
	EducationLevel string `json:"education_level"`
	StudyProgram   string `json:"study_program"`
	StudentStatus  string `json:"student_status"`
	ExpiresAt      int64  `json:"exp"`
}

func VerifyStudentRegistration(c *gin.Context) {
	var input struct {
		NIM string `json:"nim" binding:"required"`
	}
	if err := c.ShouldBindJSON(&input); err != nil {
		utils.ErrorResponse(c, http.StatusBadRequest, "NIM wajib diisi.")
		return
	}

	nim, ok := normalizeStudentNIM(input.NIM)
	if !ok {
		utils.ErrorResponse(c, http.StatusBadRequest, "Format NIM tidak valid.")
		return
	}

	exists, err := isMahasiswaNIMRegistered(nim)
	if err != nil {
		utils.ErrorResponse(c, http.StatusInternalServerError, "Gagal memeriksa NIM.")
		return
	}
	if exists {
		utils.ErrorResponse(c, http.StatusConflict, "NIM ini sudah terdaftar.")
		return
	}

	student, err := lookupPDDiktiStudent(c.Request.Context(), nim)
	if err != nil {
		switch {
		case errors.Is(err, errPDDiktiNotAllowed):
			utils.ErrorResponse(c, http.StatusBadRequest, "NIM valid, tapi bukan mahasiswa STT Nurul Fikri.")
		case errors.Is(err, errPDDiktiNotFound):
			utils.ErrorResponse(c, http.StatusNotFound, "NIM tidak ditemukan di PDDikti.")
		default:
			utils.ErrorResponse(c, http.StatusServiceUnavailable, "Verifikasi PDDikti sedang tidak tersedia. Coba lagi nanti.")
		}
		return
	}

	token, err := issueStudentVerificationToken(student)
	if err != nil {
		utils.ErrorResponse(c, http.StatusInternalServerError, "Gagal membuat token verifikasi.")
		return
	}

	utils.SuccessResponse(c, gin.H{
		"valid":              true,
		"nim":                student.NIM,
		"name":               student.Name,
		"gender":             student.Gender,
		"institution":        student.Institution,
		"entry_date":         student.EntryDate,
		"education_level":    student.EducationLevel,
		"study_program":      student.StudyProgram,
		"student_status":     student.StudentStatus,
		"verification_token": token,
	}, "NIM terverifikasi sebagai mahasiswa STT Terpadu Nurul Fikri.")
}

func VerifyStudentForMahasiswaProfile(c *gin.Context) {
	userID, exists := c.Get("user_id")
	if !exists {
		utils.ErrorResponse(c, http.StatusUnauthorized, "Unauthorized")
		return
	}

	var input struct {
		NIM string `json:"nim" binding:"required"`
	}
	if err := c.ShouldBindJSON(&input); err != nil {
		utils.ErrorResponse(c, http.StatusBadRequest, "NIM wajib diisi.")
		return
	}

	nim, ok := normalizeStudentNIM(input.NIM)
	if !ok {
		utils.ErrorResponse(c, http.StatusBadRequest, "Format NIM tidak valid.")
		return
	}

	available, err := isMahasiswaNIMAvailableForUser(nim, userID)
	if err != nil {
		utils.ErrorResponse(c, http.StatusInternalServerError, "Gagal memeriksa NIM.")
		return
	}
	if !available {
		utils.ErrorResponse(c, http.StatusConflict, "NIM ini sudah digunakan oleh mahasiswa lain.")
		return
	}

	student, err := lookupPDDiktiStudent(c.Request.Context(), nim)
	if err != nil {
		switch {
		case errors.Is(err, errPDDiktiNotAllowed):
			utils.ErrorResponse(c, http.StatusBadRequest, "NIM valid, tapi bukan mahasiswa STT Nurul Fikri.")
		case errors.Is(err, errPDDiktiNotFound):
			utils.ErrorResponse(c, http.StatusNotFound, "NIM tidak ditemukan di PDDikti.")
		default:
			utils.ErrorResponse(c, http.StatusServiceUnavailable, "Verifikasi PDDikti sedang tidak tersedia. Coba lagi nanti.")
		}
		return
	}

	token, err := issueStudentVerificationToken(student)
	if err != nil {
		utils.ErrorResponse(c, http.StatusInternalServerError, "Gagal membuat token verifikasi.")
		return
	}

	utils.SuccessResponse(c, gin.H{
		"valid":              true,
		"nim":                student.NIM,
		"name":               student.Name,
		"gender":             student.Gender,
		"institution":        student.Institution,
		"entry_date":         student.EntryDate,
		"education_level":    student.EducationLevel,
		"study_program":      student.StudyProgram,
		"student_status":     student.StudentStatus,
		"verification_token": token,
	}, "NIM terverifikasi sebagai mahasiswa STT Terpadu Nurul Fikri.")
}

func normalizeStudentNIM(value string) (string, bool) {
	nim := strings.ToUpper(strings.TrimSpace(value))
	nim = strings.ReplaceAll(nim, " ", "")
	if !nimPattern.MatchString(nim) {
		return "", false
	}
	return nim, true
}

func validateStudentVerificationToken(token, nim string) (pddiktiStudent, bool) {
	claims, ok := parseStudentVerificationToken(token)
	if !ok {
		return pddiktiStudent{}, false
	}
	normalizedNIM, ok := normalizeStudentNIM(nim)
	if !ok || claims.NIM != normalizedNIM || claims.ExpiresAt < time.Now().Unix() {
		return pddiktiStudent{}, false
	}
	if !isAllowedInstitution(claims.Institution) {
		return pddiktiStudent{}, false
	}
	return pddiktiStudent{
		NIM:            claims.NIM,
		Name:           claims.Name,
		Gender:         claims.Gender,
		Institution:    claims.Institution,
		EntryDate:      claims.EntryDate,
		EducationLevel: claims.EducationLevel,
		StudyProgram:   claims.StudyProgram,
		StudentStatus:  claims.StudentStatus,
	}, true
}

func issueStudentVerificationToken(student pddiktiStudent) (string, error) {
	claims := studentVerificationClaims{
		NIM:            student.NIM,
		Name:           student.Name,
		Gender:         student.Gender,
		Institution:    student.Institution,
		EntryDate:      student.EntryDate,
		EducationLevel: student.EducationLevel,
		StudyProgram:   student.StudyProgram,
		StudentStatus:  student.StudentStatus,
		ExpiresAt:      time.Now().Add(studentVerificationTokenTTL).Unix(),
	}
	payload, err := json.Marshal(claims)
	if err != nil {
		return "", err
	}
	payloadPart := base64.RawURLEncoding.EncodeToString(payload)
	signature := signStudentVerificationPayload(payloadPart)
	return payloadPart + "." + signature, nil
}

func parseStudentVerificationToken(token string) (studentVerificationClaims, bool) {
	parts := strings.Split(token, ".")
	if len(parts) != studentVerificationTokenParts {
		return studentVerificationClaims{}, false
	}
	expected := signStudentVerificationPayload(parts[0])
	if !hmac.Equal([]byte(expected), []byte(parts[1])) {
		return studentVerificationClaims{}, false
	}
	payload, err := base64.RawURLEncoding.DecodeString(parts[0])
	if err != nil {
		return studentVerificationClaims{}, false
	}
	var claims studentVerificationClaims
	if err := json.Unmarshal(payload, &claims); err != nil {
		return studentVerificationClaims{}, false
	}
	return claims, true
}

func signStudentVerificationPayload(payload string) string {
	mac := hmac.New(sha256.New, []byte(getStudentVerificationSecret()))
	mac.Write([]byte(payload))
	return base64.RawURLEncoding.EncodeToString(mac.Sum(nil))
}

func getStudentVerificationSecret() string {
	if secret := strings.TrimSpace(os.Getenv("PDDIKTI_VERIFICATION_SECRET")); secret != "" {
		return secret
	}
	if secret := strings.TrimSpace(os.Getenv("JWT_SECRET")); secret != "" {
		return secret
	}
	return "nf-student-hub-local-student-verification"
}

func lookupPDDiktiStudent(ctx context.Context, nim string) (pddiktiStudent, error) {
	endpoint := strings.TrimSpace(os.Getenv("PDDIKTI_VERIFY_URL"))
	if endpoint == "" {
		endpoint = defaultPDDiktiVerifyURL
	}

	reqURL := strings.ReplaceAll(endpoint, "{nim}", nim)
	if reqURL == endpoint && !strings.Contains(endpoint, "{nim}") {
		separator := "?"
		if strings.Contains(endpoint, "?") {
			separator = "&"
		}
		reqURL = endpoint + separator + "nim=" + nim
	}

	timeout := getPDDiktiTimeout()
	reqCtx, cancel := context.WithTimeout(ctx, timeout)
	defer cancel()

	req, err := http.NewRequestWithContext(reqCtx, http.MethodGet, reqURL, nil)
	if err != nil {
		return pddiktiStudent{}, errPDDiktiUnavailable
	}
	req.Header.Set("Accept", "application/json")
	req.Header.Set("User-Agent", "NF-Student-HUB/1.0")

	resp, err := http.DefaultClient.Do(req)
	if err != nil {
		return pddiktiStudent{}, errPDDiktiUnavailable
	}
	defer resp.Body.Close()

	if resp.StatusCode < 200 || resp.StatusCode >= 300 {
		return pddiktiStudent{}, errPDDiktiUnavailable
	}

	body, err := io.ReadAll(io.LimitReader(resp.Body, studentVerificationMaxBody))
	if err != nil {
		return pddiktiStudent{}, errPDDiktiUnavailable
	}

	var raw interface{}
	if err := json.Unmarshal(body, &raw); err != nil {
		return pddiktiStudent{}, errPDDiktiUnavailable
	}

	candidates := collectPDDiktiStudentCandidates(raw, nim)
	if len(candidates) == 0 {
		return pddiktiStudent{}, errPDDiktiNotFound
	}

	for _, candidate := range candidates {
		candidate.NIM, _ = normalizeStudentNIM(firstNonEmpty(candidate.NIM, nim))
		if candidate.Name == "" {
			candidate.Name = inferNameFromRawText(candidate.RawText, candidate.NIM)
		}
		if isAllowedInstitution(candidate.Institution) && candidate.Name != "" {
			return candidate, nil
		}
	}

	return pddiktiStudent{}, errPDDiktiNotAllowed
}

func getPDDiktiTimeout() time.Duration {
	raw := strings.TrimSpace(os.Getenv("PDDIKTI_TIMEOUT_MS"))
	if raw == "" {
		return defaultPDDiktiTimeout
	}
	ms, err := strconv.Atoi(raw)
	if err != nil || ms <= 0 {
		return defaultPDDiktiTimeout
	}
	return time.Duration(ms) * time.Millisecond
}

func collectPDDiktiStudentCandidates(raw interface{}, nim string) []pddiktiStudent {
	var candidates []pddiktiStudent
	var walk func(interface{})
	walk = func(node interface{}) {
		switch value := node.(type) {
		case []interface{}:
			for _, item := range value {
				walk(item)
			}
		case map[string]interface{}:
			candidate := candidateFromPDDiktiMap(value, nim)
			if candidate.NIM != "" || strings.Contains(candidate.RawText, nim) {
				candidates = append(candidates, candidate)
			}
			for _, item := range value {
				walk(item)
			}
		}
	}
	walk(raw)
	return candidates
}

func candidateFromPDDiktiMap(item map[string]interface{}, nim string) pddiktiStudent {
	lower := make(map[string]string, len(item))
	for key, value := range item {
		lower[strings.ToLower(key)] = fmt.Sprint(value)
	}

	rawText := firstNonEmpty(
		lower["text"],
		lower["label"],
		lower["nama"],
		lower["nama_mahasiswa"],
		lower["nm_pd"],
		lower["message"],
	)
	candidate := pddiktiStudent{
		NIM: firstNonEmpty(
			lower["nim"],
			lower["nipd"],
			lower["npm"],
			lower["nomor_induk"],
		),
		Name: firstNonEmpty(
			lower["nama"],
			lower["nama_mahasiswa"],
			lower["nm_pd"],
			lower["name"],
		),
		Gender: normalizeGender(firstNonEmpty(
			lower["jenis_kelamin"],
			lower["jk"],
			lower["kelamin"],
			lower["gender"],
			lower["sex"],
		)),
		Institution: firstNonEmpty(
			lower["nama_pt"],
			lower["perguruan_tinggi"],
			lower["nama_perguruan_tinggi"],
			lower["pt"],
			lower["kampus"],
			lower["institution"],
		),
		EntryDate: normalizeEntryDate(firstNonEmpty(
			lower["tanggal_masuk"],
			lower["tgl_masuk"],
			lower["tanggal_masuk_kuliah"],
			lower["tgl_masuk_kuliah"],
			lower["mulai_smt"],
			lower["periode_masuk"],
			lower["tahun_masuk"],
			lower["angkatan"],
		)),
		EducationLevel: firstNonEmpty(
			lower["jenjang"],
			lower["jenjang_pendidikan"],
			lower["strata"],
			lower["program"],
		),
		StudyProgram: firstNonEmpty(
			lower["nama_prodi"],
			lower["prodi"],
			lower["program_studi"],
			lower["programstudi"],
		),
		StudentStatus: firstNonEmpty(
			lower["status_mahasiswa"],
			lower["status_terakhir_mahasiswa"],
			lower["status_terakhir"],
			lower["status_saat_ini"],
			lower["status"],
			lower["ket_keluar"],
		),
		RawText: rawText,
	}

	if candidate.NIM == "" && strings.Contains(rawText, nim) {
		candidate.NIM = nim
	}
	if candidate.NIM == "" && isKnownRejectedPDDiktiStudent(lower, candidate.Institution) {
		candidate.NIM = nim
	}
	if candidate.Institution == "" {
		candidate.Institution = inferInstitutionFromRawText(rawText)
	}
	if candidate.StudyProgram == "" {
		candidate.StudyProgram = inferStudyProgramFromRawText(rawText)
	}
	if candidate.EducationLevel == "" {
		candidate.EducationLevel = inferEducationLevel(candidate.StudyProgram)
	}
	return candidate
}

func normalizeGender(value string) string {
	normalized := strings.ToLower(strings.TrimSpace(value))
	switch normalized {
	case "l", "laki-laki", "laki laki", "male", "m":
		return "Laki-laki"
	case "p", "perempuan", "female", "f":
		return "Perempuan"
	default:
		return strings.TrimSpace(value)
	}
}

func normalizeEntryDate(value string) string {
	value = strings.TrimSpace(value)
	if value == "" {
		return ""
	}
	digitOnly := regexp.MustCompile(`\D`).ReplaceAllString(value, "")
	if len(digitOnly) >= 8 {
		year := digitOnly[:4]
		month := digitOnly[4:6]
		day := digitOnly[6:8]
		if _, err := time.Parse("2006-01-02", year+"-"+month+"-"+day); err == nil {
			return year + "-" + month + "-" + day
		}
	}
	if len(digitOnly) == 6 {
		return digitOnly[:4] + "-" + digitOnly[4:6]
	}
	if len(digitOnly) == 4 {
		return digitOnly
	}
	for _, layout := range []string{"2006-01-02", "02-01-2006", "02/01/2006", "2006/01/02"} {
		if parsed, err := time.Parse(layout, value); err == nil {
			return parsed.Format("2006-01-02")
		}
	}
	return value
}

func inferEducationLevel(studyProgram string) string {
	normalized := strings.ToLower(studyProgram)
	if strings.Contains(normalized, "s1") || strings.Contains(normalized, "sarjana") {
		return "S1"
	}
	if strings.Contains(normalized, "d3") || strings.Contains(normalized, "diploma tiga") {
		return "D3"
	}
	if strings.Contains(normalized, "d4") || strings.Contains(normalized, "sarjana terapan") {
		return "D4"
	}
	return ""
}

func isKnownRejectedPDDiktiStudent(fields map[string]string, institution string) bool {
	if institution == "" {
		return false
	}
	valid := strings.ToLower(strings.TrimSpace(fields["valid"]))
	if valid != "false" && valid != "0" {
		return false
	}
	message := strings.ToLower(fields["message"])
	return strings.Contains(message, "bukan") || strings.Contains(message, "terdaftar")
}

func inferNameFromRawText(text, nim string) string {
	text = strings.TrimSpace(text)
	if text == "" {
		return ""
	}
	withoutNIM := strings.ReplaceAll(text, nim, "")
	parts := strings.FieldsFunc(withoutNIM, func(r rune) bool {
		return r == ',' || r == '-' || r == '|' || r == '(' || r == ')'
	})
	for _, part := range parts {
		part = strings.TrimSpace(part)
		if part != "" && !strings.Contains(strings.ToLower(part), "sekolah tinggi") && !strings.Contains(strings.ToLower(part), "universitas") {
			return part
		}
	}
	return text
}

func inferInstitutionFromRawText(text string) string {
	normalized := normalizeInstitution(text)
	for _, allowed := range allowedInstitutionNames() {
		if strings.Contains(normalized, normalizeInstitution(allowed)) {
			return allowed
		}
	}
	return ""
}

func inferStudyProgramFromRawText(text string) string {
	parts := strings.Split(text, ",")
	if len(parts) >= 3 {
		return strings.TrimSpace(parts[len(parts)-1])
	}
	return ""
}

func isAllowedInstitution(value string) bool {
	normalized := normalizeInstitution(value)
	if normalized == "" {
		return false
	}
	for _, allowed := range allowedInstitutionNames() {
		allowedNormalized := normalizeInstitution(allowed)
		if normalized == allowedNormalized || strings.Contains(normalized, allowedNormalized) {
			return true
		}
	}
	return false
}

func allowedInstitutionNames() []string {
	raw := strings.TrimSpace(os.Getenv("PDDIKTI_ALLOWED_INSTITUTIONS"))
	if raw == "" {
		return []string{
			"Sekolah Tinggi Teknologi Terpadu Nurul Fikri",
			"STT Terpadu Nurul Fikri",
			"STT Nurul Fikri",
			"STT-NF",
		}
	}
	parts := strings.Split(raw, ",")
	var names []string
	for _, part := range parts {
		if name := strings.TrimSpace(part); name != "" {
			names = append(names, name)
		}
	}
	return names
}

func normalizeInstitution(value string) string {
	value = strings.ToLower(strings.TrimSpace(value))
	replacer := strings.NewReplacer(".", " ", ",", " ", "-", " ", "_", " ", "(", " ", ")", " ")
	value = replacer.Replace(value)
	value = strings.Join(strings.Fields(value), " ")
	return value
}

func firstNonEmpty(values ...string) string {
	for _, value := range values {
		if trimmed := strings.TrimSpace(value); trimmed != "" && trimmed != "<nil>" {
			return trimmed
		}
	}
	return ""
}

func checkRegistrationDuplicate(email, nim string) (string, error) {
	var exists bool
	if nim != "" {
		var err error
		exists, err = isMahasiswaNIMRegistered(nim)
		if err != nil && err != sql.ErrNoRows {
			return "", err
		}
		if exists {
			return "NIM ini sudah terdaftar.", nil
		}
	}
	if err := config.DB.QueryRow("SELECT EXISTS(SELECT 1 FROM users WHERE LOWER(email) = LOWER($1))", email).Scan(&exists); err != nil {
		return "", err
	}
	if exists {
		return "Email ini sudah terdaftar.", nil
	}
	return "", nil
}

func isMahasiswaNIMRegistered(nim string) (bool, error) {
	var exists bool
	err := config.DB.QueryRow(`
		SELECT EXISTS(
			SELECT 1
			FROM mahasiswa m
			JOIN users u ON u.id = m.user_id
			WHERE m.nim = $1 AND LOWER(u.role) = 'mahasiswa'
			UNION ALL
			SELECT 1
			FROM users u
			WHERE LOWER(u.role) = 'mahasiswa'
			  AND LOWER(SPLIT_PART(u.email, '@', 1)) = LOWER($1)
			  AND LOWER(SPLIT_PART(u.email, '@', 2)) = 'nurulfikri.ac.id'
		)
	`, nim).Scan(&exists)
	return exists, err
}

func isMahasiswaNIMAvailableForUser(nim string, userID interface{}) (bool, error) {
	var existsOther bool
	err := config.DB.QueryRow(`
		SELECT EXISTS(
			SELECT 1
			FROM mahasiswa m
			JOIN users u ON u.id = m.user_id
			WHERE LOWER(m.nim) = LOWER($1)
			  AND LOWER(u.role) = 'mahasiswa'
			  AND m.user_id <> $2
			UNION ALL
			SELECT 1
			FROM users u
			WHERE LOWER(u.role) = 'mahasiswa'
			  AND LOWER(SPLIT_PART(u.email, '@', 1)) = LOWER($1)
			  AND LOWER(SPLIT_PART(u.email, '@', 2)) = 'nurulfikri.ac.id'
			  AND u.id <> $2
		)
	`, nim, userID).Scan(&existsOther)
	return !existsOther, err
}
