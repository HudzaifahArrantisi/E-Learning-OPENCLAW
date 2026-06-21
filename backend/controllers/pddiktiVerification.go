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
	NIM          string `json:"nim"`
	Name         string `json:"name"`
	Institution  string `json:"institution"`
	StudyProgram string `json:"study_program"`
	RawText      string `json:"-"`
}

type studentVerificationClaims struct {
	NIM          string `json:"nim"`
	Name         string `json:"name"`
	Institution  string `json:"institution"`
	StudyProgram string `json:"study_program"`
	ExpiresAt    int64  `json:"exp"`
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
		"institution":        student.Institution,
		"study_program":      student.StudyProgram,
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
		NIM:          claims.NIM,
		Name:         claims.Name,
		Institution:  claims.Institution,
		StudyProgram: claims.StudyProgram,
	}, true
}

func issueStudentVerificationToken(student pddiktiStudent) (string, error) {
	claims := studentVerificationClaims{
		NIM:          student.NIM,
		Name:         student.Name,
		Institution:  student.Institution,
		StudyProgram: student.StudyProgram,
		ExpiresAt:    time.Now().Add(studentVerificationTokenTTL).Unix(),
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
		Institution: firstNonEmpty(
			lower["nama_pt"],
			lower["perguruan_tinggi"],
			lower["nama_perguruan_tinggi"],
			lower["pt"],
			lower["kampus"],
			lower["institution"],
		),
		StudyProgram: firstNonEmpty(
			lower["nama_prodi"],
			lower["prodi"],
			lower["program_studi"],
			lower["programstudi"],
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
	return candidate
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
