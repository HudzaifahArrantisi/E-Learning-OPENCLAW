package main

import (
	"log"
	"os"
	"strings"

	"nf-student-hub-backend/config"
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

	// Cek apakah kita berjalan di root atau di dalam folder backend
	uploadPath := "./uploads"
	if _, err := os.Stat("./backend/uploads"); err == nil {
		uploadPath = "./backend/uploads"
	} else if _, err := os.Stat("./uploads"); os.IsNotExist(err) {
		// Buat folder jika benar-benar tidak ada
		os.MkdirAll("uploads/posts", 0755)
		os.MkdirAll("uploads/materi", 0755)
		os.MkdirAll("uploads/tugas", 0755)
		os.MkdirAll("uploads/tugasdosen", 0755)
		os.MkdirAll("uploads/profile", 0755)
	}

	r.Static("/uploads", uploadPath)

	r := gin.Default()
	r.SetTrustedProxies(nil)
	r.Use(cors.New(cors.Config{
		AllowOriginFunc: func(origin string) bool { return true },
		AllowMethods:     []string{"GET", "POST", "PUT", "DELETE", "OPTIONS"},
		AllowHeaders:     []string{"Origin", "Content-Type", "Authorization", "Accept", "X-Requested-With"},
		AllowCredentials: true,
	}))

	routes.SetupRoutes(r, config.GormDB)

	// ============================================================
	// 🦀 OpenClaw Embedded — Runs inside the same process
	// ============================================================
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
			if line != "" { // Skip empty lines
				colorFunc := colors[i%len(colors)]
				colorFunc("%s\n", line)
			}
		}
	}
	log.Println("Starting STUDENT HUB Server...")
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
// directly into the main backend server (no separate service needed).
func startOpenClaw(r *gin.Engine) {
	log.Println("================================================")
	log.Println("  🦀 OpenClaw Reminder Service (Embedded)")
	log.Println("  STUDENT HUB — Tugas Notification System")
	log.Println("================================================")

	// Load OpenClaw configuration from the same .env
	cfg := openclawConfig.Load()

	// Skip OpenClaw Db initialization if DB_DSN is empty
	if cfg.DBDSN == "" {
		log.Println("[OpenClaw] DB_DSN not set — OpenClaw features disabled")
		return
	}

	// Initialize OpenClaw's own database connection (raw sql.DB via pgx)
	db := openclawConfig.InitDB(cfg.DBDSN)

	// Initialize Telegram sender
	sender := telegram.NewSender(cfg.TelegramBotToken, cfg.TelegramChannelID)
	log.Printf("[OpenClaw] Telegram channel: %s", cfg.TelegramChannelID)

	if cfg.TelegramBotToken != "" {
		log.Println("[OpenClaw] Telegram bot token: ✅ configured")
	} else {
		log.Println("[OpenClaw] Telegram bot token: ❌ NOT SET — notifications will fail!")
	}

	// Initialize event handler
	eventHandler := handler.NewEventHandler(db, sender)

	// Register the handler so utils/openclaw.go can call it directly in-process
	utils.SetOpenClawHandler(eventHandler)

	// Initialize and start scheduler (cron-based reminders)
	sched := scheduler.NewScheduler(db, sender)
	sched.Start(cfg.CronSchedule)

	// Initialize and start outbox worker in background
	outboxWorker := outbox.NewWorker(db)
	go outboxWorker.Start()

	// Register OpenClaw HTTP endpoints inside the Gin router
	r.POST("/internal/events/tugas-created", gin.WrapF(eventHandler.HandleTugasCreated))
	r.GET("/internal/health", gin.WrapF(handler.HealthCheck))

	log.Println("------------------------------------------------")
	log.Printf("✅ [OpenClaw] Notification Handler: Ready")
	log.Printf("✅ [OpenClaw] Scheduler (%s): Active", cfg.CronSchedule)
	log.Printf("✅ [OpenClaw] Outbox Worker: Running")
	log.Println("------------------------------------------------")
	log.Println("[OpenClaw] Embedded Engine fully initialized")
}
