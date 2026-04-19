package config

import (
	"database/sql"
	"fmt"
	"log"
	"os"

	_ "github.com/jackc/pgx/v5/stdlib"
)

// Config holds all configuration for OpenClaw service
type Config struct {
	// Database
	DBDSN string

	// Telegram
	TelegramBotToken  string
	TelegramChannelID string

	// OpenClaw
	Port         string
	CronSchedule string

	// Internal
	MaxRetryAttempts int
}

var (
	DB  *sql.DB
	Cfg *Config
)

// Load reads environment variables and returns a Config
func Load() *Config {
	cfg := &Config{
		DBDSN:             getEnv("DB_DSN", ""),
		TelegramBotToken:  getEnv("TELEGRAM_BOT_TOKEN", ""),
		TelegramChannelID: getEnv("TELEGRAM_CHANNEL_ID", "@tugasreminder"),
		Port:              getEnv("OPENCLAW_PORT", "9090"),
		CronSchedule:      getEnv("OPENCLAW_CRON_SCHEDULE", "0 * * * *"),
		MaxRetryAttempts:  3,
	}

	if cfg.DBDSN == "" {
		log.Println("[OpenClaw] WARNING: DB_DSN not set — OpenClaw DB features will be disabled")
	}

	if cfg.TelegramBotToken == "" {
		log.Println("[OpenClaw][WARN] TELEGRAM_BOT_TOKEN is not set! Telegram notifications will fail.")
	}

	Cfg = cfg
	return cfg
}

// InitDB initializes the database connection using PostgreSQL (pgx)
func InitDB(dsn string) *sql.DB {
	db, err := sql.Open("pgx", dsn)
	if err != nil {
		log.Fatalf("[OpenClaw] Failed to connect to database: %v", err)
	}

	if err := db.Ping(); err != nil {
		log.Fatalf("[OpenClaw] Failed to ping database: %v", err)
	}

	db.SetMaxOpenConns(10)
	db.SetMaxIdleConns(5)

	DB = db
	fmt.Println("[OpenClaw] Database connected successfully (PostgreSQL/Supabase)")
	return db
}

func getEnv(key, fallback string) string {
	if v := os.Getenv(key); v != "" {
		return v
	}
	return fallback
}
