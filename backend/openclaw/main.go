package main

import (
	"fmt"
	"log"
	"net/http"
	"os"
	"os/signal"
	"syscall"

	"openclaw/config"
	"openclaw/handler"
	"openclaw/outbox"
	"openclaw/scheduler"
	"openclaw/telegram"

	"github.com/joho/godotenv"
)

func main() {
	// Load .env from parent directory (shared with main backend)
	godotenv.Load("../.env")
	godotenv.Load(".env")

	fmt.Println("================================================")
	fmt.Println("  🦀 OpenClaw Reminder Service")
	fmt.Println("  NF Student HUB — Tugas Notification System")
	fmt.Println("================================================")

	// Load configuration
	cfg := config.Load()

	// Initialize database
	db := config.InitDB(cfg.DBDSN)
	defer db.Close()

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

	// Initialize and start scheduler
	sched := scheduler.NewScheduler(db, sender)
	sched.Start(cfg.CronSchedule)
	defer sched.Stop()

	// Initialize and start outbox worker in background
	outboxWorker := outbox.NewWorker(db)
	go outboxWorker.Start()

	// Setup HTTP routes
	mux := http.NewServeMux()

	// Internal event endpoint
	mux.HandleFunc("/internal/events/tugas-created", eventHandler.HandleTugasCreated)

	// Health check
	mux.HandleFunc("/health", handler.HealthCheck)

	// Start HTTP server
	addr := ":" + cfg.Port
	log.Printf("[OpenClaw] HTTP server starting on %s", addr)
	log.Printf("[OpenClaw] Event endpoint: POST http://localhost:%s/internal/events/tugas-created", cfg.Port)
	log.Printf("[OpenClaw] Health check: GET http://localhost:%s/health", cfg.Port)

	// Graceful shutdown
	go func() {
		sigChan := make(chan os.Signal, 1)
		signal.Notify(sigChan, syscall.SIGINT, syscall.SIGTERM)
		<-sigChan

		log.Println("[OpenClaw] Shutting down gracefully...")
		sched.Stop()
		db.Close()
		os.Exit(0)
	}()

	if err := http.ListenAndServe(addr, mux); err != nil {
		log.Fatalf("[OpenClaw] Server failed: %v", err)
	}
}
