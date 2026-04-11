package routes

import (
	"nf-student-hub-backend/controllers"
	"nf-student-hub-backend/handlers"
	"nf-student-hub-backend/middlewares"

	"github.com/gin-gonic/gin"
	"gorm.io/gorm"
)

func SetupRoutes(r *gin.Engine, db *gorm.DB) {
	// Initialize WebSocket hub
	wsHub := handlers.NewWebSocketHub(db)
	go wsHub.Run()

	// Initialize chat controller with hub
	chatController := controllers.NewChatController(db, wsHub)

	// Public routes
	r.POST("/api/auth/login", controllers.Login)
	r.POST("/api/auth/register", controllers.Register)

	// Webhook Pakasir.com (tanpa auth)
	r.POST("/api/webhook/pakasir", controllers.PakasirWebhook)

	// WebSocket route for real-time chat
	r.GET("/ws/chat", middlewares.WebSocketAuthMiddleware(), func(c *gin.Context) {
		wsHub.HandleWebSocket(c)
	})

	// API group (wajib login)
	api := r.Group("/api")
	api.Use(middlewares.JWTMiddleware())

	// === AUTH & PROFILE ===
	api.GET("/auth/verify", controllers.Verify)
	api.GET("/profile/me", controllers.GetMyProfile)
	api.GET("/debug/profile", controllers.DebugProfiles)
	api.GET("/profile/public/:role/:username", controllers.GetPublicProfile)
	api.GET("/profile/public/:role/:username/posts", controllers.GetUserPosts)

	// === UKT ROUTES (Shared for mahasiswa & orangtua) ===
	ukt := api.Group("/ukt")
	{
		ukt.GET("/sisa", controllers.GetSisaUKT)
		ukt.GET("/riwayat", controllers.GetRiwayatPembayaran)
		ukt.POST("/bayar", controllers.CreatePayment)
		ukt.GET("/invoice/:uuid", controllers.GetInvoiceURL)
		ukt.GET("/status/:uuid", controllers.CheckPaymentStatus)
		ukt.GET("/details/:uuid", controllers.GetPaymentDetails)
		ukt.POST("/manual-confirm", controllers.ManualPaymentConfirmation)
		ukt.POST("/init", controllers.InitUKTData)
		ukt.DELETE("/expired", controllers.DeleteExpiredPayments)
		ukt.POST("/cancel/:uuid", controllers.CancelPayment)
	}

	// === ORANGTUA SPECIFIC ROUTES ===
	ortu := api.Group("/ortu")
	ortu.Use(middlewares.RoleMiddleware("orangtua"))
	{
		// Profile & anak
		ortu.GET("/profile/anak", controllers.GetChildUKTInfo)
		ortu.GET("/profile", controllers.GetOrtuProfile)
		ortu.GET("/anak/absensi/:student_id", controllers.GetChildAttendance)
		ortu.GET("/anak/absensi/hari-ini", controllers.GetChildAttendanceToday)
		ortu.GET("/anak/profile", controllers.GetChildProfile)
		ortu.GET("/anak/akademik", controllers.GetChildAcademicInfo)

		// UKT khusus orangtua
		ortu.POST("/ukt/bayar", controllers.CreatePaymentForChild)
	}

	// === FEED & POSTS ===
	api.GET("/feed", controllers.GetFeed)
	api.POST("/feed", controllers.CreatePost)
	api.GET("/feed/:id", controllers.GetPost)
	api.POST("/feed/:id/like", controllers.LikePost)
	api.POST("/feed/:id/comment", controllers.CommentPost)
	api.POST("/feed/:id/save", controllers.SavePost)

	// === POST ROUTES (alternatif path untuk konsistensi) ===
	api.GET("/post/:id", controllers.GetPost)
	api.POST("/post/:id/like", controllers.LikePost)
	api.POST("/post/:id/comment", controllers.CommentPost)
	api.POST("/post/:id/save", controllers.SavePost)

	// === ROLE-SPECIFIC ROUTES ===
	// UKM
	ukm := api.Group("/ukm")
	{
		ukm.GET("/posts", controllers.GetUKMPosts)
		ukm.POST("/posts", controllers.CreateUKMPost)
	}

	// Ormawa
	ormawa := api.Group("/ormawa")
	{
		ormawa.GET("/posts", controllers.GetOrmawaPosts)
		ormawa.POST("/posts", controllers.CreateOrmawaPost)
	}

	// === MAHASISWA ROUTES ===
	mahasiswa := api.Group("/mahasiswa")
	mahasiswa.Use(middlewares.RoleMiddleware("mahasiswa"))
	{
		mahasiswa.GET("/profile", controllers.GetMahasiswaProfile)
		mahasiswa.PUT("/profile", controllers.UpdateMahasiswaProfile)
		mahasiswa.GET("/absensi/summary", controllers.GetAttendanceSummary)
		mahasiswa.POST("/absensi/scan", controllers.ScanAttendance)
		mahasiswa.GET("/jadwal/hari-ini", controllers.GetMahasiswaJadwalHariIni)
		mahasiswa.GET("/ukt", controllers.GetUKTInvoices)
		mahasiswa.POST("/ukt/pay", controllers.CreateUKTPayment)
		mahasiswa.GET("/matkul/:course_id/pertemuan", controllers.GetPertemuanByMatkul)
		mahasiswa.GET("/matkul/:course_id/pertemuan/:pertemuan", controllers.GetPertemuanDetail)
		mahasiswa.POST("/tugas/submit", controllers.SubmitTugas)
		mahasiswa.GET("/tugas/:task_id/status", controllers.GetSubmissionStatus)
		mahasiswa.GET("/me/tugas/pending", controllers.GetPendingTugas)
		mahasiswa.GET("/tugas", controllers.GetMahasiswaTugasList)
		mahasiswa.GET("/tugas/course/:course_id", controllers.GetMahasiswaTugasByCourse)

		// ROUTE UNTUK SEMUA MATA KULIAH TANPA FILTER
		mahasiswa.GET("/courses", controllers.GetMahasiswaCourses)

		// ROUTE UNTUK FILTER HARI
		mahasiswa.GET("/courses/day/:hari", controllers.GetMahasiswaCoursesByDay)

		// PERBAIKAN: AMBIL ROUTE RIWAYAT ABSENSI KE ATAS SEBELUM ROUTE DENGAN PARAMETER
		mahasiswa.GET("/absensi/riwayat", controllers.GetAttendanceHistory)

		// ROUTE UNTUK RIWAYAT ABSENSI PER MATA KULIAH
		mahasiswa.GET("/absensi/course/:course_id", controllers.GetAttendanceHistoryByCourse)

		// ROUTE UNTUK SEMUA PERTEMUAN ABSENSI
		mahasiswa.GET("/absensi/pertemuan-all", controllers.GetAllPertemuanAttendance)

		// ROUTE UNTUK ABSENSI PER COURSE DENGAN PERTEMUAN
		mahasiswa.GET("/absensi/pertemuan", controllers.GetAttendanceByCoursePertemuan)
	}

	// === DOSEN ROUTES ===
	dosen := api.Group("/dosen")
	dosen.Use(middlewares.RoleMiddleware("dosen"))
	{
		// Courses
		dosen.GET("/courses", controllers.GetDosenCourses)

		// Attendance - FIXED
		dosen.POST("/absensi/create", controllers.CreateAttendanceSession)
		dosen.GET("/absensi/active", controllers.GetActiveSessions)
		dosen.GET("/absensi/:session_id", controllers.GetAttendanceSessionDetail)
		dosen.POST("/absensi/refresh-token", controllers.RefreshSessionToken)
		dosen.POST("/absensi/update-status", controllers.UpdateAttendanceStatus)
		dosen.POST("/absensi/close", controllers.CloseAttendanceSession)
		dosen.GET("/absensi/qr/:token", controllers.GetQRCode)
		dosen.GET("/absensi/summary", controllers.GetAttendanceByPertemuan)

		// ROUTE BARU UNTUK RIWAYAT PERTEMUAN DOSEN
		dosen.GET("/absensi/riwayat-pertemuan", controllers.GetRiwayatPertemuanDosen)

		// ROUTE BARU UNTUK REALTIME ATTENDANCE
		dosen.GET("/absensi/realtime/:session_id", controllers.GetRealtimeAttendance)

		// Tugas & Materi Management
		dosen.POST("/tugas", controllers.CreateTugas)
		dosen.GET("/tugas/:course_id/submissions", controllers.GetTugasSubmissions)
		dosen.PUT("/tugas/:submission_id/grade", controllers.GradeSubmission)
		dosen.DELETE("/submissions/:submission_id", controllers.DeleteSubmission)

		// Materi
		dosen.POST("/materi/upload", controllers.UploadMateri)
		dosen.DELETE("/materi/:id/delete", controllers.DeleteMateri)
		dosen.DELETE("/tugas/:id/delete", controllers.DeleteTugas)

		// Pertemuan
		dosen.GET("/matkul/:course_id/pertemuan", controllers.GetPertemuanByMatkul)
		dosen.GET("/matkul/:course_id/pertemuan/:pertemuan", controllers.GetPertemuanDetail)

		// Profile
		dosen.GET("/profile", controllers.GetDosenProfile)
		dosen.PUT("/profile", controllers.UpdateDosenProfile)
		dosen.GET("/stats", controllers.GetDosenStats)
	}

	// Admin routes
	admin := api.Group("/admin")
	admin.Use(middlewares.RoleMiddleware("admin"))
	{
		admin.GET("/profile", controllers.GetAdminProfile)
		admin.POST("/posts", controllers.CreateAdminPost)
		admin.GET("/invoices/unpaid", controllers.GetUnpaidInvoices)
		// Route khusus untuk Admin Kemahasiswaan
		admin.GET("/ukt/mahasiswa", controllers.GetAllMahasiswaUKTStatus)
		admin.GET("/ukt/riwayat/:mahasiswa_id", controllers.GetRiwayatPembayaranByMahasiswaID)
		admin.POST("/ukt/reminder/:mahasiswa_id", controllers.SendReminder)
	}

	// ==================== CHAT ROUTES ====================
	chat := api.Group("/chat")
	{
		// Conversation endpoints
		chat.GET("/conversations", chatController.GetConversations)
		chat.GET("/conversations/:conversation_id", chatController.GetConversationDetail)
		chat.POST("/conversations", chatController.CreateConversation)

		// Message endpoints
		chat.GET("/conversations/:conversation_id/messages", chatController.GetMessages)
		chat.POST("/conversations/:conversation_id/messages", chatController.SendMessage)
		chat.POST("/conversations/:conversation_id/messages/read", chatController.MarkMessagesAsRead)

		// Group management endpoints
		chat.GET("/groups/matkul", chatController.GetMatkulGroups)
		chat.POST("/groups/matkul", chatController.CreateMatkulGroup)

		// Contact & search endpoints
		chat.GET("/contacts", chatController.GetContacts)

		// Utility endpoints
		chat.GET("/stats", chatController.GetChatStats)
		chat.POST("/conversations/:conversation_id/pin", chatController.PinConversation)
		chat.DELETE("/conversations/:conversation_id/pin", chatController.UnpinConversation)
	}

	// Chatbot
	chatbot := r.Group("/api/chatbot")
	{
		chatbot.POST("/chat", handlers.HandleChat)
		chatbot.GET("/history/:conversationId", handlers.GetChatHistory)
		chatbot.DELETE("/history/:conversationId", handlers.DeleteChatHistory)
		chatbot.GET("/health", handlers.HealthCheck)
		chatbot.GET("/stats", handlers.GetStats)
	}
}
