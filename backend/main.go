package main

import (
	"log"
	"os"
	"strings"
	"time"

	"nf-student-hub-backend/config"
	"nf-student-hub-backend/handlers"
	"nf-student-hub-backend/middlewares"
	openclawConfig "nf-student-hub-backend/openclaw/config"
	"nf-student-hub-backend/openclaw/handler"
	"nf-student-hub-backend/openclaw/outbox"
	"nf-student-hub-backend/openclaw/scheduler"
	"nf-student-hub-backend/openclaw/telegram"
	"nf-student-hub-backend/routes"
	"nf-student-hub-backend/utils"

	"github.com/fatih/color"
	"github.com/gin-contrib/cors"
	"github.com/gin-gonic/gin"
	"github.com/joho/godotenv"
	"github.com/mbndr/figlet4go"
)

func main() {
	godotenv.Load()

	// Initialize database
	config.InitDB()

	// Tentukan upload path — cek apakah dari root atau dari folder backend
	uploadPath := "./uploads"
	if _, err := os.Stat("./backend/uploads"); err == nil {
		uploadPath = "./backend/uploads"
	} else if _, err := os.Stat("./uploads"); os.IsNotExist(err) {
		os.MkdirAll("uploads/posts", 0755)
		os.MkdirAll("uploads/materi", 0755)
		os.MkdirAll("uploads/tugas", 0755)
		os.MkdirAll("uploads/tugasdosen", 0755)
		os.MkdirAll("uploads/profile", 0755)
	}

	r := gin.Default()
	r.SetTrustedProxies(nil)

	// ============================================================
	// 🔒 SECURITY MIDDLEWARES
	// ============================================================
	r.Use(middlewares.SecurityHeaders())
	r.Use(middlewares.RateLimitMiddleware(200, 1*time.Minute)) // Global: 200 req/min per IP

	// CORS — batasi hanya ke domain yang diizinkan
	allowedOrigins := os.Getenv("ALLOWED_ORIGINS")
	r.Use(cors.New(cors.Config{
		AllowOriginFunc: func(origin string) bool {
			// Selalu izinkan localhost untuk development
			if strings.HasPrefix(origin, "http://localhost") || strings.HasPrefix(origin, "http://127.0.0.1") {
				return true
			}
			// Jika ALLOWED_ORIGINS diset, cek apakah origin ada di daftar
			if allowedOrigins != "" {
				for _, allowed := range strings.Split(allowedOrigins, ",") {
					if strings.TrimSpace(allowed) == origin {
						return true
					}
				}
				return false
			}
			// Fallback: izinkan semua (untuk backward compatibility)
			return true
		},
		AllowMethods:     []string{"GET", "POST", "PUT", "DELETE", "OPTIONS"},
		AllowHeaders:     []string{"Origin", "Content-Type", "Authorization", "Accept", "X-Requested-With", "X-Internal-Key"},
		AllowCredentials: true,
	}))

	// ============================================================
	// 🖼️ IMAGE OPTIMIZER — Serve gambar terkompresi otomatis
	// ============================================================
	imgOptimizer := handlers.NewImageOptimizer(uploadPath)
	r.GET("/uploads/*filepath", func(c *gin.Context) {
		imgOptimizer.ServeOptimized(c)
	})

	// ============================================================
	// 🌐 APPLICATION ROUTES
	// ============================================================
	routes.SetupRoutes(r, config.GormDB)

	// ============================================================
	// 🦀 OpenClaw Embedded — Runs inside the same process
	// ============================================================
	startOpenClaw(r)

	// ============================================================
	// 🎨 ASCII Art Banner
	// ============================================================
	nama := os.Getenv("NAMA")
	if nama == "" {
		nama = "c4ndalena server"
	}

	ascii := figlet4go.NewAsciiRender()
	options := figlet4go.NewRenderOptions()
	options.FontName = "standard"
	rendered, err := ascii.RenderOpts(nama, options)
	if err != nil {
		log.Printf("Error generating ASCII art: %v", err)
	} else {
		lines := strings.Split(rendered, "\n")
		colors := []func(string, ...interface{}) (int, error){
			color.New(color.FgRed).Printf,
			color.New(color.FgYellow).Printf,
			color.New(color.FgGreen).Printf,
			color.New(color.FgCyan).Printf,
			color.New(color.FgBlue).Printf,
			color.New(color.FgMagenta).Printf,
		}
		for i, line := range lines {
			if line != "" {
				colorFunc := colors[i%len(colors)]
				colorFunc("%s\n", line)
			}
		}
	}

	log.Println("Starting STUDENT HUB Server...")
	log.Println("🔒 Security Headers: Active")
	log.Println("🚦 Rate Limiter: Active (200 req/min per IP)")
	log.Println("🖼️ Image Optimizer: Active (auto-compress to JPEG 75%)")
	log.Println("Materi & Tugas System: Ready")
	log.Println("Upload directories: Created")
	log.Println("🦀 OpenClaw Reminder: Embedded & Running")

	log.Printf("Selamat datang! Ini nama '%s' dalam bentuk besar.", nama)

	log.Println("Server jalan → http://localhost:8080")
	log.Println("Materi: http://localhost:8080/uploads/materi/...")
	log.Println("Tugas Mahasiswa: http://localhost:8080/uploads/tugas/...")
	log.Println("Tugas Dosen: http://localhost:8080/uploads/tugasdosen/...")
	log.Println("Profile: http://localhost:8080/uploads/profile/...")

	port := os.Getenv("PORT")
	if port == "" {
		port = "8080"
	}
	r.Run("0.0.0.0:" + port)
}

// startOpenClaw initializes and embeds the OpenClaw reminder system
func startOpenClaw(r *gin.Engine) {
	log.Println("================================================")
	log.Println("  🦀 OpenClaw Reminder Service (Embedded)")
	log.Println("  STUDENT HUB — Tugas Notification System")
	log.Println("================================================")

	cfg := openclawConfig.Load()

	if cfg.DBDSN == "" {
		log.Println("[OpenClaw] DB_DSN not set — OpenClaw features disabled")
		return
	}

	db := openclawConfig.InitDB(cfg.DBDSN)
	sender := telegram.NewSender(cfg.TelegramBotToken, cfg.TelegramChannelID)
	log.Printf("[OpenClaw] Telegram channel: %s", cfg.TelegramChannelID)

	if cfg.TelegramBotToken != "" {
		log.Println("[OpenClaw] Telegram bot token: ✅ configured")
	} else {
		log.Println("[OpenClaw] Telegram bot token: ❌ NOT SET — notifications will fail!")
	}

	eventHandler := handler.NewEventHandler(db, sender)
	utils.SetOpenClawHandler(eventHandler)

	sched := scheduler.NewScheduler(db, sender)
	sched.Start(cfg.CronSchedule)

	outboxWorker := outbox.NewWorker(db)
	go outboxWorker.Start()

	// 🔒 Endpoint internal dilindungi oleh API key middleware
	internal := r.Group("/internal")
	internal.Use(middlewares.InternalAPIKeyMiddleware())
	{
		internal.POST("/events/tugas-created", gin.WrapF(eventHandler.HandleTugasCreated))
		internal.GET("/health", gin.WrapF(handler.HealthCheck))
	}

	log.Println("------------------------------------------------")
	log.Printf("✅ [OpenClaw] Notification Handler: Ready")
	log.Printf("✅ [OpenClaw] Scheduler (%s): Active", cfg.CronSchedule)
	log.Printf("✅ [OpenClaw] Outbox Worker: Running")
	log.Printf("🔒 [OpenClaw] Internal endpoints: Protected")
	log.Println("------------------------------------------------")
	log.Println("[OpenClaw] Embedded Engine fully initialized")
}
