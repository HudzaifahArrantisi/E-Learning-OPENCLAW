package main

import (
	"database/sql"
	"log"
	"os"
	"strings"
	"time"

	"nf-student-hub-backend/config"
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
	log.Println("Initializing database...")
	config.InitDB()
	
	if config.DB == nil {
		log.Fatal("FATAL: Database connection is nil after initialization")
	} else {
		log.Println("Database connected successfully ✅")
	}

	r := gin.Default()
	r.SetTrustedProxies(nil)

	// Recover from any panics and log them
	r.Use(gin.Recovery())

	// ============================================================
	// 🔒 SECURITY MIDDLEWARES
	// ============================================================

	// CORS Configuration — MUST BE AT THE TOP
	r.Use(cors.New(cors.Config{
		AllowOriginFunc: func(origin string) bool {
			return strings.HasPrefix(origin, "http://localhost") ||
				strings.HasPrefix(origin, "https://e-learning-openclaw.vercel.app") ||
				strings.HasPrefix(origin, "http://192.168.") ||
				strings.HasPrefix(origin, "http://10.") ||
				strings.HasPrefix(origin, "http://172.")
		},
		AllowMethods:     []string{"GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"},
		AllowHeaders:     []string{"Origin", "Content-Length", "Content-Type", "Authorization", "Accept", "X-Requested-With", "X-Internal-Key"},
		ExposeHeaders:    []string{"Content-Length"},
		AllowCredentials: true,
		MaxAge:           12 * time.Hour,
	}))

	r.Use(middlewares.SecurityHeaders())
	r.Use(middlewares.RateLimitMiddleware(200, 1*time.Minute)) // Global: 200 req/min per IP

	// ============================================================
	// 📦 FILE SERVING — Database BYTEA (no filesystem)
	// ============================================================
	// All file uploads are stored in PostgreSQL BYTEA column.
	// Files are served via /api/files/:id endpoint (in routes.go).
	// No /uploads directory is needed or created.
	// ============================================================

	routes.SetupRoutes(r, config.GormDB)


	startOpenClaw(r)

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
	log.Println("📦 Upload System: Database BYTEA (no filesystem)")
	log.Println("🖼️ Image Compression: Auto JPEG 75% on upload")
	log.Println("📡 File Serving: /api/files/:id (streaming from DB)")
	log.Println("🦀 OpenClaw Reminder: Embedded & Running")

	log.Printf("Selamat datang! Ini nama '%s' dalam bentuk besar.", nama)

	log.Println("Server jalan → http://localhost:8080")
	log.Println("Files: http://localhost:8080/api/files/{id}")
	log.Println("Upload: POST http://localhost:8080/api/uploads")

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

	// IMPORTANT: Reuse the main database connection pool instead of creating a new one.
	// This prevents connection explosion on Supabase's 15-connection limit.
	var db *sql.DB
	if config.DB != nil {
		db = openclawConfig.InitDBFromExisting(config.DB)
	} else {
		db = openclawConfig.InitDB(cfg.DBDSN)
	}
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
	}

	log.Println("------------------------------------------------")
	log.Printf("✅ [OpenClaw] Notification Handler: Ready")
	log.Printf("✅ [OpenClaw] Scheduler (%s): Active", cfg.CronSchedule)
	log.Printf("✅ [OpenClaw] Outbox Worker: Running")
	log.Printf("🔒 [OpenClaw] Internal endpoints: Protected")
	log.Println("------------------------------------------------")
	log.Println("[OpenClaw] Embedded Engine fully initialized")
}
