package controllers

import (
	"database/sql"
	"fmt"
	"log"
	"net/http"
	"strconv"
	"strings"
	"time"

	"nf-student-hub-backend/config"
	"nf-student-hub-backend/utils"

	"github.com/gin-gonic/gin"
)

func normalizeHariIndonesia(hari string) (string, bool) {
	normalized := strings.ToLower(strings.TrimSpace(hari))
	dayMap := map[string]string{
		"senin":  "Senin",
		"selasa": "Selasa",
		"rabu":   "Rabu",
		"kamis":  "Kamis",
		"jumat":  "Jumat",
		"sabtu":  "Sabtu",
		"minggu": "Minggu",
	}

	value, ok := dayMap[normalized]
	return value, ok
}

// GetMahasiswaProfile - Get mahasiswa profile
func GetMahasiswaProfile(c *gin.Context) {
	userID, exists := c.Get("user_id")
	if !exists {
		utils.ErrorResponse(c, http.StatusUnauthorized, "Unauthorized")
		return
	}

	var mahasiswa struct {
		ID     int    `json:"id"`
		Name   string `json:"name"`
		NIM    string `json:"nim"`
		Alamat string `json:"alamat"`
		Photo  string `json:"photo"`
		Email  string `json:"email"`
	}

	// Query dengan LEFT JOIN ke tabel users agar tetap dapat info email jika record mahasiswa belum ada
	err := config.DB.QueryRow(`
		SELECT COALESCE(m.id, 0), COALESCE(m.name, 'Mahasiswa'), COALESCE(m.nim, ''), 
		       COALESCE(m.alamat, ''), COALESCE(m.photo, ''), u.email
		FROM users u
		LEFT JOIN mahasiswa m ON u.id = m.user_id
		WHERE u.id = $1
	`, userID).Scan(&mahasiswa.ID, &mahasiswa.Name, &mahasiswa.NIM, &mahasiswa.Alamat, &mahasiswa.Photo, &mahasiswa.Email)

	if err != nil {
		utils.ErrorResponse(c, http.StatusNotFound, "User not found")
		return
	}

	utils.SuccessResponse(c, mahasiswa, "Profile retrieved")
}

// GetMahasiswaStats - Dashboard statistics for mahasiswa
func GetMahasiswaStats(c *gin.Context) {
	userID, exists := c.Get("user_id")
	if !exists {
		utils.ErrorResponse(c, http.StatusUnauthorized, "Unauthorized")
		return
	}

	// Get mahasiswa ID
	var mahasiswaID int
	err := config.DB.QueryRow("SELECT id FROM mahasiswa WHERE user_id = $1", userID).Scan(&mahasiswaID)
	if err != nil {
		// If not found in mahasiswa table, return empty stats instead of 404
		utils.SuccessResponse(c, gin.H{
			"total_courses":     0,
			"total_assignments": 0,
			"pending_tasks":     0,
			"attendance_rate":   0,
		}, "Stats empty (Profile not initialized)")
		return
	}

	var totalCourses, totalAssignments, pendingTasks int
	var attendanceRate float64

	// 1. Total Courses
	config.DB.QueryRow("SELECT COUNT(*) FROM mahasiswa_mata_kuliah WHERE mahasiswa_id = $1", mahasiswaID).Scan(&totalCourses)

	// 2. Total Assignments
	config.DB.QueryRow(`
		SELECT COUNT(*) FROM tugas t
		JOIN mahasiswa_mata_kuliah mmk ON t.course_id = mmk.mata_kuliah_kode
		WHERE mmk.mahasiswa_id = $1 AND t.type = 'tugas' AND t.deleted_at IS NULL
	`, mahasiswaID).Scan(&totalAssignments)

	// 3. Pending Tasks (not submitted yet)
	config.DB.QueryRow(`
		SELECT COUNT(*) FROM tugas t
		JOIN mahasiswa_mata_kuliah mmk ON t.course_id = mmk.mata_kuliah_kode
		WHERE mmk.mahasiswa_id = $1 AND t.type = 'tugas' AND t.deleted_at IS NULL
		AND NOT EXISTS (SELECT 1 FROM submissions s WHERE s.task_id = t.id AND s.student_id = $2)
	`, mahasiswaID, mahasiswaID).Scan(&pendingTasks)

	// 4. Attendance Rate
	config.DB.QueryRow(`
		SELECT 
			CASE WHEN COUNT(DISTINCT asess.id) > 0 
				 THEN (COUNT(DISTINCT a.id)::float / COUNT(DISTINCT asess.id)::float) * 100 
				 ELSE 0 
			END as rate
		FROM attendance_sessions asess
		JOIN mahasiswa_mata_kuliah mmk ON asess.course_id = mmk.mata_kuliah_kode
		LEFT JOIN attendance a ON asess.id = a.session_id AND a.student_id = mmk.mahasiswa_id
		WHERE mmk.mahasiswa_id = $1
	`, mahasiswaID).Scan(&attendanceRate)

	utils.SuccessResponse(c, gin.H{
		"total_courses":     totalCourses,
		"total_assignments": totalAssignments,
		"pending_tasks":     pendingTasks,
		"attendance_rate":   attendanceRate,
	}, "Mahasiswa statistics retrieved")
}

// UpdateMahasiswaProfile - Update mahasiswa profile dengan support file upload
func UpdateMahasiswaProfile(c *gin.Context) {
	userID, exists := c.Get("user_id")
	if !exists {
		utils.ErrorResponse(c, http.StatusUnauthorized, "Unauthorized")
		return
	}

	// Parse multipart form
	if err := c.Request.ParseMultipartForm(32 << 20); err != nil {
		utils.ErrorResponse(c, http.StatusBadRequest, "Failed to parse form data: "+err.Error())
		return
	}

	name := c.Request.FormValue("name")
	nim := c.Request.FormValue("nim")
	alamat := c.Request.FormValue("alamat")

	if name == "" || nim == "" {
		utils.ErrorResponse(c, http.StatusBadRequest, "Name and NIM are required")
		return
	}

	// Handle file upload ke database (BYTEA)
	var photoPath string
	if _, _, fErr := c.Request.FormFile("photo"); fErr == nil {
		uid, _ := userID.(int)
		_, fileURL, uploadErr := UploadFileToDB(c, "photo", uid, "mahasiswa", "profile", nil, nil)
		if uploadErr != nil {
			utils.ErrorResponse(c, http.StatusBadRequest, uploadErr.Error())
			return
		}
		photoPath = fileURL
		log.Printf("[Profile] Photo uploaded to DB: %s", fileURL)
	}

	// Update database
	var errExec error
	if photoPath != "" {
		// Jika ada foto baru, update termasuk photo
		_, errExec = config.DB.Exec(`
			UPDATE mahasiswa 
			SET name = $1, nim = $2, alamat = $3, photo = $4, updated_at = NOW() 
			WHERE user_id = $5
		`, name, nim, alamat, photoPath, userID)
	} else {
		// Jika tidak ada foto baru, update tanpa photo
		_, errExec = config.DB.Exec(`
			UPDATE mahasiswa 
			SET name = $1, nim = $2, alamat = $3, updated_at = NOW() 
			WHERE user_id = $4
		`, name, nim, alamat, userID)
	}

	if errExec != nil {
		utils.ErrorResponse(c, http.StatusInternalServerError, "Failed to update profile: "+errExec.Error())
		return
	}

	utils.SuccessResponse(c, nil, "Profile updated successfully")
}

// GetMahasiswaCoursesByDay - Get mata kuliah berdasarkan hari (untuk filter)
func GetMahasiswaCoursesByDay(c *gin.Context) {
	userID, exists := c.Get("user_id")
	if !exists {
		utils.ErrorResponse(c, http.StatusUnauthorized, "Unauthorized")
		return
	}

	hariParam := c.Param("hari")
	if strings.TrimSpace(hariParam) == "" {
		utils.ValidationError(c, "Hari is required")
		return
	}

	hari, ok := normalizeHariIndonesia(hariParam)
	if !ok {
		utils.ValidationError(c, "Hari tidak valid. Gunakan: Senin, Selasa, Rabu, Kamis, Jumat, Sabtu, Minggu")
		return
	}

	// Get mahasiswa ID
	var mahasiswaID int
	err := config.DB.QueryRow("SELECT id FROM mahasiswa WHERE user_id = $1", userID).Scan(&mahasiswaID)
	if err != nil {
		utils.ErrorResponse(c, http.StatusNotFound, "Mahasiswa not found")
		return
	}

	// Query mata kuliah berdasarkan hari
	mahasiswaIDStr := strconv.Itoa(mahasiswaID)
	query := `
		SELECT DISTINCT
			mk.kode, 
			mk.nama, 
			d.name as dosen, 
			mk.sks, 
			mk.hari, 
			mk.jam_mulai, 
			mk.jam_selesai,
			COALESCE(a.status, 'belum_absen') as status_absen,
			COALESCE(TO_CHAR(a.created_at, 'HH24:MI'), '') as waktu_absen,
			COUNT(DISTINCT mmk2.mahasiswa_id) as total_mahasiswa
		FROM mata_kuliah mk
		JOIN dosen d ON mk.dosen_id = d.id
		JOIN mahasiswa_mata_kuliah mmk ON mk.kode = mmk.mata_kuliah_kode
		JOIN mahasiswa_mata_kuliah mmk2 ON mk.kode = mmk2.mata_kuliah_kode
		LEFT JOIN (
			SELECT DISTINCT a.student_id::text as student_id, asess.course_id, a.status, a.created_at
			FROM attendance a
			JOIN attendance_sessions asess ON a.session_id::text = asess.id::text
			WHERE (a.created_at)::date = CURRENT_DATE
		) a ON mk.kode = a.course_id AND mmk.mahasiswa_id::text = a.student_id
		WHERE mmk.mahasiswa_id::text = $1::text
			AND TRIM(LOWER(mk.hari::text)) = TRIM(LOWER($2::text))
			AND mk.deleted_at IS NULL
		GROUP BY mk.kode, mk.nama, d.name, mk.sks, mk.hari, mk.jam_mulai, mk.jam_selesai, a.status, a.created_at
		ORDER BY mk.jam_mulai
	`

	rows, err := config.DB.Query(query, mahasiswaIDStr, hari)
	if err != nil {
		utils.ErrorResponse(c, http.StatusInternalServerError, "Failed to fetch courses by day: "+err.Error())
		return
	}
	defer rows.Close()

	var courses []gin.H
	var totalMahasiswa int

	for rows.Next() {
		var kode, nama, dosen, courseHari, jamMulai, jamSelesai, statusAbsen, waktuAbsen string
		var sks, totalMhs int

		err := rows.Scan(&kode, &nama, &dosen, &sks, &courseHari, &jamMulai, &jamSelesai,
			&statusAbsen, &waktuAbsen, &totalMhs)
		if err != nil {
			continue
		}

		totalMahasiswa += totalMhs

		// Check if there's active session today
		var activeSession bool
		config.DB.QueryRow(`
			SELECT EXISTS(
				SELECT 1 FROM attendance_sessions 
				WHERE course_id = $1 
					AND status = 'active' 
					AND expires_at > NOW()
					AND (created_at)::date = CURRENT_DATE
			)
		`, kode).Scan(&activeSession)

		courses = append(courses, gin.H{
			"kode":            kode,
			"nama":            nama,
			"dosen":           dosen,
			"sks":             sks,
			"hari":            courseHari,
			"jam_mulai":       jamMulai,
			"jam_selesai":     jamSelesai,
			"status_absen":    statusAbsen,
			"waktu_absen":     waktuAbsen,
			"total_mahasiswa": totalMhs,
			"active_session":  activeSession,
			"can_scan":        activeSession && statusAbsen == "belum_absen",
		})
	}

	utils.SuccessResponse(c, gin.H{
		"hari":            hari,
		"courses":         courses,
		"total_courses":   len(courses),
		"total_mahasiswa": totalMahasiswa,
		"date":            time.Now().Format("2006-01-02"),
	}, "Courses retrieved successfully for "+hari)
}
// GetMahasiswaCourses - Ambil semua mata kuliah yang diambil mahasiswa
func GetMahasiswaCourses(c *gin.Context) {
	userID, exists := c.Get("user_id")
	if !exists {
		utils.ErrorResponse(c, http.StatusUnauthorized, "Unauthorized")
		return
	}



	// Get mahasiswa ID
	var mahasiswaID int
	err := config.DB.QueryRow("SELECT id FROM mahasiswa WHERE user_id = $1", userID).Scan(&mahasiswaID)
	if err != nil {

		utils.ErrorResponse(c, http.StatusNotFound, "Mahasiswa not found")
		return
	}



	// Debug: Hitung total mata kuliah yang diambil
	var totalCourses int
	config.DB.QueryRow("SELECT COUNT(*) FROM mahasiswa_mata_kuliah WHERE mahasiswa_id = $1", mahasiswaID).Scan(&totalCourses)


	rows, err := config.DB.Query(`
		SELECT mk.kode, mk.nama, d.name as dosen, mk.sks, mk.hari, mk.jam_mulai, mk.jam_selesai
		FROM mata_kuliah mk
		JOIN dosen d ON mk.dosen_id = d.id
		JOIN mahasiswa_mata_kuliah mmk ON mk.kode = mmk.mata_kuliah_kode
		WHERE mmk.mahasiswa_id = $1 AND mk.deleted_at IS NULL
		ORDER BY mk.nama
	`, mahasiswaID)
	
	if err != nil {

		utils.ErrorResponse(c, http.StatusInternalServerError, "Failed to fetch courses: "+err.Error())
		return
	}
	defer rows.Close()

	var courses []gin.H
	courseCount := 0
	for rows.Next() {
		var kode, nama, dosen, hari, jamMulai, jamSelesai string
		var sks int
		if err := rows.Scan(&kode, &nama, &dosen, &sks, &hari, &jamMulai, &jamSelesai); err != nil {

			continue
		}
		courses = append(courses, gin.H{
			"kode":        kode,
			"nama":        nama,
			"dosen":       dosen,
			"sks":         sks,
			"hari":        hari,
			"jam_mulai":   jamMulai,
			"jam_selesai": jamSelesai,
		})
		courseCount++
	}



	// Jika tidak ada kursus, tampilkan semua mata kuliah sebagai fallback (untuk testing)
	if len(courses) == 0 {

		
		allRows, err := config.DB.Query(`
			SELECT mk.kode, mk.nama, d.name as dosen, mk.sks, mk.hari, mk.jam_mulai, mk.jam_selesai
			FROM mata_kuliah mk
			JOIN dosen d ON mk.dosen_id = d.id
			WHERE mk.deleted_at IS NULL
			ORDER BY mk.nama
			LIMIT 8
		`)
		
		if err == nil {
			defer allRows.Close()
			for allRows.Next() {
				var kode, nama, dosen, hari, jamMulai, jamSelesai string
				var sks int
				if err := allRows.Scan(&kode, &nama, &dosen, &sks, &hari, &jamMulai, &jamSelesai); err == nil {
					courses = append(courses, gin.H{
						"kode":        kode,
						"nama":        nama,
						"dosen":       dosen,
						"sks":         sks,
						"hari":        hari,
						"jam_mulai":   jamMulai,
						"jam_selesai": jamSelesai,
					})
				}
			}
		}
	}

	utils.SuccessResponse(c, gin.H{
		"data": courses,
		"meta": gin.H{
			"total": len(courses),
			"mahasiswa_id": mahasiswaID,
		},
	}, "Courses retrieved")
}
// GetMahasiswaJadwalHariIni - DIPERBAIKI untuk menampilkan hanya mata kuliah hari ini
func GetMahasiswaJadwalHariIni(c *gin.Context) {
	userID, exists := c.Get("user_id")
	if !exists {
		utils.ErrorResponse(c, http.StatusUnauthorized, "Unauthorized")
		return
	}

	// Get mahasiswa ID
	var mahasiswaID int
	err := config.DB.QueryRow("SELECT id FROM mahasiswa WHERE user_id = $1", userID).Scan(&mahasiswaID)
	if err != nil {
		utils.ErrorResponse(c, http.StatusNotFound, "Mahasiswa not found")
		return
	}

	// Get hari ini dalam bahasa Indonesia
	hariIni := ""
	switch time.Now().Weekday() {
	case time.Monday:
		hariIni = "Senin"
	case time.Tuesday:
		hariIni = "Selasa"
	case time.Wednesday:
		hariIni = "Rabu"
	case time.Thursday:
		hariIni = "Kamis"
	case time.Friday:
		hariIni = "Jumat"
	case time.Saturday:
		hariIni = "Sabtu"
	case time.Sunday:
		hariIni = "Minggu"
	}

	// Query jadwal hari ini - DIPERBAIKI dengan DISTINCT untuk menghindari duplikasi
	mahasiswaIDStr := strconv.Itoa(mahasiswaID)
	query := `
		SELECT DISTINCT
			mk.kode, 
			mk.nama, 
			d.name as dosen, 
			mk.sks, 
			mk.hari, 
			mk.jam_mulai, 
			mk.jam_selesai,
			COALESCE(a.status, 'belum_absen') as status_absen,
			COALESCE(TO_CHAR(a.created_at, 'HH24:MI'), '') as waktu_absen,
			a.pertemuan_ke,
			asess.session_code
		FROM mata_kuliah mk
		JOIN dosen d ON mk.dosen_id = d.id
		JOIN mahasiswa_mata_kuliah mmk ON mk.kode = mmk.mata_kuliah_kode
		LEFT JOIN (
			SELECT DISTINCT a.student_id::text as student_id, asess.course_id, a.status, a.created_at, a.pertemuan_ke
			FROM attendance a
			JOIN attendance_sessions asess ON a.session_id::text = asess.id::text
			WHERE (a.created_at)::date = CURRENT_DATE AND a.student_id::text = $1::text
		) a ON mk.kode = a.course_id AND mmk.mahasiswa_id::text = a.student_id
		LEFT JOIN attendance_sessions asess ON mk.kode = asess.course_id 
			AND asess.status = 'active' 
			AND asess.expires_at > NOW()
			AND (asess.created_at)::date = CURRENT_DATE
		WHERE mmk.mahasiswa_id::text = $2::text
			AND TRIM(LOWER(mk.hari::text)) = TRIM(LOWER($3::text))
			AND mk.deleted_at IS NULL
		ORDER BY mk.jam_mulai
	`

	rows, err := config.DB.Query(query, mahasiswaIDStr, mahasiswaIDStr, hariIni)
	if err != nil {
		utils.ErrorResponse(c, http.StatusInternalServerError, "Failed to fetch today's schedule: "+err.Error())
		return
	}
	defer rows.Close()

	var jadwal []gin.H
	for rows.Next() {
		var kode, nama, dosen, hari, jamMulai, jamSelesai, statusAbsen, waktuAbsen, sessionCode string
		var sks, pertemuanKe int

		err := rows.Scan(&kode, &nama, &dosen, &sks, &hari, &jamMulai, &jamSelesai,
			&statusAbsen, &waktuAbsen, &pertemuanKe, &sessionCode)
		if err != nil {
			continue
		}

		// Check if course can be scanned (belum absen dan sesuai waktu)
		canScan := false
		isActiveSession := false
		if statusAbsen == "belum_absen" && sessionCode != "" {
			// Check if current time is within course time
			currentTime := time.Now()
			courseTimeStart, _ := time.Parse("15:04", jamMulai)
			courseTimeEnd, _ := time.Parse("15:04", jamSelesai)

			// Create today's datetime
			startTime := time.Date(currentTime.Year(), currentTime.Month(), currentTime.Day(),
				courseTimeStart.Hour(), courseTimeStart.Minute(), 0, 0, currentTime.Location())
			endTime := time.Date(currentTime.Year(), currentTime.Month(), currentTime.Day(),
				courseTimeEnd.Hour(), courseTimeEnd.Minute(), 0, 0, currentTime.Location())

			// Allow scan 15 minutes before and 60 minutes after start time
			if currentTime.After(startTime.Add(-15*time.Minute)) && currentTime.Before(endTime.Add(60*time.Minute)) {
				canScan = true
				isActiveSession = true
			}
		}

		jadwal = append(jadwal, gin.H{
			"kode":              kode,
			"nama":              nama,
			"dosen":             dosen,
			"sks":               sks,
			"hari":              hari,
			"jam_mulai":         jamMulai,
			"jam_selesai":       jamSelesai,
			"status_absen":      statusAbsen,
			"waktu_absen":       waktuAbsen,
			"pertemuan_ke":      pertemuanKe,
			"session_code":      sessionCode,
			"can_scan":          canScan,
			"is_active_session": isActiveSession,
		})
	}

	// Get today's date
	today := time.Now().Format("2006-01-02")

	utils.SuccessResponse(c, gin.H{
		"hari":   hariIni,
		"date":   today,
		"jadwal": jadwal,
		"total":  len(jadwal),
	}, "Today's schedule retrieved successfully")
}

// ScanAttendance - Mahasiswa scan QR Code untuk absensi - DIPERBAIKI
func ScanAttendance(c *gin.Context) {
	userID, exists := c.Get("user_id")
	if !exists {
		utils.ErrorResponse(c, http.StatusUnauthorized, "Unauthorized")
		return
	}

	var input struct {
		SessionToken string `json:"session_token" binding:"required"`
		CourseID     string `json:"course_id" binding:"required"`
	}

	if err := c.ShouldBindJSON(&input); err != nil {
		utils.ErrorResponse(c, http.StatusBadRequest, "Invalid input: "+err.Error())
		return
	}

	// Get mahasiswa ID
	var mahasiswaID int
	err := config.DB.QueryRow("SELECT id FROM mahasiswa WHERE user_id = $1", userID).Scan(&mahasiswaID)
	if err != nil {
		utils.ErrorResponse(c, http.StatusNotFound, "Mahasiswa not found")
		return
	}

	// Cek session token dan dapatkan informasi sesi dengan pertemuan
	var session struct {
		ID          int
		CourseID    string
		DosenID     int
		PertemuanKe int
		ExpiresAt   time.Time
		CourseDay   string
		CourseStart string
		CourseEnd   string
		Status      string
	}

	err = config.DB.QueryRow(`
		SELECT asess.id, asess.course_id, asess.dosen_id, asess.pertemuan_ke, 
		       asess.expires_at, mk.hari, mk.jam_mulai, mk.jam_selesai, asess.status
		FROM attendance_sessions asess
		JOIN mata_kuliah mk ON asess.course_id = mk.kode
		WHERE asess.session_token = $1 
			AND asess.status = 'active' 
			AND asess.expires_at > NOW()
			AND asess.course_id = $2
	`, input.SessionToken, input.CourseID).Scan(
		&session.ID, &session.CourseID, &session.DosenID, &session.PertemuanKe,
		&session.ExpiresAt, &session.CourseDay, &session.CourseStart, &session.CourseEnd, &session.Status)

	if err != nil {
		utils.ErrorResponse(c, http.StatusBadRequest, "QR Code tidak valid: Sesi sudah kadaluarsa atau tidak aktif")
		return
	}

	// Validasi: Mata kuliah harus sesuai dengan yang dipilih mahasiswa
	if session.CourseID != input.CourseID {
		utils.ErrorResponse(c, http.StatusBadRequest, "QR Code tidak sesuai dengan mata kuliah yang dipilih")
		return
	}

	// Cek apakah mahasiswa mengambil mata kuliah ini
	var enrolled bool
	err = config.DB.QueryRow(`
		SELECT EXISTS(
			SELECT 1 FROM mahasiswa_mata_kuliah 
			WHERE mahasiswa_id = $1 AND mata_kuliah_kode = $2
		)
	`, mahasiswaID, session.CourseID).Scan(&enrolled)

	if err != nil || !enrolled {
		utils.ErrorResponse(c, http.StatusForbidden, "Anda tidak terdaftar pada mata kuliah ini")
		return
	}

	// Cek hari sesuai jadwal
	today := time.Now().Weekday()
	dayMap := map[string]time.Weekday{
		"Senin":  time.Monday,
		"Selasa": time.Tuesday,
		"Rabu":   time.Wednesday,
		"Kamis":  time.Thursday,
		"Jumat":  time.Friday,
		"Sabtu":  time.Saturday,
		"Minggu": time.Sunday,
	}

	courseDay, ok := dayMap[session.CourseDay]
	if !ok || courseDay != today {
		utils.ErrorResponse(c, http.StatusBadRequest,
			"Hari ini bukan jadwal mata kuliah ini. Jadwal: "+session.CourseDay)
		return
	}

	// Cek waktu absensi (15 menit sebelum - 60 menit setelah jam mulai)
	currentTime := time.Now()
	courseStart, _ := time.Parse("15:04", session.CourseStart)
	courseEnd, _ := time.Parse("15:04", session.CourseEnd)

	// Create today's datetime for course times
	startTime := time.Date(currentTime.Year(), currentTime.Month(), currentTime.Day(),
		courseStart.Hour(), courseStart.Minute(), 0, 0, currentTime.Location())
	endTime := time.Date(currentTime.Year(), currentTime.Month(), currentTime.Day(),
		courseEnd.Hour(), courseEnd.Minute(), 0, 0, currentTime.Location())

	// Validasi waktu
	scanStart := startTime.Add(-15 * time.Minute)
	scanEnd := endTime.Add(60 * time.Minute)

	if currentTime.Before(scanStart) {
		utils.ErrorResponse(c, http.StatusBadRequest,
			"Belum waktunya absen. Bisa scan 15 menit sebelum kelas dimulai.")
		return
	}

	if currentTime.After(scanEnd) {
		utils.ErrorResponse(c, http.StatusBadRequest,
			"Waktu absen sudah berakhir. Maksimal 60 menit setelah kelas selesai.")
		return
	}

	// Cek apakah sudah absen untuk pertemuan ini
	var alreadyAttended bool
	var existingStatus string
	err = config.DB.QueryRow(`
		SELECT EXISTS(
			SELECT 1 FROM attendance a
			JOIN attendance_sessions asess ON a.session_id::text = asess.id::text
			WHERE a.student_id = $1 
				AND asess.course_id = $2 
				AND asess.pertemuan_ke = $3
				AND (a.created_at)::date = CURRENT_DATE
		), COALESCE(a.status, '')
		FROM attendance a
		JOIN attendance_sessions asess ON a.session_id::text = asess.id::text
		WHERE a.student_id = $4 
			AND asess.course_id = $5 
			AND asess.pertemuan_ke = $6
			AND (a.created_at)::date = CURRENT_DATE
		LIMIT 1
	`, mahasiswaID, session.CourseID, session.PertemuanKe,
		mahasiswaID, session.CourseID, session.PertemuanKe).Scan(&alreadyAttended, &existingStatus)

	if alreadyAttended {
		utils.ErrorResponse(c, http.StatusBadRequest,
			"Anda sudah melakukan absensi untuk pertemuan ke-"+strconv.Itoa(session.PertemuanKe)+
				" dengan status: "+existingStatus)
		return
	}

	// Get student code (nim)
	var studentCode string
	err = config.DB.QueryRow("SELECT nim FROM mahasiswa WHERE id = $1", mahasiswaID).Scan(&studentCode)
	if err != nil {
		studentCode = fmt.Sprintf("MHS-%d", mahasiswaID)
	}

	// Insert attendance dengan status hadir dan pertemuan_ke
	_, err = config.DB.Exec(`
		INSERT INTO attendance (student_id, session_id, student_code, status, pertemuan_ke, created_at)
		VALUES ($1, $2, $3, 'hadir', $4, NOW())
	`, mahasiswaID, session.ID, studentCode, session.PertemuanKe)

	if err != nil {
		utils.ErrorResponse(c, http.StatusInternalServerError, "Failed to record attendance: "+err.Error())
		return
	}

	// Update attendance_summary
	_, err = config.DB.Exec(`
		INSERT INTO attendance_summary 
		(student_id, nim, student_name, session_id, course_id, course_name, status, 
		 attendance_date, attendance_time, dosen_name, hari, jam_mulai, jam_selesai)
		SELECT 
			m.id, m.nim, m.name, $1, mk.kode, mk.nama, 'hadir',
			CURRENT_DATE, NOW(), d.name, mk.hari, mk.jam_mulai, mk.jam_selesai
		FROM mahasiswa m
		JOIN mata_kuliah mk ON mk.kode = $2
		JOIN dosen d ON mk.dosen_id = d.id
		WHERE m.id = $3
		ON CONFLICT (student_id, session_id) DO UPDATE SET
			status = 'hadir',
			attendance_time = NOW()
	`, session.ID, session.CourseID, mahasiswaID)

	// Get course info untuk response
	var courseName, dosenName string
	config.DB.QueryRow(`
		SELECT mk.nama, d.name 
		FROM mata_kuliah mk
		JOIN dosen d ON mk.dosen_id = d.id
		WHERE mk.kode = $1
	`, session.CourseID).Scan(&courseName, &dosenName)

	utils.SuccessResponse(c, gin.H{
		"success":      true,
		"course_id":    session.CourseID,
		"course_name":  courseName,
		"dosen":        dosenName,
		"pertemuan_ke": session.PertemuanKe,
		"time":         time.Now().Format("15:04"),
		"date":         time.Now().Format("2006-01-02"),
		"status":       "hadir",
		"session_code": fmt.Sprintf("ABS-%s-P%d", session.CourseID, session.PertemuanKe),
	}, "Absensi berhasil! Pertemuan ke-"+strconv.Itoa(session.PertemuanKe)+" - Status: Hadir")
}

// GetAttendanceHistoryByCourse - Get riwayat absensi per mata kuliah
func GetAttendanceHistoryByCourse(c *gin.Context) {
	userID, exists := c.Get("user_id")
	if !exists {
		utils.ErrorResponse(c, http.StatusUnauthorized, "Unauthorized")
		return
	}

	courseID := c.Param("course_id")
	if courseID == "" {
		utils.ValidationError(c, "Course ID is required")
		return
	}

	// Get mahasiswa ID
	var mahasiswaID int
	err := config.DB.QueryRow("SELECT id FROM mahasiswa WHERE user_id = $1", userID).Scan(&mahasiswaID)
	if err != nil {
		utils.ErrorResponse(c, http.StatusNotFound, "Mahasiswa not found")
		return
	}

	// Query riwayat absensi untuk mata kuliah tertentu
	query := `
		SELECT 
			a.id, mk.nama as mata_kuliah, d.name as dosen, a.status, a.pertemuan_ke,
			TO_CHAR(a.created_at, 'DD Month YYYY') as tanggal,
			TO_CHAR(a.created_at, 'HH24:MI') as jam,
			mk.kode as course_code,
			asess.session_code,
			(a.created_at)::date as tanggal_raw
		FROM attendance a
		JOIN attendance_sessions asess ON a.session_id::text = asess.id::text
		JOIN mata_kuliah mk ON asess.course_id = mk.kode
		JOIN dosen d ON mk.dosen_id = d.id
		WHERE a.student_id = $1 
			AND mk.kode = $2
		ORDER BY a.created_at DESC
		LIMIT 50
	`

	rows, err := config.DB.Query(query, mahasiswaID, courseID)
	if err != nil {
		utils.ErrorResponse(c, http.StatusInternalServerError, "Failed to fetch attendance history: "+err.Error())
		return
	}
	defer rows.Close()

	var history []gin.H
	for rows.Next() {
		var id, pertemuanKe int
		var mataKuliah, dosen, status, tanggal, jam, courseCode, sessionCode, tanggalRaw string

		err := rows.Scan(&id, &mataKuliah, &dosen, &status, &pertemuanKe,
			&tanggal, &jam, &courseCode, &sessionCode, &tanggalRaw)
		if err != nil {
			continue
		}

		history = append(history, gin.H{
			"id":           id,
			"mata_kuliah":  mataKuliah,
			"dosen":        dosen,
			"status":       status,
			"pertemuan_ke": pertemuanKe,
			"tanggal":      tanggal,
			"jam":          jam,
			"course_code":  courseCode,
			"session_code": sessionCode,
			"tanggal_raw":  tanggalRaw,
		})
	}

	// Get summary untuk mata kuliah ini
	var totalSessions, hadirCount, izinCount, sakitCount, alpaCount int
	err = config.DB.QueryRow(`
		SELECT 
			COUNT(DISTINCT a.id) as total,
			SUM(CASE WHEN a.status = 'hadir' THEN 1 ELSE 0 END) as hadir,
			SUM(CASE WHEN a.status = 'izin' THEN 1 ELSE 0 END) as izin,
			SUM(CASE WHEN a.status = 'sakit' THEN 1 ELSE 0 END) as sakit,
			SUM(CASE WHEN a.status = 'alpa' THEN 1 ELSE 0 END) as alpa
		FROM attendance a
		JOIN attendance_sessions asess ON a.session_id::text = asess.id::text
		WHERE a.student_id = $1 AND asess.course_id = $2
	`, mahasiswaID, courseID).Scan(&totalSessions, &hadirCount, &izinCount, &sakitCount, &alpaCount)

	if err != nil {
		// Jika error, set ke 0
		totalSessions, hadirCount, izinCount, sakitCount, alpaCount = 0, 0, 0, 0, 0
	}

	// Get course info
	var courseName, hari, jamMulai, jamSelesai string
	err = config.DB.QueryRow(`
		SELECT nama, hari, jam_mulai, jam_selesai 
		FROM mata_kuliah 
		WHERE kode = $1
	`, courseID).Scan(&courseName, &hari, &jamMulai, &jamSelesai)
	
	if err != nil {
		courseName, hari, jamMulai, jamSelesai = "", "", "", ""
	}

	utils.SuccessResponse(c, gin.H{
		"history": history,
		"summary": gin.H{
			"course_id":   courseID,
			"course_name": courseName,
			"hari":        hari,
			"jam_mulai":   jamMulai,
			"jam_selesai": jamSelesai,
			"total":       totalSessions,
			"hadir":       hadirCount,
			"izin":        izinCount,
			"sakit":       sakitCount,
			"alpa":        alpaCount,
			"kehadiran_percent": func() float64 {
				if totalSessions > 0 {
					return float64(hadirCount) / float64(totalSessions) * 100
				}
				return 0
			}(),
		},
	}, "Attendance history retrieved successfully")
}


// GetAttendanceHistory - Get riwayat absensi mahasiswa dengan filter opsional
func GetAttendanceHistory(c *gin.Context) {
	userID, exists := c.Get("user_id")
	if !exists {
		utils.ErrorResponse(c, http.StatusUnauthorized, "Unauthorized")
		return
	}

	// Get mahasiswa ID
	var mahasiswaID int
	err := config.DB.QueryRow("SELECT id FROM mahasiswa WHERE user_id = $1", userID).Scan(&mahasiswaID)
	if err != nil {
		utils.ErrorResponse(c, http.StatusNotFound, "Mahasiswa not found")
		return
	}

	// Parse query parameters
	status := c.Query("status")
	if status == "" {
		status = "all"
	}

	// Query riwayat absensi dengan filter status
	query := `
		SELECT 
			a.id, 
			mk.nama as mata_kuliah,
			mk.kode as course_code,
			d.name as dosen,
			a.status,
			a.pertemuan_ke,
			TO_CHAR(a.created_at, 'DD Month YYYY') as tanggal,
			TO_CHAR(a.created_at, 'HH24:MI') as jam,
			asess.session_code,
			mk.hari,
			mk.jam_mulai,
			mk.jam_selesai
		FROM attendance a
		JOIN attendance_sessions asess ON a.session_id::text = asess.id::text
		JOIN mata_kuliah mk ON asess.course_id = mk.kode
		JOIN dosen d ON mk.dosen_id = d.id
		WHERE a.student_id = $1
	`

	args := []interface{}{mahasiswaID}
	
	if status != "all" {
		query += " AND a.status = $2"
		args = append(args, status)
	}

	query += " ORDER BY a.created_at DESC LIMIT 100"

	rows, err := config.DB.Query(query, args...)
	if err != nil {
		utils.ErrorResponse(c, http.StatusInternalServerError, "Failed to fetch attendance history: "+err.Error())
		return
	}
	defer rows.Close()

	var history []gin.H
	for rows.Next() {
		var id, pertemuanKe int
		var mataKuliah, courseCode, dosen, statusVal, tanggal, jam, sessionCode, hari, jamMulai, jamSelesai string

		err := rows.Scan(&id, &mataKuliah, &courseCode, &dosen, &statusVal, &pertemuanKe,
			&tanggal, &jam, &sessionCode, &hari, &jamMulai, &jamSelesai)
		if err != nil {
			continue
		}

		history = append(history, gin.H{
			"id":           id,
			"mata_kuliah":  mataKuliah,
			"course_code":  courseCode,
			"dosen":        dosen,
			"status":       statusVal,
			"pertemuan_ke": pertemuanKe,
			"tanggal":      tanggal,
			"jam":          jam,
			"session_code": sessionCode,
			"hari":         hari,
			"jam_mulai":    jamMulai,
			"jam_selesai":  jamSelesai,
		})
	}

	// Get summary statistics
	var totalSessions, hadirCount, izinCount, sakitCount, alpaCount int
	summaryQuery := `
		SELECT 
			COUNT(DISTINCT a.id) as total,
			SUM(CASE WHEN a.status = 'hadir' THEN 1 ELSE 0 END) as hadir,
			SUM(CASE WHEN a.status = 'izin' THEN 1 ELSE 0 END) as izin,
			SUM(CASE WHEN a.status = 'sakit' THEN 1 ELSE 0 END) as sakit,
			SUM(CASE WHEN a.status = 'alpa' THEN 1 ELSE 0 END) as alpa
		FROM attendance a
		WHERE a.student_id = $1
	`
	
	if status != "all" {
		summaryQuery += " AND a.status = $2"
		err = config.DB.QueryRow(summaryQuery, mahasiswaID, status).Scan(&totalSessions, &hadirCount, &izinCount, &sakitCount, &alpaCount)
	} else {
		err = config.DB.QueryRow(summaryQuery, mahasiswaID).Scan(&totalSessions, &hadirCount, &izinCount, &sakitCount, &alpaCount)
	}

	if err != nil {
		// Jika error, set default values
		totalSessions, hadirCount, izinCount, sakitCount, alpaCount = 0, 0, 0, 0, 0
	}

	utils.SuccessResponse(c, gin.H{
		"history": history,
		"summary": gin.H{
			"total":              totalSessions,
			"hadir":              hadirCount,
			"izin":               izinCount,
			"sakit":              sakitCount,
			"alpa":               alpaCount,
			"kehadiran_percent": func() float64 {
				if totalSessions > 0 {
					return float64(hadirCount) / float64(totalSessions) * 100
				}
				return 0
			}(),
		},
		"filters": gin.H{
			"status": status,
		},
	}, "Attendance history retrieved successfully")
}


// GetAttendanceSummary - Get summary absensi mahasiswa per course
func GetAttendanceSummary(c *gin.Context) {
	userID, exists := c.Get("user_id")
	if !exists {
		utils.ErrorResponse(c, http.StatusUnauthorized, "Unauthorized")
		return
	}

	// Get mahasiswa ID
	var mahasiswaID int
	err := config.DB.QueryRow("SELECT id FROM mahasiswa WHERE user_id = $1", userID).Scan(&mahasiswaID)
	if err != nil {
		utils.ErrorResponse(c, http.StatusNotFound, "Mahasiswa not found")
		return
	}

	rows, err := config.DB.Query(`
    SELECT 
        mk.kode,
        mk.nama AS mata_kuliah,
        d.name AS dosen,
        COUNT(DISTINCT asess.id) AS total_sessions,
        COUNT(DISTINCT a.id) AS attended_sessions,
        SUM(CASE WHEN a.status = 'hadir' THEN 1 ELSE 0 END) AS hadir_count,
        SUM(CASE WHEN a.status = 'izin' THEN 1 ELSE 0 END) AS izin_count,
        SUM(CASE WHEN a.status = 'sakit' THEN 1 ELSE 0 END) AS sakit_count,
        SUM(CASE WHEN a.status = 'alpa' THEN 1 ELSE 0 END) AS alpa_count
    FROM mahasiswa_mata_kuliah mmk
    JOIN mata_kuliah mk ON mmk.mata_kuliah_kode = mk.kode
    JOIN dosen d ON mk.dosen_id = d.id
    LEFT JOIN attendance_sessions asess 
        ON mk.kode = asess.course_id
    LEFT JOIN attendance a 
        ON asess.id = a.session_id 
        AND a.student_id = $1
    WHERE mmk.mahasiswa_id = $2
    GROUP BY mk.kode, mk.nama, d.name
    ORDER BY mk.nama
`, mahasiswaID, mahasiswaID)


	if err != nil {
		utils.ErrorResponse(c, http.StatusInternalServerError, "Failed to fetch attendance summary")
		return
	}
	defer rows.Close()

	var summary []gin.H
	for rows.Next() {
		var kode, mataKuliah, dosen string
		var totalSessions, attendedSessions, hadirCount, izinCount, sakitCount, alpaCount int

		err := rows.Scan(&kode, &mataKuliah, &dosen, &totalSessions, &attendedSessions,
			&hadirCount, &izinCount, &sakitCount, &alpaCount)
		if err != nil {
			continue
		}

		var attendancePercentage float64
		if totalSessions > 0 {
			attendancePercentage = float64(attendedSessions) / float64(totalSessions) * 100
		}

		summary = append(summary, gin.H{
			"course_code":        kode,
			"mata_kuliah":        mataKuliah,
			"dosen":              dosen,
			"total_sessions":     totalSessions,
			"attended_sessions":  attendedSessions,
			"attendance_percent": attendancePercentage,
			"hadir_count":        hadirCount,
			"izin_count":         izinCount,
			"sakit_count":        sakitCount,
			"alpa_count":         alpaCount,
		})
	}

	utils.SuccessResponse(c, summary, "Attendance summary retrieved successfully")
}

// GetAllPertemuanAttendance - Get semua pertemuan (sessions) untuk mahasiswa beserta statusnya
func GetAllPertemuanAttendance(c *gin.Context) {
	userID, exists := c.Get("user_id")
	if !exists {
		utils.ErrorResponse(c, http.StatusUnauthorized, "Unauthorized")
		return
	}

	// Get mahasiswa ID
	var mahasiswaID int
	err := config.DB.QueryRow("SELECT id FROM mahasiswa WHERE user_id = $1", userID).Scan(&mahasiswaID)
	if err != nil {
		utils.ErrorResponse(c, http.StatusNotFound, "Mahasiswa not found")
		return
	}

	// Ambil semua attendance_sessions untuk mata kuliah yang diambil mahasiswa, beserta status mahasiswa pada session tersebut
	query := `
		SELECT
			asess.id,
			asess.course_id,
			mk.nama as course_name,
			asess.pertemuan_ke,
			asess.session_code,
			TO_CHAR(asess.created_at, 'YYYY-MM-DD') as tanggal,
			asess.status as session_status,
			COALESCE(a.status, 'belum_absen') as my_status,
			COALESCE(TO_CHAR(a.created_at, 'HH24:MI'), '') as my_time
		FROM attendance_sessions asess
		JOIN mata_kuliah mk ON mk.kode = asess.course_id
		WHERE asess.course_id IN (
			SELECT mmk.mata_kuliah_kode FROM mahasiswa_mata_kuliah mmk WHERE mmk.mahasiswa_id = $1
		)
		ORDER BY asess.created_at DESC
	`

	rows, err := config.DB.Query(query, mahasiswaID)
	if err != nil {
		utils.ErrorResponse(c, http.StatusInternalServerError, "Failed to fetch sessions: "+err.Error())
		return
	}
	defer rows.Close()

	var sessions []gin.H
	for rows.Next() {
		var id int
		var courseID, courseName, sessionCode, tanggal, sessionStatus, myStatus, myTime string
		var pertemuanKe int

		err := rows.Scan(&id, &courseID, &courseName, &pertemuanKe, &sessionCode, &tanggal, &sessionStatus, &myStatus, &myTime)
		if err != nil {
			continue
		}

		sessions = append(sessions, gin.H{
			"id":             id,
			"course_id":      courseID,
			"course_name":    courseName,
			"pertemuan_ke":   pertemuanKe,
			"session_code":   sessionCode,
			"date":           tanggal,
			"session_status": sessionStatus,
			"my_status":      myStatus,
			"my_time":        myTime,
		})
	}

	utils.SuccessResponse(c, gin.H{"sessions": sessions}, "All sessions retrieved")
}

// GetAttendanceByCoursePertemuan - Get absensi mahasiswa untuk course tertentu dan (opsional) pertemuan
func GetAttendanceByCoursePertemuan(c *gin.Context) {
	userID, exists := c.Get("user_id")
	if !exists {
		utils.ErrorResponse(c, http.StatusUnauthorized, "Unauthorized")
		return
	}

	courseID := c.Query("course_id")
	pertemuanKe := c.Query("pertemuan_ke")

	if courseID == "" {
		utils.ValidationError(c, "course_id is required")
		return
	}

	// Get mahasiswa ID
	var mahasiswaID int
	err := config.DB.QueryRow("SELECT id FROM mahasiswa WHERE user_id = $1", userID).Scan(&mahasiswaID)
	if err != nil {
		utils.ErrorResponse(c, http.StatusNotFound, "Mahasiswa not found")
		return
	}

	query := `
		SELECT
			asess.id,
			asess.course_id,
			mk.nama as course_name,
			asess.pertemuan_ke,
			asess.session_code,
			TO_CHAR(asess.created_at, 'YYYY-MM-DD') as tanggal,
			asess.status as session_status,
			COALESCE(a.status, 'belum_absen') as my_status,
			COALESCE(TO_CHAR(a.created_at, 'HH24:MI'), '') as my_time
		FROM attendance_sessions asess
		JOIN mata_kuliah mk ON mk.kode = asess.course_id
		LEFT JOIN attendance a ON a.session_id::text = asess.id::text AND a.student_id = $1
		WHERE asess.course_id = $2
	`

	args := []interface{}{mahasiswaID, courseID}
	if pertemuanKe != "" {
		query += " AND asess.pertemuan_ke = $3"
		args = append(args, pertemuanKe)
	}
	query += " ORDER BY asess.pertemuan_ke DESC"

	rows, err := config.DB.Query(query, args...)
	if err != nil {
		utils.ErrorResponse(c, http.StatusInternalServerError, "Failed to fetch attendance pertemuan: "+err.Error())
		return
	}
	defer rows.Close()

	var items []gin.H
	for rows.Next() {
		var id int
		var courseIDr, courseName, sessionCode, tanggal, sessionStatus, myStatus, myTime string
		var pertemuan int

		err := rows.Scan(&id, &courseIDr, &courseName, &pertemuan, &sessionCode, &tanggal, &sessionStatus, &myStatus, &myTime)
		if err != nil {
			continue
		}

		items = append(items, gin.H{
			"id":             id,
			"course_id":      courseIDr,
			"course_name":    courseName,
			"pertemuan_ke":   pertemuan,
			"session_code":   sessionCode,
			"date":           tanggal,
			"session_status": sessionStatus,
			"my_status":      myStatus,
			"my_time":        myTime,
		})
	}

	utils.SuccessResponse(c, gin.H{"data": items}, "Attendance pertemuan retrieved")
}

// GetUKTInvoices - Get UKT invoices for mahasiswa
func GetUKTInvoices(c *gin.Context) {
	userID, exists := c.Get("user_id")
	if !exists {
		utils.ErrorResponse(c, http.StatusUnauthorized, "Unauthorized")
		return
	}

	// Get mahasiswa ID
	var mahasiswaID int
	err := config.DB.QueryRow("SELECT id FROM mahasiswa WHERE user_id = $1", userID).Scan(&mahasiswaID)
	if err != nil {
		utils.ErrorResponse(c, http.StatusNotFound, "Mahasiswa not found")
		return
	}

	rows, err := config.DB.Query(`
		SELECT id, amount, uuid, status, created_at
		FROM ukt_invoices
		WHERE student_id = $1
		ORDER BY created_at DESC
	`, mahasiswaID)

	if err != nil {
		utils.ErrorResponse(c, http.StatusInternalServerError, "Failed to fetch invoices")
		return
	}
	defer rows.Close()

	var invoices []map[string]interface{}
	for rows.Next() {
		var id int
		var amount float64
		var uuid, status string
		var createdAt interface{}

		rows.Scan(&id, &amount, &uuid, &status, &createdAt)

		invoices = append(invoices, map[string]interface{}{
			"id":         id,
			"amount":     amount,
			"uuid":       uuid,
			"status":     status,
			"created_at": createdAt,
		})
	}

	utils.SuccessResponse(c, invoices, "Invoices retrieved")
}

// CreateUKTPayment - Create UKT payment
func CreateUKTPayment(c *gin.Context) {
	userID, exists := c.Get("user_id")
	if !exists {
		utils.ErrorResponse(c, http.StatusUnauthorized, "Unauthorized")
		return
	}

	var input struct {
		InvoiceID int `json:"invoice_id" binding:"required"`
	}

	if err := c.ShouldBindJSON(&input); err != nil {
		utils.ErrorResponse(c, http.StatusBadRequest, "Invalid input")
		return
	}

	// Get mahasiswa ID
	var mahasiswaID int
	err := config.DB.QueryRow("SELECT id FROM mahasiswa WHERE user_id = $1", userID).Scan(&mahasiswaID)
	if err != nil {
		utils.ErrorResponse(c, http.StatusNotFound, "Mahasiswa not found")
		return
	}

	// Check if invoice belongs to user
	var invoiceExists bool
	err = config.DB.QueryRow(`
		SELECT EXISTS(
			SELECT 1 FROM ukt_invoices
			WHERE id = $1 AND student_id = $2
		)
	`, input.InvoiceID, mahasiswaID).Scan(&invoiceExists)

	if err != nil || !invoiceExists {
		utils.ErrorResponse(c, http.StatusNotFound, "Invoice not found")
		return
	}

	// Process payment (stub implementation)
	_, err = config.DB.Exec(`
		UPDATE ukt_invoices
		SET status = 'paid', updated_at = NOW()
		WHERE id = $1
	`, input.InvoiceID)

	if err != nil {
		utils.ErrorResponse(c, http.StatusInternalServerError, "Failed to process payment")
		return
	}

	utils.SuccessResponse(c, nil, "Payment processed")
}

// SubmitTugas - Submit tugas (file atau text) — file disimpan ke database (BYTEA)
func SubmitTugas(c *gin.Context) {
	userID, exists := c.Get("user_id")
	if !exists {
		utils.ErrorResponse(c, http.StatusUnauthorized, "Unauthorized")
		return
	}

	if err := c.Request.ParseMultipartForm(32 << 20); err != nil {
		utils.ErrorResponse(c, http.StatusBadRequest, "Failed to parse form data")
		return
	}

	taskIDStr := c.Request.FormValue("task_id")
	answerText := c.Request.FormValue("answer_text")

	taskID, err := strconv.Atoi(taskIDStr)
	if err != nil {
		utils.ValidationError(c, "Invalid task ID")
		return
	}

	// Get mahasiswa ID
	var mahasiswaID int
	err = config.DB.QueryRow("SELECT id FROM mahasiswa WHERE user_id = $1", userID).Scan(&mahasiswaID)
	if err != nil {
		utils.ErrorResponse(c, http.StatusNotFound, "Mahasiswa not found")
		return
	}

	// Handle file upload ke database (BYTEA)
	var fileURL string
	if _, _, fErr := c.Request.FormFile("file"); fErr == nil {
		_, fURL, uploadErr := UploadFileToDB(c, "file", mahasiswaID, "mahasiswa", "tugas_mahasiswa", &taskID, nil)
		if uploadErr != nil {
			utils.ErrorResponse(c, http.StatusBadRequest, uploadErr.Error())
			return
		}
		fileURL = fURL
		log.Printf("[Submit Tugas] File uploaded to DB: url=%s", fileURL)
	}

	// Periksa apakah submission sudah ada
	var existingSubmissionID int
	var existingFileURL string
	checkQuery := `SELECT id, file_url FROM submissions WHERE task_id = $1 AND student_id = $2`
	err = config.DB.QueryRow(checkQuery, taskID, mahasiswaID).Scan(&existingSubmissionID, &existingFileURL)

	// Insert atau update submission
	if err != nil {
		// Insert baru
		query := `INSERT INTO submissions (task_id, student_id, file_url, answer_text, created_at) 
				  VALUES ($1, $2, $3, $4, NOW())`
		_, err = config.DB.Exec(query, taskID, mahasiswaID, fileURL, answerText)
	} else {
		// Update existing
		// Jika ada file baru, gunakan yang baru, jika tidak pertahankan yang lama
		finalFileURL := fileURL
		if finalFileURL == "" {
			finalFileURL = existingFileURL
		}

		query := `UPDATE submissions SET file_url = $1, answer_text = $2, updated_at = NOW() 
				  WHERE id = $3`
		_, err = config.DB.Exec(query, finalFileURL, answerText, existingSubmissionID)
	}

	if err != nil {
		utils.ErrorResponse(c, http.StatusInternalServerError, "Failed to submit tugas: "+err.Error())
		return
	}

	utils.SuccessResponse(c, nil, "Tugas submitted successfully")
}

// GetSubmissionStatus - Get submission status for a task
func GetSubmissionStatus(c *gin.Context) {
	userID, exists := c.Get("user_id")
	if !exists {
		utils.ErrorResponse(c, http.StatusUnauthorized, "Unauthorized")
		return
	}

	taskID := c.Param("task_id")

	// Get mahasiswa ID
	var mahasiswaID int
	err := config.DB.QueryRow("SELECT id FROM mahasiswa WHERE user_id = $1", userID).Scan(&mahasiswaID)
	if err != nil {
		utils.ErrorResponse(c, http.StatusNotFound, "Mahasiswa not found")
		return
	}

	var submission struct {
		ID         int     `json:"id"`
		FileURL    string  `json:"file_url"`
		AnswerText string  `json:"answer_text"`
		Grade      float64 `json:"grade"`
		CreatedAt  string  `json:"created_at"`
	}

	err = config.DB.QueryRow(`
		SELECT id, COALESCE(file_url, ''), COALESCE(answer_text, ''), COALESCE(grade, 0), created_at
		FROM submissions 
		WHERE task_id = $1 AND student_id = $2
	`, taskID, mahasiswaID).Scan(&submission.ID, &submission.FileURL, &submission.AnswerText, &submission.Grade, &submission.CreatedAt)

	if err != nil {
		// Tidak ada submission
		utils.SuccessResponse(c, nil, "No submission found")
		return
	}

	utils.SuccessResponse(c, submission, "Submission found")
}

// GetPendingTugas - Get daftar tugas yang belum dikumpulkan oleh mahasiswa
// Join tugas + mahasiswa_mata_kuliah + submissions
// Hanya tugas dengan type='tugas', deleted_at IS NULL, due_date IS NOT NULL
// Urutkan berdasarkan due_date terdekat
func GetPendingTugas(c *gin.Context) {
	userID, exists := c.Get("user_id")
	if !exists {
		utils.ErrorResponse(c, http.StatusUnauthorized, "Unauthorized")
		return
	}

	// Get mahasiswa ID
	var mahasiswaID int
	err := config.DB.QueryRow("SELECT id FROM mahasiswa WHERE user_id = $1", userID).Scan(&mahasiswaID)
	if err != nil {
		utils.ErrorResponse(c, http.StatusNotFound, "Mahasiswa not found")
		return
	}

	query := `
		SELECT 
			t.id,
			t.course_id,
			mk.nama AS course_name,
			t.pertemuan,
			t.title,
			COALESCE(t.description, '') AS description,
			COALESCE(t.file_tugas, '') AS file_tugas,
			t.due_date,
			((t.due_date)::date - CURRENT_DATE) AS days_remaining,
			CASE WHEN t.due_date < NOW() THEN 1 ELSE 0 END AS is_overdue,
			t.created_at
		FROM tugas t
		JOIN mata_kuliah mk ON t.course_id = mk.kode
		JOIN mahasiswa_mata_kuliah mmk ON mmk.mata_kuliah_kode = t.course_id
		WHERE mmk.mahasiswa_id = $1
			AND t.type = 'tugas'
			AND t.deleted_at IS NULL
			AND t.due_date IS NOT NULL
			AND NOT EXISTS (
				SELECT 1 FROM submissions s 
				WHERE s.task_id = t.id AND s.student_id = $2
			)
		ORDER BY t.due_date ASC
	`

	rows, err := config.DB.Query(query, mahasiswaID, mahasiswaID)
	if err != nil {
		utils.ErrorResponse(c, http.StatusInternalServerError, "Failed to fetch pending tasks: "+err.Error())
		return
	}
	defer rows.Close()

	var pendingTasks []gin.H
	for rows.Next() {
		var id, pertemuan int
		var courseID, courseName, title, description, fileTugas string
		var dueDate, createdAt time.Time
		var daysRemaining int
		var isOverdue int

		err := rows.Scan(&id, &courseID, &courseName, &pertemuan, &title, &description,
			&fileTugas, &dueDate, &daysRemaining, &isOverdue, &createdAt)
		if err != nil {
			continue
		}

		pendingTasks = append(pendingTasks, gin.H{
			"id":             id,
			"course_id":      courseID,
			"course_name":    courseName,
			"pertemuan":      pertemuan,
			"title":          title,
			"description":    description,
			"file_tugas":     fileTugas,
			"due_date":       dueDate.Format("2006-01-02T15:04:05"),
			"days_remaining": daysRemaining,
			"is_overdue":     isOverdue == 1,
			"created_at":     createdAt.Format("2006-01-02T15:04:05"),
		})
	}

	if pendingTasks == nil {
		pendingTasks = []gin.H{}
	}

	utils.SuccessResponse(c, gin.H{
		"pending_tasks": pendingTasks,
		"total":         len(pendingTasks),
	}, "Pending tasks retrieved")
}

// GetMahasiswaTugasList - Get daftar semua tugas dan materi untuk mata kuliah yang diambil mahasiswa
func GetMahasiswaTugasList(c *gin.Context) {
	userID, exists := c.Get("user_id")
	if !exists {
		utils.ErrorResponse(c, http.StatusUnauthorized, "Unauthorized")
		return
	}

	// Get mahasiswa ID
	var mahasiswaID int
	err := config.DB.QueryRow("SELECT id FROM mahasiswa WHERE user_id = $1", userID).Scan(&mahasiswaID)
	if err != nil {
		utils.ErrorResponse(c, http.StatusNotFound, "Mahasiswa not found")
		return
	}

	query := `
		SELECT 
			t.id,
			t.course_id,
			mk.nama AS course_name,
			t.pertemuan,
			t.title,
			COALESCE(t.description, '') AS description,
			COALESCE(t.file_tugas, '') AS file_tugas,
			t.due_date,
			COALESCE(t.type, 'tugas') AS type,
			t.created_at,
			s.id AS submission_id,
			s.grade
		FROM tugas t
		JOIN mata_kuliah mk ON t.course_id = mk.kode
		JOIN mahasiswa_mata_kuliah mmk ON mmk.mata_kuliah_kode = t.course_id
		LEFT JOIN submissions s ON s.task_id = t.id AND s.student_id = $1
		WHERE mmk.mahasiswa_id = $2
			AND t.deleted_at IS NULL
		ORDER BY t.created_at DESC
	`

	rows, err := config.DB.Query(query, mahasiswaID, mahasiswaID)
	if err != nil {
		utils.ErrorResponse(c, http.StatusInternalServerError, "Failed to fetch tasks: "+err.Error())
		return
	}
	defer rows.Close()

	var tasks []gin.H
	for rows.Next() {
		var id, pertemuan int
		var courseID, courseName, title, description, fileTugas, typeTugas string
		var dueDate, createdAt sql.NullTime
		var submissionID sql.NullInt64
		var grade sql.NullFloat64

		err := rows.Scan(&id, &courseID, &courseName, &pertemuan, &title, &description,
			&fileTugas, &dueDate, &typeTugas, &createdAt, &submissionID, &grade)
		if err != nil {
			log.Printf("Scan error in GetMahasiswaTugasList: %v", err)
			continue
		}

		taskData := gin.H{
			"id":             id,
			"course_id":      courseID,
			"course_name":    courseName,
			"pertemuan":      pertemuan,
			"title":          title,
			"description":    description,
			"file_tugas":     fileTugas,
			"type":           typeTugas,
			"has_submission": submissionID.Valid,
		}

		if dueDate.Valid {
			taskData["due_date"] = dueDate.Time.Format("2006-01-02T15:04:05")
			daysRemaining := int(dueDate.Time.Sub(time.Now()).Hours() / 24)
			taskData["days_remaining"] = daysRemaining
			taskData["is_overdue"] = dueDate.Time.Before(time.Now())
		}

		if createdAt.Valid {
			taskData["created_at"] = createdAt.Time.Format("2006-01-02T15:04:05")
		}

		if grade.Valid {
			taskData["grade"] = grade.Float64
		} else if submissionID.Valid {
			taskData["grade"] = nil
		}

		tasks = append(tasks, taskData)
	}

	if tasks == nil {
		tasks = []gin.H{}
	}

	utils.SuccessResponse(c, gin.H{
		"tasks": tasks,
		"total": len(tasks),
	}, "Tasks retrieved successfully")
}

// GetMahasiswaTugasByCourse - Get daftar tugas dan materi per mata kuliah
func GetMahasiswaTugasByCourse(c *gin.Context) {
	userID, exists := c.Get("user_id")
	if !exists {
		utils.ErrorResponse(c, http.StatusUnauthorized, "Unauthorized")
		return
	}

	courseID := c.Param("course_id")

	// Get mahasiswa ID
	var mahasiswaID int
	err := config.DB.QueryRow("SELECT id FROM mahasiswa WHERE user_id = $1", userID).Scan(&mahasiswaID)
	if err != nil {
		utils.ErrorResponse(c, http.StatusNotFound, "Mahasiswa not found")
		return
	}

	// Verify enrollment
	var enrolled bool
	err = config.DB.QueryRow("SELECT EXISTS(SELECT 1 FROM mahasiswa_mata_kuliah WHERE mahasiswa_id = $1 AND mata_kuliah_kode = $2)", mahasiswaID, courseID).Scan(&enrolled)
	if err != nil || !enrolled {
		utils.ErrorResponse(c, http.StatusForbidden, "Not enrolled in this course")
		return
	}

	query := `
		SELECT 
			t.id,
			t.course_id,
			t.pertemuan,
			t.title,
			COALESCE(t.description, '') AS description,
			COALESCE(t.file_tugas, '') AS file_tugas,
			t.due_date,
			COALESCE(t.type, 'tugas') AS type,
			t.created_at,
			s.id AS submission_id,
			s.grade
		FROM tugas t
		LEFT JOIN submissions s ON s.task_id = t.id AND s.student_id = $1
		WHERE t.course_id = $2
			AND t.deleted_at IS NULL
		ORDER BY t.created_at DESC
	`

	rows, err := config.DB.Query(query, mahasiswaID, courseID)
	if err != nil {
		utils.ErrorResponse(c, http.StatusInternalServerError, "Failed to fetch tasks: "+err.Error())
		return
	}
	defer rows.Close()

	var tasks []gin.H
	for rows.Next() {
		var id, pertemuan int
		var courseIDRes, title, description, fileTugas, typeTugas string
		var dueDate, createdAt sql.NullTime
		var submissionID sql.NullInt64
		var grade sql.NullFloat64

		err := rows.Scan(&id, &courseIDRes, &pertemuan, &title, &description,
			&fileTugas, &dueDate, &typeTugas, &createdAt, &submissionID, &grade)
		if err != nil {
			log.Printf("Scan error in GetMahasiswaTugasByCourse: %v", err)
			continue
		}

		taskData := gin.H{
			"id":             id,
			"course_id":      courseIDRes,
			"pertemuan":      pertemuan,
			"title":          title,
			"description":    description,
			"file_tugas":     fileTugas,
			"type":           typeTugas,
			"has_submission": submissionID.Valid,
		}

		if dueDate.Valid {
			taskData["due_date"] = dueDate.Time.Format("2006-01-02T15:04:05")
			daysRemaining := int(dueDate.Time.Sub(time.Now()).Hours() / 24)
			taskData["days_remaining"] = daysRemaining
			taskData["is_overdue"] = dueDate.Time.Before(time.Now())
		}

		if createdAt.Valid {
			taskData["created_at"] = createdAt.Time.Format("2006-01-02T15:04:05")
		}

		if grade.Valid {
			taskData["grade"] = grade.Float64
		} else if submissionID.Valid {
			taskData["grade"] = nil
		}

		tasks = append(tasks, taskData)
	}

	if tasks == nil {
		tasks = []gin.H{}
	}

	utils.SuccessResponse(c, gin.H{
		"tasks": tasks,
		"total": len(tasks),
	}, "Tasks retrieved successfully")
}
