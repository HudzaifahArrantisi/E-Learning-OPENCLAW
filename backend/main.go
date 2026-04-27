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

	r := gin.New()
	r.SetTrustedProxies(nil)

	// Recover from any panics and log them
	r.Use(gin.Recovery())

	// ============================================================
	// 📝 STRUCTURED REQUEST LOGGING
	// Logs every request to stdout — Docker captures automatically
	// Format: timestamp | METHOD /path | status | duration | IP
	// ============================================================
	r.Use(func(c *gin.Context) {
		start := time.Now()
		path := c.Request.URL.Path
		raw := c.Request.URL.RawQuery
		if raw != "" {
			path = path + "?" + raw
		}

		// Process request
		c.Next()

		// Calculate latency
		latency := time.Since(start)
		status := c.Writer.Status()
		clientIP := c.ClientIP()
		method := c.Request.Method
		size := c.Writer.Size()

		// Color status code for readability
		var level string
		switch {
		case status >= 500:
			level = "ERROR"
		case status >= 400:
			level = "WARN"
		default:
			level = "INFO"
		}

		log.Printf("[%s] %s %s | status=%d | time=%v | ip=%s | size=%d",
			level, method, path, status, latency, clientIP, size)

		// Log errors in detail
		if len(c.Errors) > 0 {
			for _, e := range c.Errors {
				log.Printf("[ERROR] %s", e.Error())
			}
		}
	})

	// ============================================================
	// 🩺 HEALTH CHECK — Used by Docker healthcheck & monitoring
	// ============================================================
	r.GET("/health", func(c *gin.Context) {
		c.JSON(200, gin.H{
			"status":  "ok",
			"service": "E-Learning-OPENCLAW Backend",
		})
	})

	// ============================================================
	// 🔒 SECURITY MIDDLEWARES
	// ============================================================

	// CORS Configuration — MUST BE AT THE TOP
	// Reads extra allowed origins from ALLOWED_ORIGINS env var (comma-separated)
	allowedOriginsEnv := os.Getenv("ALLOWED_ORIGINS")
	var extraOrigins []string
	if allowedOriginsEnv != "" {
		for _, o := range strings.Split(allowedOriginsEnv, ",") {
			extraOrigins = append(extraOrigins, strings.TrimSpace(o))
		}
	}

	r.Use(cors.New(cors.Config{
		AllowOriginFunc: func(origin string) bool {
			// Always allow localhost for development
			if strings.HasPrefix(origin, "http://localhost") {
				return true
			}
			// Always allow Vercel production frontend
			if strings.HasPrefix(origin, "https://e-learning-openclaw.vercel.app") {
				return true
			}
			// Allow andromedahub.my.id (custom domain)
			if origin == "https://andromedahub.my.id" ||
				origin == "https://www.andromedahub.my.id" {
				return true
			}
			// Allow local network IPs (for Kali Linux VM testing)
			if strings.HasPrefix(origin, "http://192.168.") ||
				strings.HasPrefix(origin, "http://10.") ||
				strings.HasPrefix(origin, "http://172.") {
				return true
			}
			// Allow extra origins from ALLOWED_ORIGINS env var
			for _, allowed := range extraOrigins {
				if origin == allowed {
					return true
				}
			}
			return false
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
	log.Println("📝 Structured Logging: Active (stdout → Docker)")

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
