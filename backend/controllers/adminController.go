package controllers

import (
	"fmt"
	"log"
	"net/http"
	"strings"

	"nf-student-hub-backend/config"
	"nf-student-hub-backend/utils"

	"github.com/gin-gonic/gin"
)

// GetAdminProfile - Mendapatkan profile admin
func GetAdminProfile(c *gin.Context) {
	userID, exists := c.Get("user_id")
	if !exists {
		utils.ErrorResponse(c, http.StatusUnauthorized, "Login dulu!")
		return
	}

	// Cek apakah user adalah admin
	var role string
	err := config.DB.QueryRow("SELECT role FROM users WHERE id = $1", userID).Scan(&role)
	if err != nil || role != "admin" {
		utils.ErrorResponse(c, http.StatusForbidden, "Hanya admin yang dapat mengakses!")
		return
	}

	// Ambil data dari tabel admin
	var adminData struct {
		ID             int     `json:"id"`
		Name           string  `json:"name"`
		Username       string  `json:"username"`
		Bio            string  `json:"bio"`
		Email          string  `json:"email"`
		ProfilePicture *string `json:"profile_picture"`
		Website        *string `json:"website"`
		Phone          *string `json:"phone"`
	}

	query := `
		SELECT a.id, a.name, a.username, a.bio, u.email, 
		       a.profile_picture, a.website, a.phone
		FROM admin a
		JOIN users u ON a.user_id = u.id
		WHERE a.user_id = $1
	`

	err = config.DB.QueryRow(query, userID).Scan(
		&adminData.ID,
		&adminData.Name,
		&adminData.Username,
		&adminData.Bio,
		&adminData.Email,
		&adminData.ProfilePicture,
		&adminData.Website,
		&adminData.Phone,
	)

	if err != nil {
		// Fallback: jika tidak ada di tabel admin, ambil dari users
		var email string
		config.DB.QueryRow("SELECT email FROM users WHERE id = $1", userID).Scan(&email)
		
		parts := strings.Split(email, "@")
		adminName := "Admin"
		if len(parts) > 0 {
			adminName = "Admin " + strings.Title(parts[0])
		}
		adminUsername := strings.ToLower(parts[0])

		utils.SuccessResponse(c, gin.H{
			"id":              userID,
			"name":            adminName,
			"username":        adminUsername,
			"email":           email,
			"role":            "admin",
			"profile_picture": nil,
			"website":         nil,
			"phone":           nil,
		}, "Admin profile retrieved")
		return
	}

	utils.SuccessResponse(c, gin.H{
		"id":              adminData.ID,
		"name":            adminData.Name,
		"username":        adminData.Username,
		"bio":             adminData.Bio,
		"email":           adminData.Email,
		"role":            "admin",
		"profile_picture": adminData.ProfilePicture,
		"website":         adminData.Website,
		"phone":           adminData.Phone,
	}, "Admin profile retrieved")
}

// === POSTINGAN ADMIN ===
func CreateAdminPost(c *gin.Context) {
	userID, exists := c.Get("user_id")
	if !exists {
		utils.ErrorResponse(c, http.StatusUnauthorized, "Login dulu!")
		return
	}

	// Cek apakah user adalah admin
	var role string
	err := config.DB.QueryRow("SELECT role FROM users WHERE id = $1", userID).Scan(&role)
	if err != nil || role != "admin" {
		utils.ErrorResponse(c, http.StatusForbidden, "Hanya admin yang dapat membuat postingan!")
		return
	}

	// Ambil name dan username dari tabel admin
	var authorName, authorUsername string
	err = config.DB.QueryRow("SELECT name, username FROM admin WHERE user_id = $1", userID).Scan(&authorName, &authorUsername)
	if err != nil || authorName == "" || authorUsername == "" {
		// Fallback ke email
		var email string
		config.DB.QueryRow("SELECT email FROM users WHERE id = $1", userID).Scan(&email)
		parts := strings.Split(email, "@")
		authorName = "Admin " + strings.Title(parts[0])
		authorUsername = strings.ToLower(parts[0])
	}

	title := c.PostForm("title")
	content := c.PostForm("content")
	if title == "" || content == "" {
		utils.ErrorResponse(c, http.StatusBadRequest, "Judul dan konten wajib diisi!")
		return
	}

	// Upload media ke database (BYTEA) — BUKAN filesystem
	var mediaURL string
	if _, err := c.FormFile("media"); err == nil {
		uid, _ := userID.(int)
		_, fileURL, uploadErr := UploadFileToDB(c, "media", uid, "admin", "post", nil, nil)
		if uploadErr != nil {
			utils.ErrorResponse(c, http.StatusBadRequest, uploadErr.Error())
			return
		}
		mediaURL = fileURL
		log.Printf("[Admin Post] Media uploaded to DB: %s", fileURL)
	}

	query := `
		INSERT INTO posts (user_id, role, title, content, media_url, author_name, author_username, likes_count, comments_count, created_at)
		VALUES ($1, 'admin', $2, $3, $4, $5, $6, 0, 0, NOW())
		RETURNING id
	`
	var postID int64
	err = config.DB.QueryRow(query, userID, title, content, mediaURL, authorName, authorUsername).Scan(&postID)
	if err != nil {
		utils.ErrorResponse(c, http.StatusInternalServerError, "Gagal simpan ke database: "+err.Error())
		return
	}

	utils.SuccessResponse(c, gin.H{
		"id":              postID,
		"title":           title,
		"content":         content,
		"media_url":       mediaURL,
		"author_name":     authorName,
		"author_username": authorUsername,
		"role":            "admin",
	}, "Postingan admin berhasil dibuat!")
}

// === GET UNPAID INVOICES ===
func GetUnpaidInvoices(c *gin.Context) {
	query := `
		SELECT ui.id, ui.student_id, ui.amount, ui.uuid, ui.status, ui.created_at,
		       m.name as student_name, m.nim as student_nim
		FROM ukt_invoices ui
		JOIN mahasiswa m ON ui.student_id = m.id
		WHERE ui.status = 'pending'
		ORDER BY ui.created_at DESC
	`

	rows, err := config.DB.Query(query)
	if err != nil {
		utils.ErrorResponse(c, http.StatusInternalServerError, "Failed to fetch unpaid invoices")
		return
	}
	defer rows.Close()

	var invoices []gin.H
	for rows.Next() {
		var id, studentID int
		var amount float64
		var uuid, status, studentName, studentNIM string
		var createdAt interface{}

		err := rows.Scan(&id, &studentID, &amount, &uuid, &status, &createdAt, &studentName, &studentNIM)
		if err != nil {
			utils.ErrorResponse(c, http.StatusInternalServerError, "Failed to scan invoice")
			return
		}

		invoices = append(invoices, gin.H{
			"id":           id,
			"student_id":   studentID,
			"amount":       amount,
			"uuid":         uuid,
			"status":       status,
			"created_at":   createdAt,
			"student_name": studentName,
			"student_nim":  studentNIM,
		})
	}

	utils.SuccessResponse(c, invoices, "Unpaid invoices retrieved successfully")
}

// === GET ALL MAHASISWA UKT STATUS (UNTUK ADMIN KEMAHASISWAAN) ===
func GetAllMahasiswaUKTStatus(c *gin.Context) {
	// Cek apakah user sudah login
	userID, exists := c.Get("user_id")
	if !exists {
		utils.ErrorResponse(c, http.StatusUnauthorized, "Login dulu!")
		return
	}

	// Cek apakah user adalah admin
	var role string
	var userEmail string
	err := config.DB.QueryRow("SELECT role, email FROM users WHERE id = $1", userID).Scan(&role, &userEmail)
	if err != nil || role != "admin" {
		utils.ErrorResponse(c, http.StatusForbidden, "Hanya admin yang dapat mengakses!")
		return
	}

	// Hanya admin dengan email kemahasiswaan@nurulfikri.ac.id yang bisa mengakses
	if userEmail != "kemahasiswaan@nurulfikri.ac.id" {
		utils.ErrorResponse(c, http.StatusForbidden, "Hanya Admin Kemahasiswaan yang dapat mengakses data UKT mahasiswa!")
		return
	}

	rows, err := config.DB.Query(`
		SELECT 
			m.id, 
			m.name, 
			m.nim, 
			COALESCE(m.sisa_ukt, 7000000) as sisa_ukt,
			COALESCE(m.total_ukt_dibayar, 0) as total_dibayar,
			(7000000 - COALESCE(m.sisa_ukt, 7000000)) as sudah_dibayar,
			CASE 
				WHEN COALESCE(m.sisa_ukt, 7000000) = 0 THEN 'LUNAS'
				WHEN COALESCE(m.sisa_ukt, 7000000) = 7000000 THEN 'BELUM BAYAR'
				ELSE 'SEBAGIAN'
			END as status_bayar,
			ROUND((COALESCE(m.total_ukt_dibayar, 0) / 7000000 * 100), 2) as persentase
		FROM mahasiswa m
		ORDER BY m.sisa_ukt ASC, m.name ASC
	`)
	if err != nil {
		utils.ErrorResponse(c, http.StatusInternalServerError, "Gagal mengambil data mahasiswa: "+err.Error())
		return
	}
	defer rows.Close()

	var mahasiswaList []gin.H
	for rows.Next() {
		var id int
		var name, nim, statusBayar string
		var sisaUKT, totalDibayar, sudahDibayar, persentase float64

		err := rows.Scan(&id, &name, &nim, &sisaUKT, &totalDibayar, &sudahDibayar, &statusBayar, &persentase)
		if err != nil {
			continue
		}

		mahasiswaList = append(mahasiswaList, gin.H{
			"id":              id,
			"nama":            name,
			"nim":             nim,
			"sisa_ukt":        sisaUKT,
			"total_dibayar":   totalDibayar,
			"sudah_dibayar":   sudahDibayar,
			"status_bayar":    statusBayar,
			"persentase":      fmt.Sprintf("%.1f%%", persentase),
			"total_ukt":       7000000,
		})
	}

	// Hitung statistik
	var stats struct {
		TotalMahasiswa   int     `json:"total_mahasiswa"`
		TotalLunas       int     `json:"total_lunas"`
		TotalBelumBayar  int     `json:"total_belum_bayar"`
		TotalSebagian    int     `json:"total_sebagian"`
		TotalPendapatan  float64 `json:"total_pendapatan"`
		TotalSisa        float64 `json:"total_sisa"`
	}

	// Query untuk statistik
	err = config.DB.QueryRow(`
		SELECT 
			COUNT(*) as total_mahasiswa,
			SUM(CASE WHEN COALESCE(sisa_ukt, 7000000) = 0 THEN 1 ELSE 0 END) as total_lunas,
			SUM(CASE WHEN COALESCE(sisa_ukt, 7000000) = 7000000 THEN 1 ELSE 0 END) as total_belum_bayar,
			SUM(CASE WHEN COALESCE(sisa_ukt, 7000000) > 0 AND COALESCE(sisa_ukt, 7000000) < 7000000 THEN 1 ELSE 0 END) as total_sebagian,
			SUM(COALESCE(total_ukt_dibayar, 0)) as total_pendapatan,
			SUM(COALESCE(sisa_ukt, 7000000)) as total_sisa
		FROM mahasiswa
	`).Scan(
		&stats.TotalMahasiswa,
		&stats.TotalLunas,
		&stats.TotalBelumBayar,
		&stats.TotalSebagian,
		&stats.TotalPendapatan,
		&stats.TotalSisa,
	)

	if err != nil {
		// Jika error, hitung dari data yang sudah ada
		stats.TotalMahasiswa = len(mahasiswaList)
		for _, m := range mahasiswaList {
			sisaUKT := m["sisa_ukt"].(float64)
			totalDibayar := m["total_dibayar"].(float64)
			stats.TotalPendapatan += totalDibayar
			stats.TotalSisa += sisaUKT
			if sisaUKT == 0 {
				stats.TotalLunas++
			} else if sisaUKT == 7000000 {
				stats.TotalBelumBayar++
			} else {
				stats.TotalSebagian++
			}
		}
	}

	utils.SuccessResponse(c, gin.H{
		"mahasiswa": mahasiswaList,
		"statistik": stats,
	}, "Data UKT semua mahasiswa berhasil diambil")
}

// GetRiwayatPembayaranByMahasiswaID mengembalikan riwayat pembayaran oleh admin untuk mahasiswa tertentu
func GetRiwayatPembayaranByMahasiswaID(c *gin.Context) {
	mahasiswaID := c.Param("mahasiswa_id")

	// Cek apakah user sudah login
	userID, exists := c.Get("user_id")
	if !exists {
		utils.ErrorResponse(c, http.StatusUnauthorized, "Login dulu!")
		return
	}

	// Cek apakah user adalah admin
	var role string
	var userEmail string
	err := config.DB.QueryRow("SELECT role, email FROM users WHERE id = $1", userID).Scan(&role, &userEmail)
	if err != nil || role != "admin" {
		utils.ErrorResponse(c, http.StatusForbidden, "Hanya admin yang dapat mengakses!")
		return
	}

	// Hanya admin dengan email kemahasiswaan@nurulfikri.ac.id yang bisa mengakses
	if userEmail != "kemahasiswaan@nurulfikri.ac.id" {
		utils.ErrorResponse(c, http.StatusForbidden, "Hanya Admin Kemahasiswaan yang dapat mengakses riwayat pembayaran!")
		return
	}

	rows, err := config.DB.Query(`
		SELECT rp.id, rp.invoice_uuid, rp.metode, rp.nominal, rp.biaya_admin, rp.total_dibayar, rp.status, rp.tanggal,
		       m.name as mahasiswa_name, m.nim
		FROM riwayat_pembayaran rp
		JOIN mahasiswa m ON rp.mahasiswa_id = m.id
		WHERE rp.mahasiswa_id = $1
		ORDER BY rp.tanggal DESC
	`, mahasiswaID)
	if err != nil {
		utils.ErrorResponse(c, http.StatusInternalServerError, "Gagal mengambil riwayat pembayaran: "+err.Error())
		return
	}
	defer rows.Close()

	var riwayat []gin.H
	for rows.Next() {
		var id int
		var invoiceUUID, metode, status, mahasiswaName, nim string
		var nominal, biayaAdmin, totalDibayar float64
		var tanggal string

		err := rows.Scan(&id, &invoiceUUID, &metode, &nominal, &biayaAdmin, &totalDibayar, &status, &tanggal, &mahasiswaName, &nim)
		if err != nil {
			continue
		}

		riwayat = append(riwayat, gin.H{
			"id":             id,
			"invoice_uuid":   invoiceUUID,
			"metode":         metode,
			"nominal":        nominal,
			"biaya_admin":    biayaAdmin,
			"total_dibayar":  totalDibayar,
			"status":         status,
			"tanggal":        tanggal,
			"mahasiswa_name": mahasiswaName,
			"nim":            nim,
		})
	}

	utils.SuccessResponse(c, riwayat, "Riwayat pembayaran retrieved")
}

// SendReminder mengirim pengingat pembayaran
func SendReminder(c *gin.Context) {
	mahasiswaID := c.Param("mahasiswa_id")

	// Cek apakah user sudah login
	userID, exists := c.Get("user_id")
	if !exists {
		utils.ErrorResponse(c, http.StatusUnauthorized, "Login dulu!")
		return
	}

	// Cek apakah user adalah admin
	var role string
	var userEmail string
	err := config.DB.QueryRow("SELECT role, email FROM users WHERE id = $1", userID).Scan(&role, &userEmail)
	if err != nil || role != "admin" {
		utils.ErrorResponse(c, http.StatusForbidden, "Hanya admin yang dapat mengirim reminder!")
		return
	}

	// Hanya admin dengan email kemahasiswaan@nurulfikri.ac.id yang bisa mengakses
	if userEmail != "kemahasiswaan@nurulfikri.ac.id" {
		utils.ErrorResponse(c, http.StatusForbidden, "Hanya Admin Kemahasiswaan yang dapat mengirim reminder!")
		return
	}

	var mahasiswa struct {
		Name  string `json:"name"`
		Email string `json:"email"`
		SisaUKT float64 `json:"sisa_ukt"`
	}

	err = config.DB.QueryRow(`
		SELECT m.name, u.email, COALESCE(m.sisa_ukt, 7000000)
		FROM mahasiswa m
		JOIN users u ON m.user_id = u.id
		WHERE m.id = $1
	`, mahasiswaID).Scan(&mahasiswa.Name, &mahasiswa.Email, &mahasiswa.SisaUKT)

	if err != nil {
		utils.ErrorResponse(c, http.StatusNotFound, "Mahasiswa tidak ditemukan: "+err.Error())
		return
	}

	// TODO: Implementasi pengiriman email
	// Ini adalah stub implementation
	fmt.Printf("Mengirim email pengingat ke %s (%s) - Sisa UKT: Rp %.0f\n", 
		mahasiswa.Name, mahasiswa.Email, mahasiswa.SisaUKT)

	utils.SuccessResponse(c, gin.H{
		"mahasiswa": mahasiswa.Name,
		"email": mahasiswa.Email,
		"sisa_ukt": mahasiswa.SisaUKT,
	}, "Pengingat telah dikirim")
}