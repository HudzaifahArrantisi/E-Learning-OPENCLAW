package controllers

import (
	"database/sql"
	"fmt"
	"log"
	"net/http"

	"nf-student-hub-backend/config"
	"nf-student-hub-backend/utils"

	"github.com/gin-gonic/gin"
)

// =============================================
// SUPER DOSEN CONTROLLER - Kelola Mata Kuliah
// =============================================

// SuperDosenGetCourses - GET /api/dosen/superdosen/matkul?filter=all|cyber|ai
// Mengambil semua matkul semester 4 dengan filter kategori.
func SuperDosenGetCourses(c *gin.Context) {
	filter := c.DefaultQuery("filter", "all")

	query := `
		SELECT 
			mk.kode, mk.nama, mk.sks, mk.hari, mk.jam_mulai, mk.jam_selesai,
			mk.semester, COALESCE(mk.kategori, 'wajib') as kategori,
			COALESCE(d.name, 'N/A') as dosen_name,
			(SELECT COUNT(DISTINCT mmk.mahasiswa_id) FROM mahasiswa_mata_kuliah mmk WHERE mmk.mata_kuliah_kode = mk.kode) as student_count
		FROM mata_kuliah mk
		LEFT JOIN dosen d ON mk.dosen_id = d.id
		WHERE mk.semester = 4
	`
	args := []interface{}{}

	switch filter {
	case "cyber":
		query += " AND mk.kategori = $1"
		args = append(args, "peminatan_cs")
	case "ai":
		query += " AND mk.kategori = $1"
		args = append(args, "peminatan_ai")
	case "wajib":
		query += " AND (mk.kategori = $1 OR mk.kategori IS NULL)"
		args = append(args, "wajib")
	// "all" — tidak tambah WHERE
	}

	query += `
		ORDER BY 
			CASE COALESCE(mk.kategori, 'wajib')
				WHEN 'wajib' THEN 1
				WHEN 'peminatan_cs' THEN 2
				WHEN 'peminatan_ai' THEN 3
			END,
			mk.kode
	`

	rows, err := config.DB.Query(query, args...)
	if err != nil {
		utils.ErrorResponse(c, http.StatusInternalServerError, "Gagal mengambil data matkul")
		return
	}
	defer rows.Close()

	var courses []gin.H
	for rows.Next() {
		var kode, nama, hari, jamMulai, jamSelesai, dosenName, kategoriVal string
		var sks, semester, studentCount int

		if err := rows.Scan(&kode, &nama, &sks, &hari, &jamMulai, &jamSelesai, &semester, &kategoriVal, &dosenName, &studentCount); err != nil {
			log.Printf("[SuperDosen] scan error: %v", err)
			continue
		}

		courses = append(courses, gin.H{
			"kode":          kode,
			"nama":          nama,
			"sks":           sks,
			"hari":          hari,
			"jam_mulai":     jamMulai,
			"jam_selesai":   jamSelesai,
			"semester":      semester,
			"kategori":      kategoriVal,
			"dosen_name":    dosenName,
			"student_count": studentCount,
		})
	}

	utils.SuccessResponse(c, courses, "Matkul berhasil diambil")
}

// SuperDosenCreateCourse - POST /api/dosen/superdosen/matkul
// Membuat mata kuliah baru.
func SuperDosenCreateCourse(c *gin.Context) {
	var input struct {
		Kode      string `json:"kode" binding:"required"`
		Nama      string `json:"nama" binding:"required"`
		SKS       int    `json:"sks" binding:"required,min=1,max=6"`
		Hari      string `json:"hari" binding:"required"`
		JamMulai  string `json:"jam_mulai" binding:"required"`
		JamSelesai string `json:"jam_selesai" binding:"required"`
		Semester  int    `json:"semester"`
		Kategori  string `json:"kategori" binding:"required"`
		DosenID   int    `json:"dosen_id"`
	}

	if err := c.ShouldBindJSON(&input); err != nil {
		utils.ValidationError(c, "Data tidak valid: "+err.Error())
		return
	}

	// Validasi kategori
	validKategori := map[string]bool{
		"wajib":         true,
		"peminatan_cs":  true,
		"peminatan_ai":  true,
	}
	if !validKategori[input.Kategori] {
		utils.ValidationError(c, "Kategori harus: wajib, peminatan_cs, atau peminatan_ai")
		return
	}

	// Validasi hari
	validHari := map[string]bool{
		"Senin": true, "Selasa": true, "Rabu": true,
		"Kamis": true, "Jumat": true, "Sabtu": true, "Minggu": true,
	}
	if !validHari[input.Hari] {
		utils.ValidationError(c, "Hari tidak valid")
		return
	}

	// Default semester 4
	if input.Semester == 0 {
		input.Semester = 4
	}

	// Cek kode unik
	var exists bool
	config.DB.QueryRow("SELECT EXISTS(SELECT 1 FROM mata_kuliah WHERE kode = $1)", input.Kode).Scan(&exists)
	if exists {
		utils.ErrorResponse(c, http.StatusConflict, fmt.Sprintf("Kode mata kuliah '%s' sudah digunakan", input.Kode))
		return
	}

	// Validasi dosen_id jika diberikan
	dosenID := input.DosenID
	if dosenID == 0 {
		// Default ke dosen pertama yang tersedia
		config.DB.QueryRow("SELECT id FROM dosen ORDER BY id LIMIT 1").Scan(&dosenID)
	} else {
		var dosenExists bool
		config.DB.QueryRow("SELECT EXISTS(SELECT 1 FROM dosen WHERE id = $1)", dosenID).Scan(&dosenExists)
		if !dosenExists {
			utils.ValidationError(c, "Dosen ID tidak ditemukan")
			return
		}
	}

	query := `
		INSERT INTO mata_kuliah (kode, nama, sks, dosen_id, hari, jam_mulai, jam_selesai, semester, kategori)
		VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
	`
	_, err := config.DB.Exec(query, input.Kode, input.Nama, input.SKS, dosenID, input.Hari, input.JamMulai, input.JamSelesai, input.Semester, input.Kategori)
	if err != nil {
		utils.ErrorResponse(c, http.StatusInternalServerError, "Gagal membuat mata kuliah: "+err.Error())
		return
	}

	log.Printf("[SuperDosen] Matkul created: kode=%s, nama=%s, kategori=%s", input.Kode, input.Nama, input.Kategori)

	utils.SuccessResponse(c, gin.H{
		"kode":     input.Kode,
		"nama":     input.Nama,
		"sks":      input.SKS,
		"hari":     input.Hari,
		"kategori": input.Kategori,
	}, "Mata kuliah berhasil ditambahkan")
}

// SuperDosenUpdateCourse - PUT /api/dosen/superdosen/matkul/:kode
// Update mata kuliah yang sudah ada.
func SuperDosenUpdateCourse(c *gin.Context) {
	kode := c.Param("kode")
	if kode == "" {
		utils.ValidationError(c, "Kode mata kuliah diperlukan")
		return
	}

	// Cek matkul exists
	var currentNama string
	err := config.DB.QueryRow("SELECT nama FROM mata_kuliah WHERE kode = $1", kode).Scan(&currentNama)
	if err != nil {
		utils.ErrorResponse(c, http.StatusNotFound, "Mata kuliah tidak ditemukan")
		return
	}

	var input struct {
		Nama       string `json:"nama"`
		SKS        int    `json:"sks"`
		Hari       string `json:"hari"`
		JamMulai   string `json:"jam_mulai"`
		JamSelesai string `json:"jam_selesai"`
		Kategori   string `json:"kategori"`
		DosenID    int    `json:"dosen_id"`
	}

	if err := c.ShouldBindJSON(&input); err != nil {
		utils.ValidationError(c, "Data tidak valid: "+err.Error())
		return
	}

	// Validasi kategori jika diberikan
	if input.Kategori != "" {
		validKategori := map[string]bool{
			"wajib": true, "peminatan_cs": true, "peminatan_ai": true,
		}
		if !validKategori[input.Kategori] {
			utils.ValidationError(c, "Kategori harus: wajib, peminatan_cs, atau peminatan_ai")
			return
		}
	}

	// Build dynamic update query
	setClauses := []string{}
	args := []interface{}{}
	argIndex := 1

	if input.Nama != "" {
		setClauses = append(setClauses, fmt.Sprintf("nama = $%d", argIndex))
		args = append(args, input.Nama)
		argIndex++
	}
	if input.SKS > 0 {
		setClauses = append(setClauses, fmt.Sprintf("sks = $%d", argIndex))
		args = append(args, input.SKS)
		argIndex++
	}
	if input.Hari != "" {
		setClauses = append(setClauses, fmt.Sprintf("hari = $%d", argIndex))
		args = append(args, input.Hari)
		argIndex++
	}
	if input.JamMulai != "" {
		setClauses = append(setClauses, fmt.Sprintf("jam_mulai = $%d", argIndex))
		args = append(args, input.JamMulai)
		argIndex++
	}
	if input.JamSelesai != "" {
		setClauses = append(setClauses, fmt.Sprintf("jam_selesai = $%d", argIndex))
		args = append(args, input.JamSelesai)
		argIndex++
	}
	if input.Kategori != "" {
		setClauses = append(setClauses, fmt.Sprintf("kategori = $%d", argIndex))
		args = append(args, input.Kategori)
		argIndex++
	}
	if input.DosenID > 0 {
		// Validasi dosen exists
		var dosenExists bool
		config.DB.QueryRow("SELECT EXISTS(SELECT 1 FROM dosen WHERE id = $1)", input.DosenID).Scan(&dosenExists)
		if !dosenExists {
			utils.ValidationError(c, "Dosen ID tidak ditemukan")
			return
		}
		setClauses = append(setClauses, fmt.Sprintf("dosen_id = $%d", argIndex))
		args = append(args, input.DosenID)
		argIndex++
	}

	if len(setClauses) == 0 {
		utils.ValidationError(c, "Tidak ada field yang diupdate")
		return
	}

	// Add kode as last arg
	query := fmt.Sprintf("UPDATE mata_kuliah SET %s WHERE kode = $%d",
		joinStrings(setClauses, ", "), argIndex)
	args = append(args, kode)

	result, err := config.DB.Exec(query, args...)
	if err != nil {
		utils.ErrorResponse(c, http.StatusInternalServerError, "Gagal mengupdate mata kuliah: "+err.Error())
		return
	}

	rowsAffected, _ := result.RowsAffected()
	log.Printf("[SuperDosen] Matkul updated: kode=%s, rows=%d", kode, rowsAffected)

	utils.SuccessResponse(c, gin.H{
		"kode":          kode,
		"rows_affected": rowsAffected,
	}, "Mata kuliah berhasil diupdate")
}

// SuperDosenDeleteCourse - DELETE /api/dosen/superdosen/matkul/:kode
// Hapus mata kuliah.
func SuperDosenDeleteCourse(c *gin.Context) {
	kode := c.Param("kode")
	if kode == "" {
		utils.ValidationError(c, "Kode mata kuliah diperlukan")
		return
	}

	// Cek matkul exists
	var nama string
	err := config.DB.QueryRow("SELECT nama FROM mata_kuliah WHERE kode = $1", kode).Scan(&nama)
	if err != nil {
		utils.ErrorResponse(c, http.StatusNotFound, "Mata kuliah tidak ditemukan")
		return
	}

	// Cek apakah ada enrollment aktif
	var enrollmentCount int
	config.DB.QueryRow("SELECT COUNT(*) FROM mahasiswa_mata_kuliah WHERE mata_kuliah_kode = $1", kode).Scan(&enrollmentCount)
	if enrollmentCount > 0 {
		utils.ErrorResponse(c, http.StatusConflict,
			fmt.Sprintf("Tidak dapat menghapus '%s' karena masih ada %d mahasiswa terdaftar", nama, enrollmentCount))
		return
	}

	_, err = config.DB.Exec("DELETE FROM mata_kuliah WHERE kode = $1", kode)
	if err != nil {
		utils.ErrorResponse(c, http.StatusInternalServerError, "Gagal menghapus mata kuliah: "+err.Error())
		return
	}

	log.Printf("[SuperDosen] Matkul deleted: kode=%s, nama=%s", kode, nama)

	utils.SuccessResponse(c, nil, fmt.Sprintf("Mata kuliah '%s' berhasil dihapus", nama))
}

// SuperDosenGetDosenList - GET /api/dosen/superdosen/dosen-list
// Ambil daftar dosen untuk dropdown assignment saat membuat matkul baru.
func SuperDosenGetDosenList(c *gin.Context) {
	rows, err := config.DB.Query(`
		SELECT d.id, d.name, d.nip, u.email
		FROM dosen d
		JOIN users u ON d.user_id = u.id
		ORDER BY d.name
	`)
	if err != nil {
		utils.ErrorResponse(c, http.StatusInternalServerError, "Gagal mengambil daftar dosen")
		return
	}
	defer rows.Close()

	var dosenList []gin.H
	for rows.Next() {
		var id int
		var name, nip string
		var email sql.NullString

		if err := rows.Scan(&id, &name, &nip, &email); err != nil {
			continue
		}

		dosenList = append(dosenList, gin.H{
			"id":    id,
			"name":  name,
			"nip":   nip,
			"email": email.String,
		})
	}

	utils.SuccessResponse(c, dosenList, "Daftar dosen berhasil diambil")
}

// SuperDosenCheckAccess - GET /api/dosen/superdosen/check
// Endpoint untuk frontend mengecek apakah user adalah super dosen.
func SuperDosenCheckAccess(c *gin.Context) {
	// Jika middleware SuperDosenMiddleware sudah memvalidasi,
	// sampai di sini artinya user adalah super dosen.
	utils.SuccessResponse(c, gin.H{
		"is_super_dosen": true,
	}, "Super Dosen access confirmed")
}

// joinStrings - helper untuk menggabungkan string slice
func joinStrings(strs []string, sep string) string {
	result := ""
	for i, s := range strs {
		if i > 0 {
			result += sep
		}
		result += s
	}
	return result
}
