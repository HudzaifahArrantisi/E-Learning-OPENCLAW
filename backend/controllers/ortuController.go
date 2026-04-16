package controllers

import (
	"net/http"
	"strconv"
	"time"
	
	"nf-student-hub-backend/config"
	"nf-student-hub-backend/utils"

	"github.com/gin-gonic/gin"
)

// GetOrtuProfile - Get profile orangtua
func GetOrtuProfile(c *gin.Context) {
	userID, exists := c.Get("user_id")
	if !exists {
		utils.ErrorResponse(c, http.StatusUnauthorized, "Unauthorized")
		return
	}

	var ortu struct {
		ID        int    `json:"id"`
		Name      string `json:"name"`
		Email     string `json:"email"`
		ChildID   int    `json:"child_id"`
		ChildName string `json:"child_name"`
		ChildNIM  string `json:"child_nim"`
	}

	// Query dengan join ke users dan mahasiswa
	err := config.DB.QueryRow(`
		SELECT o.id, o.name, u.email, o.child_id, m.name as child_name, m.nim as child_nim
		FROM ortu o
		JOIN users u ON o.user_id = u.id
		JOIN mahasiswa m ON o.child_id = m.id
		WHERE o.user_id = $1
	`, userID).Scan(&ortu.ID, &ortu.Name, &ortu.Email, &ortu.ChildID, &ortu.ChildName, &ortu.ChildNIM)

	if err != nil {
		utils.ErrorResponse(c, http.StatusNotFound, "Profile orangtua tidak ditemukan")
		return
	}

	utils.SuccessResponse(c, ortu, "Profile orangtua retrieved")
}


func PayChildInvoice(c *gin.Context) {
	utils.ErrorResponse(c, http.StatusMethodNotAllowed, "Gunakan endpoint /api/ukt/bayar untuk pembayaran")
}


// GetChildAttendance - Get kehadiran anak dengan detail lengkap
func GetChildAttendance(c *gin.Context) {
	studentIDStr := c.Param("student_id")
	if studentIDStr == "" {
		utils.ValidationError(c, "Student ID is required")
		return
	}

	studentID, err := strconv.Atoi(studentIDStr)
	if err != nil {
		utils.ValidationError(c, "Invalid student ID")
		return
	}

	// Verify that the parent is authorized to view this student's data
	userID, exists := c.Get("user_id")
	if !exists {
		utils.ErrorResponse(c, http.StatusInternalServerError, "User ID not found in context")
		return
	}

	// Check if this parent is associated with the student
	var childID int
	query := `SELECT child_id FROM ortu WHERE user_id = $1`
	err = config.DB.QueryRow(query, userID.(int)).Scan(&childID)
	if err != nil {
		utils.ErrorResponse(c, http.StatusInternalServerError, "Failed to verify parent-student relationship")
		return
	}

	if childID != studentID {
		utils.ErrorResponse(c, http.StatusForbidden, "Not authorized to view this student's data")
		return
	}

	// Query attendance records for the student dengan detail lengkap
	query = `
		SELECT 
			a.id, 
			mk.nama as mata_kuliah,
			d.name as dosen,
			a.status, 
			TO_CHAR(a.created_at, 'DD Month YYYY') as tanggal,
			TO_CHAR(a.created_at, 'HH24:MI') as jam,
			CASE 
				WHEN a.status = 'hadir' THEN 'Hadir'
				WHEN a.status = 'izin' THEN 'Izin'
				WHEN a.status = 'sakit' THEN 'Sakit'
				WHEN a.status = 'alpa' THEN 'Alpa'
				ELSE 'Tidak Hadir'
			END as status_label,
			mk.hari as hari_kuliah,
			mk.jam_mulai,
			mk.jam_selesai
		FROM attendance a
		JOIN attendance_sessions ases ON a.session_id = ases.id
		JOIN mata_kuliah mk ON ases.course_id = mk.kode
		JOIN dosen d ON mk.dosen_id = d.id
		WHERE a.student_id = $1
		ORDER BY a.created_at DESC
		LIMIT 100
	`

	rows, err := config.DB.Query(query, studentID)
	if err != nil {
		utils.ErrorResponse(c, http.StatusInternalServerError, "Failed to fetch attendance records")
		return
	}
	defer rows.Close()

	var attendances []gin.H
	var summary struct {
		Total       int `json:"total"`
		Hadir       int `json:"hadir"`
		Izin        int `json:"izin"`
		Sakit       int `json:"sakit"`
		Alpa        int `json:"alpa"`
		Persentase  float64 `json:"persentase"`
	}

	for rows.Next() {
		var id int
		var mataKuliah, dosen, status, tanggal, jam, statusLabel, hariKuliah, jamMulai, jamSelesai string

		err := rows.Scan(&id, &mataKuliah, &dosen, &status, &tanggal, &jam, &statusLabel, &hariKuliah, &jamMulai, &jamSelesai)
		if err != nil {
			continue
		}

		// Update summary
		summary.Total++
		switch status {
		case "hadir":
			summary.Hadir++
		case "izin":
			summary.Izin++
		case "sakit":
			summary.Sakit++
		case "alpa":
			summary.Alpa++
		}

		attendances = append(attendances, gin.H{
			"id":           id,
			"mata_kuliah":  mataKuliah,
			"dosen":        dosen,
			"status":       status,
			"status_label": statusLabel,
			"tanggal":      tanggal,
			"jam":          jam,
			"hari_kuliah":  hariKuliah,
			"jam_mulai":    jamMulai,
			"jam_selesai":  jamSelesai,
		})
	}

	// Hitung persentase kehadiran
	if summary.Total > 0 {
		summary.Persentase = float64(summary.Hadir) / float64(summary.Total) * 100
	}

	// Get child info
	var childInfo struct {
		Name string `json:"name"`
		NIM  string `json:"nim"`
	}

	config.DB.QueryRow(`
		SELECT name, nim FROM mahasiswa WHERE id = $1
	`, studentID).Scan(&childInfo.Name, &childInfo.NIM)

	utils.SuccessResponse(c, gin.H{
		"child_info":  childInfo,
		"summary":     summary,
		"attendances": attendances,
	}, "Attendance records retrieved successfully")
}

// GetChildAttendanceToday - Get kehadiran anak hari ini
func GetChildAttendanceToday(c *gin.Context) {
	userID, exists := c.Get("user_id")
	if !exists {
		utils.ErrorResponse(c, http.StatusUnauthorized, "Unauthorized")
		return
	}

	// Get child ID
	var childID int
	err := config.DB.QueryRow("SELECT child_id FROM ortu WHERE user_id = $1", userID).Scan(&childID)
	if err != nil {
		utils.ErrorResponse(c, http.StatusNotFound, "Data anak tidak ditemukan")
		return
	}

	// Get hari ini
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

	// Query jadwal hari ini dengan status kehadiran
	query := `
		SELECT 
			mk.kode,
			mk.nama as mata_kuliah,
			mk.hari,
			mk.jam_mulai,
			mk.jam_selesai,
			d.name as dosen,
			COALESCE(a.status, 'belum_absen') as status_absen,
			COALESCE(TO_CHAR(a.created_at, 'HH24:MI'), '') as waktu_absen
		FROM mata_kuliah mk
		JOIN dosen d ON mk.dosen_id = d.id
		JOIN mahasiswa_mata_kuliah mmk ON mk.kode = mmk.mata_kuliah_kode
		LEFT JOIN (
			SELECT a.student_id, ases.course_id, a.status, a.created_at
			FROM attendance a
			JOIN attendance_sessions ases ON a.session_id = ases.id
			WHERE (a.created_at)::date = CURRENT_DATE
		) a ON mk.kode = a.course_id AND mmk.mahasiswa_id = a.student_id
		WHERE mmk.mahasiswa_id = $1 AND mk.hari = $2
		ORDER BY mk.jam_mulai
	`

	rows, err := config.DB.Query(query, childID, hariIni)
	if err != nil {
		utils.ErrorResponse(c, http.StatusInternalServerError, "Failed to fetch today's attendance")
		return
	}
	defer rows.Close()

	var todaySchedule []gin.H
	for rows.Next() {
		var kode, mataKuliah, hari, jamMulai, jamSelesai, dosen, statusAbsen, waktuAbsen string
		
		err := rows.Scan(&kode, &mataKuliah, &hari, &jamMulai, &jamSelesai, &dosen, &statusAbsen, &waktuAbsen)
		if err != nil {
			continue
		}

		todaySchedule = append(todaySchedule, gin.H{
			"kode":         kode,
			"mata_kuliah":  mataKuliah,
			"hari":         hari,
			"jam_mulai":    jamMulai,
			"jam_selesai":  jamSelesai,
			"dosen":        dosen,
			"status_absen": statusAbsen,
			"waktu_absen":  waktuAbsen,
		})
	}

	// Get child info
	var childInfo struct {
		Name string `json:"name"`
		NIM  string `json:"nim"`
	}

	config.DB.QueryRow(`
		SELECT name, nim FROM mahasiswa WHERE id = $1
	`, childID).Scan(&childInfo.Name, &childInfo.NIM)

	utils.SuccessResponse(c, gin.H{
		"child_info":    childInfo,
		"hari_ini":      hariIni,
		"today_schedule": todaySchedule,
	}, "Today's attendance retrieved successfully")
}

// GetChildProfile - Get profil lengkap anak
func GetChildProfile(c *gin.Context) {
	userID, exists := c.Get("user_id")
	if !exists {
		utils.ErrorResponse(c, http.StatusUnauthorized, "Unauthorized")
		return
	}

	var child struct {
		ID       int    `json:"id"`
		Name     string `json:"name"`
		NIM      string `json:"nim"`
		Email    string `json:"email"`
		Phone    string `json:"phone"`
		Address  string `json:"address"`
		Faculty  string `json:"faculty"`
		Major    string `json:"major"`
		Semester int    `json:"semester"`
		Photo    string `json:"photo"`
	}

	// Query data anak lengkap
	err := config.DB.QueryRow(`
		SELECT m.id, m.name, m.nim, u.email, COALESCE(m.phone, ''), 
			   COALESCE(m.alamat, ''), COALESCE(m.faculty, ''), 
			   COALESCE(m.major, ''), COALESCE(m.semester, 1), 
			   COALESCE(m.photo, '')
		FROM ortu o
		JOIN mahasiswa m ON o.child_id = m.id
		JOIN users u ON m.user_id = u.id
		WHERE o.user_id = $1
	`, userID).Scan(&child.ID, &child.Name, &child.NIM, &child.Email, &child.Phone, 
		&child.Address, &child.Faculty, &child.Major, &child.Semester, &child.Photo)

	if err != nil {
		utils.ErrorResponse(c, http.StatusNotFound, "Data anak tidak ditemukan")
		return
	}

	utils.SuccessResponse(c, child, "Profil anak retrieved")
}

// GetChildAcademicInfo - Get informasi akademik anak
func GetChildAcademicInfo(c *gin.Context) {
	userID, exists := c.Get("user_id")
	if !exists {
		utils.ErrorResponse(c, http.StatusUnauthorized, "Unauthorized")
		return
	}

	// Get child ID
	var childID int
	err := config.DB.QueryRow("SELECT child_id FROM ortu WHERE user_id = $1", userID).Scan(&childID)
	if err != nil {
		utils.ErrorResponse(c, http.StatusNotFound, "Data anak tidak ditemukan")
		return
	}

	// Get courses dengan jadwal
	rows, err := config.DB.Query(`
		SELECT mk.kode, mk.nama, d.name as dosen, mk.sks, mk.semester, 
			   mk.hari, mk.jam_mulai, mk.jam_selesai
		FROM mata_kuliah mk
		JOIN dosen d ON mk.dosen_id = d.id
		WHERE mk.kode IN (
			SELECT mata_kuliah_kode 
			FROM mahasiswa_mata_kuliah 
			WHERE mahasiswa_id = $1
		)
		ORDER BY 
			CASE mk.hari
				WHEN 'Senin' THEN 1
				WHEN 'Selasa' THEN 2
				WHEN 'Rabu' THEN 3
				WHEN 'Kamis' THEN 4
				WHEN 'Jumat' THEN 5
				WHEN 'Sabtu' THEN 6
				WHEN 'Minggu' THEN 7
			END,
			mk.jam_mulai
	`, childID)

	if err != nil {
		utils.ErrorResponse(c, http.StatusInternalServerError, "Failed to fetch academic info")
		return
	}
	defer rows.Close()

	var courses []gin.H
	for rows.Next() {
		var kode, nama, dosen, hari, jamMulai, jamSelesai string
		var sks, semester int

		err := rows.Scan(&kode, &nama, &dosen, &sks, &semester, &hari, &jamMulai, &jamSelesai)
		if err != nil {
			continue
		}

		courses = append(courses, gin.H{
			"kode":         kode,
			"nama":         nama,
			"dosen":        dosen,
			"sks":          sks,
			"semester":     semester,
			"hari":         hari,
			"jam_mulai":    jamMulai,
			"jam_selesai":  jamSelesai,
		})
	}

	utils.SuccessResponse(c, gin.H{
		"courses": courses,
	}, "Informasi akademik anak retrieved")
}