package controllers

import (
	"bytes"
	"encoding/json"
	"fmt"
	"io/ioutil"
	"net/http"
	"os"
	"time"

	"nf-student-hub-backend/config"
	"nf-student-hub-backend/utils"

	"github.com/gin-gonic/gin"
	"github.com/google/uuid"
)

// untuk buat pembayaran di pakassir 
type PakasirCreateRequest struct {
	Project string `json:"project"`
	OrderID string `json:"order_id"`
	Amount  int64  `json:"amount"`
	APIKey  string `json:"api_key"`
}

// ini respon dari pakasir buat pembayaran 
type PakasirCreateResponse struct {
	Payment struct {
		Project       string `json:"project"`
		OrderID       string `json:"order_id"`
		Amount        int64  `json:"amount"`
		Fee           int64  `json:"fee"`
		TotalPayment  int64  `json:"total_payment"`
		PaymentMethod string `json:"payment_method"`
		PaymentNumber string `json:"payment_number"`
		ExpiredAt     string `json:"expired_at"`
	} `json:"payment"`
}

// PakasirWebhookPayload untuk webhook dari Pakasir.com
type PakasirWebhookPayload struct {
	Amount        int64  `json:"amount"`
	OrderID       string `json:"order_id"`
	Project       string `json:"project"`
	Status        string `json:"status"`
	PaymentMethod string `json:"payment_method"`
	CompletedAt   string `json:"completed_at"`
}

// PaymentResponse - Response untuk pembayaran
type PaymentResponse struct {
	UUID          string  `json:"uuid"`
	Metode        string  `json:"metode"`
	Nominal       float64 `json:"nominal"`
	BiayaAdmin    float64 `json:"biaya_admin"`
	TotalDibayar  float64 `json:"total_dibayar"`
	QRCode        string  `json:"qrcode,omitempty"`
	PaymentNumber string  `json:"payment_number,omitempty"`
	PaymentMethod string  `json:"payment_method"`
	PaymentURL    string  `json:"payment_url,omitempty"`
	ExpiredTime   string  `json:"expired_time"`
	Message       string  `json:"message"`
	Status        string  `json:"status"`
}

// GetSisaUKT mengembalikan sisa UKT mahasiswa
func GetSisaUKT(c *gin.Context) {
	userID, exists := c.Get("user_id")
	if !exists {
		utils.ErrorResponse(c, http.StatusUnauthorized, "Unauthorized")
		return
	}

	var mahasiswaID int
	role, _ := c.Get("role")
	
	if role == "orangtua" {
		err := config.DB.QueryRow("SELECT child_id FROM ortu WHERE user_id = $1", userID).Scan(&mahasiswaID)
		if err != nil {
			utils.ErrorResponse(c, http.StatusNotFound, "Data orangtua tidak ditemukan")
			return
		}
	} else {
		err := config.DB.QueryRow("SELECT id FROM mahasiswa WHERE user_id = $1", userID).Scan(&mahasiswaID)
		if err != nil {
			utils.ErrorResponse(c, http.StatusNotFound, "Mahasiswa not found")
			return
		}
	}

	var sisaUKT float64
	err := config.DB.QueryRow("SELECT COALESCE(sisa_ukt, 7000000) FROM mahasiswa WHERE id = $1", mahasiswaID).Scan(&sisaUKT)
	if err != nil {
		utils.ErrorResponse(c, http.StatusInternalServerError, "Gagal mengambil sisa UKT")
		return
	}

	utils.SuccessResponse(c, gin.H{"sisa_ukt": sisaUKT}, "Sisa UKT retrieved")
}

// GetRiwayatPembayaran mengembalikan riwayat pembayaran dengan filter
func GetRiwayatPembayaran(c *gin.Context) {
	userID, exists := c.Get("user_id")
	if !exists {
		utils.ErrorResponse(c, http.StatusUnauthorized, "Unauthorized")
		return
	}

	// Get filter from query parameter
	statusFilter := c.Query("status")
	if statusFilter == "" {
		statusFilter = "all"
	}

	var mahasiswaID int
	role, _ := c.Get("role")
	
	if role == "orangtua" {
		err := config.DB.QueryRow("SELECT child_id FROM ortu WHERE user_id = $1", userID).Scan(&mahasiswaID)
		if err != nil {
			utils.ErrorResponse(c, http.StatusNotFound, "Data orangtua tidak ditemukan")
			return
		}
	} else {
		err := config.DB.QueryRow("SELECT id FROM mahasiswa WHERE user_id = $1", userID).Scan(&mahasiswaID)
		if err != nil {
			utils.ErrorResponse(c, http.StatusNotFound, "Mahasiswa not found")
			return
		}
	}

	// Build query based on filter
	query := `
		SELECT id, invoice_uuid, metode, nominal, biaya_admin, total_dibayar, status, tanggal, invoice_url, expired_at,
		       payment_method, payment_number, pakasir_order_id
		FROM riwayat_pembayaran
		WHERE mahasiswa_id = $1
	`
	params := []interface{}{mahasiswaID}

	if statusFilter != "all" {
		query += " AND status = $2"
		params = append(params, statusFilter)
	}

	query += " ORDER BY tanggal DESC"

	rows, err := config.DB.Query(query, params...)
	if err != nil {
		utils.SuccessResponse(c, []gin.H{}, "Riwayat pembayaran retrieved")
		return
	}
	defer rows.Close()

	var riwayat []gin.H
	for rows.Next() {
		var id int
		var invoiceUUID, metode, status, paymentMethod, paymentNumber, pakasirOrderID string
		var nominal, biayaAdmin, totalDibayar float64
		var tanggal time.Time
		var invoiceURL *string
		var expiredAt *time.Time

		err := rows.Scan(&id, &invoiceUUID, &metode, &nominal, &biayaAdmin, &totalDibayar, &status, 
			&tanggal, &invoiceURL, &expiredAt, &paymentMethod, &paymentNumber, &pakasirOrderID)
		if err != nil {
			continue
		}

		invoiceURLStr := ""
		if invoiceURL != nil {
			invoiceURLStr = *invoiceURL
		}

		expiredAtStr := ""
		if expiredAt != nil {
			expiredAtStr = expiredAt.Format(time.RFC3339)
		}

		riwayat = append(riwayat, gin.H{
			"id":               id,
			"invoice_uuid":     invoiceUUID,
			"invoice_url":      invoiceURLStr,
			"metode":           metode,
			"nominal":          nominal,
			"biaya_admin":      biayaAdmin,
			"total_dibayar":    totalDibayar,
			"status":           status,
			"tanggal":          tanggal.Format(time.RFC3339),
			"expired_at":       expiredAtStr,
			"payment_method":   paymentMethod,
			"payment_number":   paymentNumber,
			"pakasir_order_id": pakasirOrderID,
		})
	}

	utils.SuccessResponse(c, riwayat, "Riwayat pembayaran retrieved")
}

// createPakasirTransaction - Membuat transaksi di Pakasir.com sesuai dokumentasi
func createPakasirTransaction(invoiceUUID string, amount int64, paymentMethod string) (*PakasirCreateResponse, error) {
	// Ambil konfigurasi dari environment
	apiKey := os.Getenv("PAKASIR_API_KEY")
	if apiKey == "" {
		apiKey = "API KEY PUNYA LU PADA"
	}
	
	slug := os.Getenv("PAKASIR_SLUG")
	if slug == "" {
		slug = "nf-student-hub"
	}

	reqBody := PakasirCreateRequest{
		Project: slug,
		OrderID: invoiceUUID,
		Amount:  amount,
		APIKey:  apiKey,
	}

	jsonData, err := json.Marshal(reqBody)
	if err != nil {
		return nil, fmt.Errorf("failed to marshal request: %v", err)
	}

	// Tentukan endpoint sesuai metode pembayaran
	endpoint := fmt.Sprintf("https://app.pakasir.com/api/transactioncreate/%s", paymentMethod)
	
	req, err := http.NewRequest("POST", endpoint, bytes.NewBuffer(jsonData))
	if err != nil {
		return nil, fmt.Errorf("failed to create request: %v", err)
	}
	
	req.Header.Set("Content-Type", "application/json")
	req.Header.Set("Accept", "application/json")
	
	client := &http.Client{Timeout: 30 * time.Second}
	resp, err := client.Do(req)
	if err != nil {
		return nil, fmt.Errorf("failed to call Pakasir API: %v", err)
	}
	defer resp.Body.Close()

	body, err := ioutil.ReadAll(resp.Body)
	if err != nil {
		return nil, fmt.Errorf("failed to read response: %v", err)
	}

	if resp.StatusCode != http.StatusOK {
		var errorResp map[string]interface{}
		json.Unmarshal(body, &errorResp)
		return nil, fmt.Errorf("Pakasir API error %d: %v", resp.StatusCode, errorResp)
	}

	var pakasirResp PakasirCreateResponse
	if err := json.Unmarshal(body, &pakasirResp); err != nil {
		return nil, fmt.Errorf("failed to unmarshal response: %v", err)
	}

	return &pakasirResp, nil
}

// validatePayment - Validasi pembayaran
func validatePayment(nominal float64, sisaUKT float64, metode string) error {
	if nominal < 100 {
		return fmt.Errorf("nominal minimal Rp 100")
	}
	
	if nominal > 10000000 {
		return fmt.Errorf("nominal maksimal Rp 10.000.000")
	}
	
	if nominal > sisaUKT {
		return fmt.Errorf("nominal melebihi sisa UKT. Sisa: Rp %.0f", sisaUKT)
	}
	
	// Validasi khusus untuk QRIS (500 - 250.000)
	if metode == "qris" {
		if nominal > 250000 {
			return fmt.Errorf("untuk QRIS maksimal Rp 250.000")
		}
		if nominal < 500 {
			return fmt.Errorf("untuk QRIS minimal Rp 500")
		}
	} else {
		// Validasi khusus untuk transfer (minimal 50.000)
		if nominal < 50000 {
			return fmt.Errorf("untuk transfer minimal Rp 50.000")
		}
	}
	
	return nil
}

// getPaymentMethodCode - Konversi metode dari frontend ke kode Pakasir
func getPaymentMethodCode(method string) string {
	switch method {
	case "qris":
		return "qris"
	case "bri_va":
		return "bri_va"
	case "bni_va":
		return "bni_va"
	case "mandiri_va":
		return "mandiri_va"
	case "bca_va":
		return "bca_va"
	case "cimb_niaga_va":
		return "cimb_niaga_va"
	case "sampoerna_va":
		return "sampoerna_va"
	case "bnc_va":
		return "bnc_va"
	case "maybank_va":
		return "maybank_va"
	case "permata_va":
		return "permata_va"
	case "atm_bersama_va":
		return "atm_bersama_va"
	case "artha_graha_va":
		return "artha_graha_va"
	default:
		return "qris"
	}
}

// CreatePayment - Membuat pembayaran dengan Pakasir.com
func CreatePayment(c *gin.Context) {
	userID, exists := c.Get("user_id")
	if !exists {
		utils.ErrorResponse(c, http.StatusUnauthorized, "Unauthorized")
		return
	}

	body, _ := ioutil.ReadAll(c.Request.Body)
	c.Request.Body = ioutil.NopCloser(bytes.NewBuffer(body))

	var input struct {
		Nominal float64 `json:"nominal" binding:"required"`
		Metode  string  `json:"metode" binding:"required,oneof=qris bri_va bni_va mandiri_va bca_va cimb_niaga_va sampoerna_va bnc_va maybank_va permata_va atm_bersama_va artha_graha_va"`
	}

	if err := c.ShouldBindJSON(&input); err != nil {
		utils.ErrorResponse(c, http.StatusBadRequest, "Invalid input: "+err.Error())
		return
	}

	var mahasiswaID int
	var sisaUKT float64
	var studentName, nim string
	role, _ := c.Get("role")
	
	if role == "orangtua" {
		err := config.DB.QueryRow(`
			SELECT o.child_id, COALESCE(m.sisa_ukt, 7000000), m.name, m.nim
			FROM ortu o 
			JOIN mahasiswa m ON o.child_id = m.id 
			WHERE o.user_id = $1
		`, userID).Scan(&mahasiswaID, &sisaUKT, &studentName, &nim)
		if err != nil {
			utils.ErrorResponse(c, http.StatusNotFound, "Data orangtua tidak ditemukan")
			return
		}
	} else {
		err := config.DB.QueryRow(`
			SELECT id, COALESCE(sisa_ukt, 7000000), name, nim
			FROM mahasiswa 
			WHERE user_id = $1
		`, userID).Scan(&mahasiswaID, &sisaUKT, &studentName, &nim)
		if err != nil {
			utils.ErrorResponse(c, http.StatusNotFound, "Mahasiswa not found")
			return
		}
	}

	// Validasi pembayaran
	if err := validatePayment(input.Nominal, sisaUKT, input.Metode); err != nil {
		utils.ErrorResponse(c, http.StatusBadRequest, err.Error())
		return
	}

	// Tentukan metode pembayaran untuk database
	metode := "transfer"
	if input.Metode == "qris" {
		metode = "qris"
	}

	// Generate UUID untuk invoice
	invoiceUUID := uuid.New().String()

	// Simpan ke riwayat_pembayaran dengan status pending (biaya admin sementara 0)
	expiredAt := time.Now().Add(24 * time.Hour)
	var lastID int64
	err := config.DB.QueryRow(`
		INSERT INTO riwayat_pembayaran 
		(mahasiswa_id, invoice_uuid, metode, nominal, biaya_admin, total_dibayar, status, tanggal, expired_at, payment_method)
		VALUES ($1, $2, $3, $4, 0, $5, 'pending', NOW(), $6, $7)
		RETURNING id
	`, mahasiswaID, invoiceUUID, metode, input.Nominal, input.Nominal, expiredAt, input.Metode).Scan(&lastID)
	
	if err != nil {
		utils.ErrorResponse(c, http.StatusInternalServerError, "Gagal menyimpan riwayat pembayaran: "+err.Error())
		return
	}

	// Simpan ke ukt_invoices
	_, err = config.DB.Exec(`
		INSERT INTO ukt_invoices (student_id, uuid, amount, status, created_at, expired_at, payment_method)
		VALUES ($1, $2, $3, 'pending', NOW(), $4, $5)
	`, mahasiswaID, invoiceUUID, input.Nominal, expiredAt, input.Metode)
	
	if err != nil {
		fmt.Printf("Gagal menyimpan ukt_invoices: %v\n", err)
	}

	// Create payment in Pakasir.com
	amountInt := int64(input.Nominal)
	pakasirMethod := getPaymentMethodCode(input.Metode)
	
	pakasirResp, err := createPakasirTransaction(invoiceUUID, amountInt, pakasirMethod)
	if err != nil {
		// Update status menjadi failed
		config.DB.Exec(`UPDATE riwayat_pembayaran SET status = 'failed' WHERE id = $1`, lastID)
		config.DB.Exec(`UPDATE ukt_invoices SET status = 'cancelled' WHERE uuid = $1`, invoiceUUID)
		
		utils.ErrorResponse(c, http.StatusInternalServerError, "Gagal membuat pembayaran di Pakasir.com: "+err.Error())
		return
	}

	// Build payment URL sesuai dokumentasi Pakasir
	slug := os.Getenv("PAKASIR_SLUG")
	if slug == "" {
		slug = "nf-student-hub"
	}
	
	paymentURL := ""
	if input.Metode == "qris" {
		paymentURL = fmt.Sprintf("https://app.pakasir.com/pay/%s/%d?order_id=%s&qris_only=1", 
			slug, pakasirResp.Payment.TotalPayment, invoiceUUID)
	} else {
		paymentURL = fmt.Sprintf("https://app.pakasir.com/pay/%s/%d?order_id=%s", 
			slug, pakasirResp.Payment.TotalPayment, invoiceUUID)
	}

	// Parse expired time dari Pakasir
	var pakasirExpired time.Time
	if pakasirResp.Payment.ExpiredAt != "" {
		pakasirExpired, err = time.Parse(time.RFC3339, pakasirResp.Payment.ExpiredAt)
		if err != nil {
			pakasirExpired = expiredAt
		}
	} else {
		pakasirExpired = expiredAt
	}

	// Update riwayat_pembayaran dengan data dari Pakasir
	_, err = config.DB.Exec(`
		UPDATE riwayat_pembayaran 
		SET biaya_admin = $1, total_dibayar = $2, invoice_url = $3, payment_number = $4, pakasir_order_id = $5, expired_at = $6
		WHERE id = $7
	`, pakasirResp.Payment.Fee, pakasirResp.Payment.TotalPayment, paymentURL, pakasirResp.Payment.PaymentNumber, 
		invoiceUUID, pakasirExpired, lastID)
	
	if err != nil {
		fmt.Printf("Gagal update riwayat_pembayaran: %v\n", err)
	}

	// Prepare response
	paymentData := PaymentResponse{
		UUID:          invoiceUUID,
		Metode:        metode,
		Nominal:       input.Nominal,
		BiayaAdmin:    float64(pakasirResp.Payment.Fee),
		TotalDibayar:  float64(pakasirResp.Payment.TotalPayment),
		PaymentMethod: input.Metode,
		PaymentURL:    paymentURL,
		ExpiredTime:   pakasirExpired.Format(time.RFC3339),
		Message:       "Silakan selesaikan pembayaran sesuai instruksi di bawah ini",
		Status:        "pending",
	}

	// Tambahkan data berdasarkan metode
	if input.Metode == "qris" {
		paymentData.QRCode = pakasirResp.Payment.PaymentNumber
	} else {
		paymentData.PaymentNumber = pakasirResp.Payment.PaymentNumber
	}

	utils.SuccessResponse(c, paymentData, "Pembayaran berhasil dibuat. Silakan selesaikan pembayaran.")
}

// CancelPayment - Membatalkan pembayaran
func CancelPayment(c *gin.Context) {
	userID, exists := c.Get("user_id")
	if !exists {
		utils.ErrorResponse(c, http.StatusUnauthorized, "Unauthorized")
		return
	}

	invoiceUUID := c.Param("uuid")
	role, _ := c.Get("role")

	var mahasiswaID int
	var status string
	var totalDibayar float64
	var pakasirOrderID string
	var amount int64
	var err error

	// Cari data pembayaran berdasarkan role
	if role == "orangtua" {
		err = config.DB.QueryRow(`
			SELECT r.mahasiswa_id, r.status, r.total_dibayar, r.pakasir_order_id, r.nominal
			FROM riwayat_pembayaran r
			JOIN ortu o ON r.mahasiswa_id = o.child_id
			WHERE r.invoice_uuid = $1 AND o.user_id = $2
		`, invoiceUUID, userID).Scan(&mahasiswaID, &status, &totalDibayar, &pakasirOrderID, &amount)
	} else {
		err = config.DB.QueryRow(`
			SELECT r.mahasiswa_id, r.status, r.total_dibayar, r.pakasir_order_id, r.nominal
			FROM riwayat_pembayaran r
			JOIN mahasiswa m ON r.mahasiswa_id = m.id
			WHERE r.invoice_uuid = $1 AND m.user_id = $2
		`, invoiceUUID, userID).Scan(&mahasiswaID, &status, &totalDibayar, &pakasirOrderID, &amount)
	}
	
	if err != nil {
		utils.ErrorResponse(c, http.StatusNotFound, "Invoice tidak ditemukan atau Anda tidak memiliki akses")
		return
	}

	// Cek status
	if status != "pending" {
		utils.ErrorResponse(c, http.StatusBadRequest, "Hanya pembayaran pending yang bisa dibatalkan")
		return
	}

	// Update status menjadi failed
	_, err = config.DB.Exec(`
		UPDATE riwayat_pembayaran 
		SET status = 'failed', updated_at = NOW()
		WHERE invoice_uuid = $1
	`, invoiceUUID)
	
	if err != nil {
		utils.ErrorResponse(c, http.StatusInternalServerError, "Gagal membatalkan pembayaran")
		return
	}

	// Update ukt_invoices menjadi cancelled
	config.DB.Exec(`UPDATE ukt_invoices SET status = 'cancelled', updated_at = NOW() WHERE uuid = $1`, invoiceUUID)

	utils.SuccessResponse(c, gin.H{
		"invoice_uuid": invoiceUUID,
		"status":       "failed",
		"message":      "Pembayaran berhasil dibatalkan",
	}, "Payment cancelled successfully")
}

// cancelPakasirTransaction - Membatalkan transaksi di Pakasir.com
func cancelPakasirTransaction(orderID string, amount int64) {
	apiKey := os.Getenv("PAKASIR_API_KEY")
	if apiKey == "" {
		apiKey = "API KEY PUNYA LU PADA"
	}
	
	slug := os.Getenv("PAKASIR_SLUG")
	if slug == "" {
		slug = "nf-student-hub"
	}

	reqBody := PakasirCreateRequest{
		Project: slug,
		OrderID: orderID,
		Amount:  amount,
		APIKey:  apiKey,
	}

	jsonData, _ := json.Marshal(reqBody)
	
	req, _ := http.NewRequest("POST", "https://app.pakasir.com/api/transactioncancel", bytes.NewBuffer(jsonData))
	req.Header.Set("Content-Type", "application/json")
	
	client := &http.Client{Timeout: 10 * time.Second}
	resp, err := client.Do(req)
	if err != nil {
		return
	}
	defer resp.Body.Close()
}

// PakasirWebhook - Menangani webhook dari Pakasir.com sesuai dokumentasi
func PakasirWebhook(c *gin.Context) {
	var payload PakasirWebhookPayload
	if err := c.ShouldBindJSON(&payload); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid payload"})
		return
	}

	// Verifikasi bahwa project sesuai
	slug := os.Getenv("PAKASIR_SLUG")
	if slug == "" {
		slug = "nf-student-hub"
	}
	
	if payload.Project != slug {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid project"})
		return
	}

	// Cari transaksi berdasarkan order_id (invoice_uuid)
	var riwayat struct {
		ID          int
		MahasiswaID int
		Nominal     float64
		Status      string
		TotalDibayar float64
		InvoiceUUID string
		PaymentMethod string
	}
	
	query := `
		SELECT id, mahasiswa_id, nominal, status, total_dibayar, invoice_uuid, payment_method
		FROM riwayat_pembayaran
		WHERE invoice_uuid = $1 OR pakasir_order_id = $2
		LIMIT 1
	`
	
	err := config.DB.QueryRow(query, payload.OrderID, payload.OrderID).Scan(
		&riwayat.ID, &riwayat.MahasiswaID, &riwayat.Nominal, 
		&riwayat.Status, &riwayat.TotalDibayar, &riwayat.InvoiceUUID, &riwayat.PaymentMethod)
	
	if err != nil {
		// Coba cari di ukt_invoices sebagai fallback
		var studentID int
		var amount float64
		err2 := config.DB.QueryRow(`
			SELECT student_id, amount
			FROM ukt_invoices
			WHERE uuid = $1
		`, payload.OrderID).Scan(&studentID, &amount)
		
		if err2 != nil {
			c.JSON(http.StatusNotFound, gin.H{"error": "Payment not found"})
			return
		}
		
		// Buat record di riwayat_pembayaran jika tidak ada
		var lastID int64
		err = config.DB.QueryRow(`
			INSERT INTO riwayat_pembayaran 
			(mahasiswa_id, invoice_uuid, metode, nominal, biaya_admin, total_dibayar, status, tanggal, 
			 payment_method, pakasir_order_id, invoice_url)
			VALUES ($1, $2, 'transfer', $3, 0, $4, $5, NOW(), $6, $7, $8)
			RETURNING id
		`, studentID, payload.OrderID, amount, amount, "pending", 
		   payload.PaymentMethod, payload.OrderID, "").Scan(&lastID)
		
		if err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to create payment record"})
			return
		}
		
		riwayat.ID = int(lastID)
		riwayat.MahasiswaID = studentID
		riwayat.Nominal = amount
		riwayat.Status = "pending"
		riwayat.TotalDibayar = amount
		riwayat.InvoiceUUID = payload.OrderID
		riwayat.PaymentMethod = payload.PaymentMethod
	}

	// Jika status sudah success, abaikan tapi tetap response OK
	if riwayat.Status == "success" {
		c.JSON(http.StatusOK, gin.H{"message": "Already processed", "status": "success"})
		return
	}

	// Update status berdasarkan webhook
	newStatus := "pending"
	if payload.Status == "completed" {
		newStatus = "success"
		
		// Update sisa UKT di database
		_, err := config.DB.Exec(`
			UPDATE mahasiswa 
			SET sisa_ukt = GREATEST(0, COALESCE(sisa_ukt, 7000000) - $1), 
			    updated_at = NOW(),
			    total_ukt_dibayar = COALESCE(total_ukt_dibayar, 0) + $2
			WHERE id = $3
		`, riwayat.Nominal, riwayat.Nominal, riwayat.MahasiswaID)
		
		if err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to update UKT balance"})
			return
		}
		
	} else if payload.Status == "failed" {
		newStatus = "failed"
	} else if payload.Status == "expired" {
		newStatus = "expired"
	} else {
		// Status lainnya
		newStatus = payload.Status
	}

	// Update riwayat_pembayaran
	_, err = config.DB.Exec(`
		UPDATE riwayat_pembayaran 
		SET status = $1, updated_at = NOW(), 
			payment_method = COALESCE($2, payment_method), 
			pakasir_order_id = COALESCE($3, pakasir_order_id)
		WHERE id = $4
	`, newStatus, payload.PaymentMethod, payload.OrderID, riwayat.ID)
	
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to update status"})
		return
	}

	// Update ukt_invoices
	invoiceStatus := "pending"
	if newStatus == "success" {
		invoiceStatus = "paid"
	} else if newStatus == "failed" {
		invoiceStatus = "cancelled"
	} else if newStatus == "expired" {
		invoiceStatus = "expired"
	}
	
	config.DB.Exec(`UPDATE ukt_invoices SET status = $1, updated_at = NOW() WHERE uuid = $2`, 
		invoiceStatus, riwayat.InvoiceUUID)

	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"message": "Webhook processed successfully",
		"status": newStatus,
		"invoice_uuid": riwayat.InvoiceUUID,
		"sisa_ukt_updated": newStatus == "success",
		"nominal": riwayat.Nominal,
		"mahasiswa_id": riwayat.MahasiswaID,
		"timestamp": time.Now().Format(time.RFC3339),
	})
}

// CheckPaymentStatus - Memeriksa status pembayaran
func CheckPaymentStatus(c *gin.Context) {
	invoiceUUID := c.Param("uuid")

	var riwayat struct {
		ID              int
		Status          string
		Nominal         float64
		Metode          string
		TotalDibayar    float64
		Tanggal         string
		InvoiceURL      string
		ExpiredAt       *time.Time
		PakasirOrderID  string
		PaymentMethod   string
		MahasiswaID     int
	}

	err := config.DB.QueryRow(`
		SELECT id, status, nominal, metode, total_dibayar, tanggal, invoice_url, expired_at,
		       pakasir_order_id, payment_method, mahasiswa_id
		FROM riwayat_pembayaran
		WHERE invoice_uuid = $1
	`, invoiceUUID).Scan(&riwayat.ID, &riwayat.Status, &riwayat.Nominal, &riwayat.Metode, 
		&riwayat.TotalDibayar, &riwayat.Tanggal, &riwayat.InvoiceURL, &riwayat.ExpiredAt,
		&riwayat.PakasirOrderID, &riwayat.PaymentMethod, &riwayat.MahasiswaID)

	if err != nil {
		utils.ErrorResponse(c, http.StatusNotFound, "Invoice not found")
		return
	}

	// Cek apakah sudah expired
	if riwayat.Status == "pending" && riwayat.ExpiredAt != nil && time.Now().After(*riwayat.ExpiredAt) {
		riwayat.Status = "expired"
		config.DB.Exec(`UPDATE riwayat_pembayaran SET status = 'expired' WHERE id = $1`, riwayat.ID)
		config.DB.Exec(`UPDATE ukt_invoices SET status = 'expired' WHERE uuid = $1`, invoiceUUID)
	}

	utils.SuccessResponse(c, gin.H{
		"status":         riwayat.Status,
		"nominal":        riwayat.Nominal,
		"metode":         riwayat.Metode,
		"total_dibayar":  riwayat.TotalDibayar,
		"tanggal":        riwayat.Tanggal,
		"invoice_url":    riwayat.InvoiceURL,
		"expired_at":     riwayat.ExpiredAt,
		"payment_method": riwayat.PaymentMethod,
	}, "Status pembayaran retrieved")
}

// ManualPaymentConfirmation - Konfirmasi pembayaran manual oleh admin
func ManualPaymentConfirmation(c *gin.Context) {
	role, _ := c.Get("role")
	if role != "admin" {
		utils.ErrorResponse(c, http.StatusForbidden, "Hanya admin yang dapat mengkonfirmasi pembayaran manual")
		return
	}

	var input struct {
		InvoiceUUID string `json:"invoice_uuid" binding:"required"`
		Status      string `json:"status" binding:"required,oneof=success failed"`
		Notes       string `json:"notes"`
	}

	if err := c.ShouldBindJSON(&input); err != nil {
		utils.ErrorResponse(c, http.StatusBadRequest, "Invalid input: "+err.Error())
		return
	}

	// Cari riwayat pembayaran
	var riwayat struct {
		ID          int
		MahasiswaID int
		Nominal     float64
		Status      string
	}
	
	err := config.DB.QueryRow(`
		SELECT id, mahasiswa_id, nominal, status
		FROM riwayat_pembayaran
		WHERE invoice_uuid = $1
	`, input.InvoiceUUID).Scan(&riwayat.ID, &riwayat.MahasiswaID, &riwayat.Nominal, &riwayat.Status)
	
	if err != nil {
		utils.ErrorResponse(c, http.StatusNotFound, "Invoice tidak ditemukan")
		return
	}

	// Jika sudah success, abaikan
	if riwayat.Status == "success" {
		utils.SuccessResponse(c, nil, "Pembayaran sudah dikonfirmasi sebelumnya")
		return
	}

	// Update riwayat_pembayaran
	_, err = config.DB.Exec(`
		UPDATE riwayat_pembayaran 
		SET status = $1, updated_at = NOW()
		WHERE id = $2
	`, input.Status, riwayat.ID)
	
	if err != nil {
		utils.ErrorResponse(c, http.StatusInternalServerError, "Gagal update status pembayaran")
		return
	}

	// Update ukt_invoices
	invoiceStatus := "pending"
	if input.Status == "success" {
		invoiceStatus = "paid"
	} else if input.Status == "failed" {
		invoiceStatus = "cancelled"
	}
	
	config.DB.Exec(`UPDATE ukt_invoices SET status = $1, updated_at = NOW() WHERE uuid = $2`, invoiceStatus, input.InvoiceUUID)

	// Jika success, kurangi sisa UKT
	if input.Status == "success" {
		config.DB.Exec(`UPDATE mahasiswa SET sisa_ukt = sisa_ukt - $1 WHERE id = $2`, riwayat.Nominal, riwayat.MahasiswaID)
	}

	utils.SuccessResponse(c, gin.H{
		"invoice_uuid": input.InvoiceUUID,
		"status":       input.Status,
		"message":      "Pembayaran berhasil dikonfirmasi",
	}, "Payment confirmed successfully")
}

// DeleteExpiredPayments - Hapus pembayaran yang sudah expired
func DeleteExpiredPayments(c *gin.Context) {
	role, _ := c.Get("role")
	if role != "admin" {
		utils.ErrorResponse(c, http.StatusForbidden, "Hanya admin yang dapat menghapus pembayaran expired")
		return
	}

	result, err := config.DB.Exec(`DELETE FROM riwayat_pembayaran WHERE status = 'pending' AND expired_at < NOW()`)
	
	if err != nil {
		utils.ErrorResponse(c, http.StatusInternalServerError, "Gagal menghapus pembayaran expired")
		return
	}

	rowsAffected, _ := result.RowsAffected()
	
	// Juga hapus dari ukt_invoices
	config.DB.Exec(`DELETE FROM ukt_invoices WHERE status = 'pending' AND expired_at < NOW()`)

	utils.SuccessResponse(c, gin.H{
		"deleted_count": rowsAffected,
		"message":       "Pembayaran expired berhasil dihapus",
	}, "Expired payments deleted")
}

// InitUKTData inisialisasi data UKT
func InitUKTData(c *gin.Context) {
	result, err := config.DB.Exec(`UPDATE mahasiswa SET sisa_ukt = 7000000 WHERE sisa_ukt IS NULL OR sisa_ukt = 0`)
	if err != nil {
		utils.ErrorResponse(c, http.StatusInternalServerError, "Gagal inisialisasi data UKT")
		return
	}

	rowsAffected, _ := result.RowsAffected()
	utils.SuccessResponse(c, gin.H{
		"rows_affected": rowsAffected,
		"message":       "Data UKT berhasil diinisialisasi",
	}, "UKT data initialized")
}

// GetInvoiceURL mendapatkan URL invoice
func GetInvoiceURL(c *gin.Context) {
	invoiceUUID := c.Param("uuid")

	var invoiceURL string
	err := config.DB.QueryRow(`SELECT invoice_url FROM riwayat_pembayaran WHERE invoice_uuid = $1 AND status = 'pending'`, invoiceUUID).Scan(&invoiceURL)

	if err != nil {
		utils.ErrorResponse(c, http.StatusNotFound, "Invoice tidak ditemukan atau sudah diproses")
		return
	}

	utils.SuccessResponse(c, gin.H{"invoice_url": invoiceURL}, "Invoice URL retrieved")
}

// GetChildUKTInfo - Get informasi UKT anak (untuk orang tua)
func GetChildUKTInfo(c *gin.Context) {
    userID, exists := c.Get("user_id")
    if !exists {
        utils.ErrorResponse(c, http.StatusUnauthorized, "Unauthorized")
        return
    }

    var childInfo struct {
        ID       int     `json:"id"`
        Name     string  `json:"nama"`
        NIM      string  `json:"nim"`
        SisaUKT  float64 `json:"sisa_ukt"`
        TotalUKT float64 `json:"total_ukt"`
    }

    err := config.DB.QueryRow(`
        SELECT m.id, m.name, m.nim, COALESCE(m.sisa_ukt, 7000000), 7000000 as total_ukt
        FROM ortu o
        JOIN mahasiswa m ON o.child_id = m.id
        WHERE o.user_id = $1
    `, userID).Scan(&childInfo.ID, &childInfo.Name, &childInfo.NIM, &childInfo.SisaUKT, &childInfo.TotalUKT)

    if err != nil {
        utils.ErrorResponse(c, http.StatusNotFound, "Data anak tidak ditemukan")
        return
    }

    utils.SuccessResponse(c, childInfo, "Informasi UKT anak retrieved")
}

// CreatePaymentForChild - Membuat pembayaran untuk anak (orangtua)
func CreatePaymentForChild(c *gin.Context) {
	userID, exists := c.Get("user_id")
	if !exists {
		utils.ErrorResponse(c, http.StatusUnauthorized, "Unauthorized")
		return
	}

	body, _ := ioutil.ReadAll(c.Request.Body)
	c.Request.Body = ioutil.NopCloser(bytes.NewBuffer(body))

	var input struct {
		Nominal float64 `json:"nominal" binding:"required"`
		Metode  string  `json:"metode" binding:"required,oneof=qris bri_va bni_va mandiri_va bca_va"`
	}

	if err := c.ShouldBindJSON(&input); err != nil {
		utils.ErrorResponse(c, http.StatusBadRequest, "Invalid input: "+err.Error())
		return
	}

	// Ambil data anak dari ortu
	var mahasiswaID int
	var sisaUKT float64
	var studentName, nim string
	
	err := config.DB.QueryRow(`
		SELECT o.child_id, COALESCE(m.sisa_ukt, 7000000), m.name, m.nim
		FROM ortu o 
		JOIN mahasiswa m ON o.child_id = m.id 
		WHERE o.user_id = $1
	`, userID).Scan(&mahasiswaID, &sisaUKT, &studentName, &nim)
	
	if err != nil {
		utils.ErrorResponse(c, http.StatusNotFound, "Data anak tidak ditemukan")
		return
	}

	// Validasi pembayaran
	if err := validatePayment(input.Nominal, sisaUKT, input.Metode); err != nil {
		utils.ErrorResponse(c, http.StatusBadRequest, err.Error())
		return
	}

	// Tentukan metode pembayaran
	metode := "transfer"
	if input.Metode == "qris" {
		metode = "qris"
	}

	// Generate UUID untuk invoice
	invoiceUUID := uuid.New().String()

	// Simpan ke riwayat_pembayaran dengan status pending (biaya admin sementara 0)
	expiredAt := time.Now().Add(24 * time.Hour)
	var lastID int64
	err = config.DB.QueryRow(`
		INSERT INTO riwayat_pembayaran 
		(mahasiswa_id, invoice_uuid, metode, nominal, biaya_admin, total_dibayar, status, tanggal, expired_at, payment_method)
		VALUES ($1, $2, $3, $4, 0, $5, 'pending', NOW(), $6, $7)
		RETURNING id
	`, mahasiswaID, invoiceUUID, metode, input.Nominal, input.Nominal, expiredAt, input.Metode).Scan(&lastID)
	
	if err != nil {
		utils.ErrorResponse(c, http.StatusInternalServerError, "Gagal menyimpan riwayat pembayaran")
		return
	}

	// Simpan ke ukt_invoices
	_, err = config.DB.Exec(`
		INSERT INTO ukt_invoices (student_id, uuid, amount, status, created_at, expired_at, payment_method)
		VALUES ($1, $2, $3, 'pending', NOW(), $4, $5)
	`, mahasiswaID, invoiceUUID, input.Nominal, expiredAt, input.Metode)
	
	if err != nil {
		// Continue even if invoice save fails
	}

	// Create payment in Pakasir.com
	amountInt := int64(input.Nominal)
	pakasirResp, err := createPakasirTransaction(invoiceUUID, amountInt, input.Metode)
	if err != nil {
		config.DB.Exec(`UPDATE riwayat_pembayaran SET status = 'failed' WHERE id = $1`, lastID)
		config.DB.Exec(`UPDATE ukt_invoices SET status = 'cancelled' WHERE uuid = $1`, invoiceUUID)
		
		utils.ErrorResponse(c, http.StatusInternalServerError, "Gagal membuat pembayaran di Pakasir.com")
		return
	}

	// Update payment data dengan info dari Pakasir
	var paymentNumber string
	var paymentURL string
	
	if input.Metode == "qris" {
		paymentNumber = pakasirResp.Payment.PaymentNumber
		paymentURL = fmt.Sprintf("https://app.pakasir.com/pay/%s/%d?order_id=%s&qris_only=1", 
			os.Getenv("PAKASIR_SLUG"), pakasirResp.Payment.TotalPayment, invoiceUUID)
	} else {
		paymentNumber = pakasirResp.Payment.PaymentNumber
		paymentURL = fmt.Sprintf("https://app.pakasir.com/pay/%s/%d?order_id=%s", 
			os.Getenv("PAKASIR_SLUG"), pakasirResp.Payment.TotalPayment, invoiceUUID)
	}

	// Update riwayat_pembayaran dengan data dari Pakasir
	_, err = config.DB.Exec(`
		UPDATE riwayat_pembayaran 
		SET biaya_admin = $1, total_dibayar = $2, invoice_url = $3, payment_number = $4, pakasir_order_id = $5
		WHERE id = $6
	`, pakasirResp.Payment.Fee, pakasirResp.Payment.TotalPayment, paymentURL, paymentNumber, invoiceUUID, lastID)
	
	if err != nil {
		// Continue even if update fails
	}

	// Prepare response
	paymentData := gin.H{
		"uuid":           invoiceUUID,
		"metode":         metode,
		"nominal":        input.Nominal,
		"biaya_admin":    float64(pakasirResp.Payment.Fee),
		"total_dibayar":  float64(pakasirResp.Payment.TotalPayment),
		"payment_method": input.Metode,
		"payment_url":    paymentURL,
		"expired_time":   expiredAt.Format(time.RFC3339),
		"message":        fmt.Sprintf("Pembayaran untuk %s berhasil dibuat!", studentName),
		"status":         "pending",
		"student_name":   studentName,
	}

	if input.Metode == "qris" {
		paymentData["qrcode"] = paymentNumber
	} else {
		paymentData["payment_number"] = paymentNumber
	}

	utils.SuccessResponse(c, paymentData, "Pembayaran berhasil dibuat untuk anak Anda")
}

// GetPaymentDetails - Get detail pembayaran
func GetPaymentDetails(c *gin.Context) {
	invoiceUUID := c.Param("uuid")

	var payment struct {
		UUID           string     `json:"uuid"`
		Metode         string     `json:"metode"`
		Nominal        float64    `json:"nominal"`
		BiayaAdmin     float64    `json:"biaya_admin"`
		TotalDibayar   float64    `json:"total_dibayar"`
		Status         string     `json:"status"`
		InvoiceURL     string     `json:"invoice_url"`
		Tanggal        string     `json:"tanggal"`
		ExpiredAt      *time.Time `json:"expired_at"`
		PaymentMethod  string     `json:"payment_method"`
		PaymentNumber  string     `json:"payment_number"`
		PakasirOrderID string     `json:"pakasir_order_id"`
		MahasiswaID    int        `json:"mahasiswa_id"`
		QRCode         string     `json:"qrcode"`
	}

	query := `
		SELECT invoice_uuid, metode, nominal, biaya_admin, total_dibayar, status, 
		       invoice_url, tanggal, expired_at, payment_method, payment_number, 
		       pakasir_order_id, mahasiswa_id,
		       CASE WHEN payment_method = 'qris' THEN payment_number ELSE '' END as qrcode
		FROM riwayat_pembayaran
		WHERE invoice_uuid = $1
	`

	err := config.DB.QueryRow(query, invoiceUUID).Scan(
		&payment.UUID, &payment.Metode, &payment.Nominal, &payment.BiayaAdmin, 
		&payment.TotalDibayar, &payment.Status, &payment.InvoiceURL, &payment.Tanggal, 
		&payment.ExpiredAt, &payment.PaymentMethod, &payment.PaymentNumber,
		&payment.PakasirOrderID, &payment.MahasiswaID, &payment.QRCode)

	if err != nil {
		utils.ErrorResponse(c, http.StatusNotFound, "Detail pembayaran tidak ditemukan")
		return
	}

	// Cek apakah sudah expired
	isExpired := false
	if payment.Status == "pending" && payment.ExpiredAt != nil && time.Now().After(*payment.ExpiredAt) {
		payment.Status = "expired"
		isExpired = true
	}

	// Buat URL pembayaran Pakasir jika tidak ada
	if payment.InvoiceURL == "" && payment.TotalDibayar > 0 {
		slug := os.Getenv("PAKASIR_SLUG")
		if slug == "" {
			slug = "nf-student-hub"
		}
		
		payment.InvoiceURL = fmt.Sprintf("https://app.pakasir.com/pay/%s/%d?order_id=%s",
			slug, int64(payment.TotalDibayar), invoiceUUID)
		if payment.PaymentMethod == "qris" {
			payment.InvoiceURL += "&qris_only=1"
		}
	}

	// Parse data pembayaran berdasarkan metode
	response := gin.H{
		"uuid":            payment.UUID,
		"metode":          payment.Metode,
		"nominal":         payment.Nominal,
		"biaya_admin":     payment.BiayaAdmin,
		"total_dibayar":   payment.TotalDibayar,
		"status":          payment.Status,
		"payment_url":     payment.InvoiceURL,
		"tanggal":         payment.Tanggal,
		"expired_at":      payment.ExpiredAt,
		"expired_time":    payment.ExpiredAt,
		"is_expired":      isExpired,
		"payment_method":  payment.PaymentMethod,
		"payment_number":  payment.PaymentNumber,
		"qrcode":          payment.QRCode,
		"mahasiswa_id":    payment.MahasiswaID,
	}

	utils.SuccessResponse(c, response, "Detail pembayaran retrieved")
}
