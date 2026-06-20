package main

import (
	"bufio"
	"database/sql"
	"fmt"
	"io"
	"log"
	"net/http"
	"net/url"
	"os"
	"os/exec"
	"os/signal"
	"path/filepath"
	"strconv"
	"strings"
	"syscall"
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
		log.Println("Database connected successfully ")
	}

	r := gin.Default()

	r.GET("/health", func(c *gin.Context) {
		c.JSON(200, gin.H{
			"status":  "ok",
			"service": "E-Learning-OPENCLAW Backend",
		})
	})

	// ============================================================
	// 🔒 SECURITY MIDDLEWARES
	// ============================================================
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
			// Allow Cloudflare Tunnels
			if strings.HasSuffix(origin, ".trycloudflare.com") {
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
	rateLimitMaxRequests := getEnvInt("RATE_LIMIT_MAX_REQUESTS", 800)
	r.Use(middlewares.RateLimitMiddleware(rateLimitMaxRequests, 1*time.Minute))

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
	log.Printf("🚦 Rate Limiter: Active (%d req/min per user or IP)", rateLimitMaxRequests)
	log.Println("📦 Upload System: Filesystem storage (metadata in DB)")
	log.Println("🖼️ Image Compression: Smart auto-compress (native Go, JPEG/PNG)")
	log.Println("📡 File Serving: /api/files/:id (filesystem + BYTEA fallback)")
	log.Println("🦀 OpenClaw Reminder: Embedded & Running")
	log.Println("📝 Structured Logging: Active (stdout → Docker)")

	log.Printf("Selamat datang! Ini nama '%s' dalam bentuk besar.", nama)

	log.Println("Server jalan → http://localhost:8080")
	log.Println("Files: http://localhost:8080/api/files/{id}")
	log.Println("Upload: POST http://localhost:8080/api/uploads")

	// Launch the bundled Python (Flask) PDDikti microservice as a managed child
	// process so a single `go run main.go` starts everything together.
	pyCmd := startPDDiktiService()
	setupGracefulShutdown(pyCmd)

	// Probe the PDDikti provider in the background so the API server starts
	// listening immediately. If the provider is down, registration endpoints
	// return 503 at request time (see lookupPDDiktiStudent) — the backend itself
	// must not be blocked or killed by an unavailable external service.
	go waitForPDDiktiProvider()

	port := os.Getenv("PORT")
	if port == "" {
		port = "8080"
	}
	if err := r.Run("0.0.0.0:" + port); err != nil {
		log.Fatalf("Failed to start HTTP server: %v", err)
	}
}

// setupGracefulShutdown kills the embedded Python service when the backend exits.
func setupGracefulShutdown(pyCmd *exec.Cmd) {
	sigCh := make(chan os.Signal, 1)
	signal.Notify(sigCh, os.Interrupt, syscall.SIGTERM)
	go func() {
		<-sigCh
		log.Println("Shutting down...")
		stopPDDiktiService(pyCmd)
		os.Exit(0)
	}()
}

// startPDDiktiService spawns pddikti_service.py as a child process (port 5001 by
// default). Returns nil — and lets the backend run anyway — if it cannot start;
// NIM verification then returns 503 until the service is reachable.
func startPDDiktiService() *exec.Cmd {
	if strings.EqualFold(strings.TrimSpace(os.Getenv("PDDIKTI_AUTOSTART")), "false") {
		log.Println("[PDDikti] Autostart disabled (PDDIKTI_AUTOSTART=false)")
		return nil
	}
	if !pddiktiTargetsLocalhost() {
		log.Println("[PDDikti] Verify URL is not local; skipping embedded Python service")
		return nil
	}

	scriptPath := resolvePDDiktiScriptPath()
	if scriptPath == "" {
		log.Println("[PDDikti] pddikti_service.py not found; set PDDIKTI_SCRIPT_PATH. Skipping embedded service")
		return nil
	}

	pythonBin := resolvePythonBin()
	if pythonBin == "" {
		log.Println("[PDDikti] Python interpreter not found; set PYTHON_BIN. Skipping embedded service")
		return nil
	}

	if strings.EqualFold(strings.TrimSpace(os.Getenv("PDDIKTI_PIP_INSTALL")), "true") {
		installPythonDeps(pythonBin, filepath.Dir(scriptPath))
	}

	port := pddiktiServicePort()
	cmd := exec.Command(pythonBin, scriptPath)
	cmd.Dir = filepath.Dir(scriptPath)
	cmd.Env = append(os.Environ(), "PYTHON_PORT="+port)

	stdout, _ := cmd.StdoutPipe()
	stderr, _ := cmd.StderrPipe()

	if err := cmd.Start(); err != nil {
		log.Printf("[PDDikti] Failed to start Python service (%s %s): %v", pythonBin, scriptPath, err)
		return nil
	}

	log.Printf("[PDDikti] Embedded Python service starting (pid %d) on port %s via %s", cmd.Process.Pid, port, pythonBin)
	go pipeChildLogs("PDDikti", stdout)
	go pipeChildLogs("PDDikti", stderr)

	return cmd
}

// stopPDDiktiService terminates the embedded Python child process.
func stopPDDiktiService(pyCmd *exec.Cmd) {
	if pyCmd == nil || pyCmd.Process == nil {
		return
	}
	log.Println("[PDDikti] Stopping embedded Python service...")
	if err := pyCmd.Process.Kill(); err != nil {
		log.Printf("[PDDikti] Failed to stop Python service: %v", err)
	}
}

// installPythonDeps runs `python -m pip install -r requirements.txt` (opt-in via
// PDDIKTI_PIP_INSTALL=true) so first-run can be fully hands-off.
func installPythonDeps(pythonBin, dir string) {
	req := filepath.Join(dir, "requirements.txt")
	if _, err := os.Stat(req); err != nil {
		log.Printf("[PDDikti] PDDIKTI_PIP_INSTALL=true but %s not found; skipping pip install", req)
		return
	}
	log.Println("[PDDikti] Installing Python dependencies (PDDIKTI_PIP_INSTALL=true)...")
	cmd := exec.Command(pythonBin, "-m", "pip", "install", "-r", req)
	cmd.Stdout = os.Stdout
	cmd.Stderr = os.Stderr
	if err := cmd.Run(); err != nil {
		log.Printf("[PDDikti] pip install failed: %v", err)
	}
}

func pipeChildLogs(prefix string, r io.Reader) {
	if r == nil {
		return
	}
	scanner := bufio.NewScanner(r)
	for scanner.Scan() {
		log.Printf("[%s] %s", prefix, scanner.Text())
	}
}

func resolvePythonBin() string {
	if bin := strings.TrimSpace(os.Getenv("PYTHON_BIN")); bin != "" {
		if path, err := exec.LookPath(bin); err == nil {
			return path
		}
		log.Printf("[PDDikti] PYTHON_BIN=%q not found in PATH", bin)
		return ""
	}
	for _, candidate := range []string{"python", "python3", "py"} {
		if path, err := exec.LookPath(candidate); err == nil {
			return path
		}
	}
	return ""
}

func resolvePDDiktiScriptPath() string {
	var candidates []string
	if p := strings.TrimSpace(os.Getenv("PDDIKTI_SCRIPT_PATH")); p != "" {
		candidates = append(candidates, p)
	}
	candidates = append(candidates,
		filepath.Join("..", "pddikti_service.py"), // repo root (running from backend/)
		"pddikti_service.py",
	)
	if wd, err := os.Getwd(); err == nil {
		candidates = append(candidates, filepath.Join(wd, "..", "pddikti_service.py"))
	}
	for _, c := range candidates {
		if info, err := os.Stat(c); err == nil && !info.IsDir() {
			if abs, err := filepath.Abs(c); err == nil {
				return abs
			}
			return c
		}
	}
	return ""
}

func pddiktiServicePort() string {
	if verifyURL := strings.TrimSpace(os.Getenv("PDDIKTI_VERIFY_URL")); verifyURL != "" {
		if parsed, err := url.Parse(verifyURL); err == nil {
			if p := parsed.Port(); p != "" {
				return p
			}
		}
	}
	return "5001"
}

func pddiktiTargetsLocalhost() bool {
	verifyURL := strings.TrimSpace(os.Getenv("PDDIKTI_VERIFY_URL"))
	if verifyURL == "" {
		return true // default template targets localhost
	}
	parsed, err := url.Parse(verifyURL)
	if err != nil {
		return false
	}
	host := parsed.Hostname()
	return host == "localhost" || host == "127.0.0.1" || host == "::1"
}

func getEnvInt(key string, fallback int) int {
	raw := strings.TrimSpace(os.Getenv(key))
	if raw == "" {
		return fallback
	}

	value, err := strconv.Atoi(raw)
	if err != nil || value <= 0 {
		log.Printf("Invalid %s=%q; using default %d", key, raw, fallback)
		return fallback
	}

	return value
}

func waitForPDDiktiProvider() {
	healthURL := getPDDiktiHealthURL()
	if healthURL == "" {
		return
	}

	timeout := time.Duration(getEnvInt("PDDIKTI_STARTUP_TIMEOUT_SECONDS", 60)) * time.Second
	deadline := time.Now().Add(timeout)
	client := &http.Client{Timeout: 2 * time.Second}

	log.Printf("Waiting for PDDikti service health check: %s", healthURL)
	for attempt := 1; ; attempt++ {
		resp, err := client.Get(healthURL)
		if err == nil {
			resp.Body.Close()
			if resp.StatusCode >= http.StatusOK && resp.StatusCode < http.StatusMultipleChoices {
				log.Printf("PDDikti service is healthy after %d attempt(s)", attempt)
				return
			}
			err = fmt.Errorf("unexpected status %d", resp.StatusCode)
		}

		if time.Now().After(deadline) {
			log.Printf("WARNING: PDDikti service not healthy within %s: %v. "+
				"Server is running; NIM verification will return 503 until the service is reachable.", timeout, err)
			return
		}

		log.Printf("PDDikti health check attempt %d failed; retrying in 1s", attempt)
		time.Sleep(time.Second)
	}
}

func getPDDiktiHealthURL() string {
	if healthURL := strings.TrimSpace(os.Getenv("PDDIKTI_HEALTH_URL")); healthURL != "" {
		return healthURL
	}

	verifyURL := strings.TrimSpace(os.Getenv("PDDIKTI_VERIFY_URL"))
	if verifyURL == "" {
		return ""
	}

	parsed, err := url.Parse(verifyURL)
	if err != nil || parsed.Scheme == "" || parsed.Host == "" {
		return ""
	}

	host := parsed.Hostname()
	if host != "localhost" && host != "127.0.0.1" && host != "::1" {
		return ""
	}

	return parsed.Scheme + "://" + parsed.Host + "/health"
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
