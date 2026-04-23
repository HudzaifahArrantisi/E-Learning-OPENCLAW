package config

import (
	"database/sql"
	"fmt"
	"log"
	"os"
	"time"

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

// InitDB initializes the database connection using PostgreSQL (pgx).
// Configured for Supabase transaction pooler with conservative pool limits.
func InitDB(dsn string) *sql.DB {
	db, err := sql.Open("pgx", dsn)
	if err != nil {
		log.Fatalf("[OpenClaw] Failed to connect to database: %v", err)
	}

	// ─── Pool limits for Supabase Free Tier ───
	// Keep LOW to leave headroom for the main GORM pool.
	db.SetMaxOpenConns(3)
	db.SetMaxIdleConns(1)
	db.SetConnMaxLifetime(5 * time.Minute)
	db.SetConnMaxIdleTime(1 * time.Minute)
	// ──────────────────────────────────────────

	// Ping with retry — do NOT crash on transient failures
	if err := pingWithRetry(db, 3, 2*time.Second); err != nil {
		log.Printf("[OpenClaw] WARNING: Database ping failed after retries: %v", err)
		log.Println("[OpenClaw] Will start without confirmed DB connectivity — will retry on first query.")
	} else {
		fmt.Println("[OpenClaw] Database connected successfully (PostgreSQL/Supabase — Transaction Pooler)")
	}

	DB = db
	return db
}

// InitDBFromExisting reuses an existing *sql.DB connection instead of opening a new one.
// This is the PREFERRED method in serverless environments to avoid connection explosion.
func InitDBFromExisting(existingDB *sql.DB) *sql.DB {
	DB = existingDB
	log.Println("[OpenClaw] Reusing existing database connection (shared pool)")
	return existingDB
}

// pingWithRetry attempts to ping the database with exponential backoff.
func pingWithRetry(db *sql.DB, maxRetries int, initialDelay time.Duration) error {
	var err error
	delay := initialDelay

	for attempt := 1; attempt <= maxRetries; attempt++ {
		err = db.Ping()
		if err == nil {
			return nil
		}

		log.Printf("[OpenClaw] Ping attempt %d/%d failed: %v — retrying in %v", attempt, maxRetries, err, delay)
		if attempt < maxRetries {
			time.Sleep(delay)
			delay *= 2
			if delay > 15*time.Second {
				delay = 15 * time.Second
			}
		}
	}

	return fmt.Errorf("[OpenClaw] all %d ping attempts failed: %w", maxRetries, err)
}

func getEnv(key, fallback string) string {
	if v := os.Getenv(key); v != "" {
		return v
	}
	return fallback
}
