package config

import (
	"database/sql"
	"fmt"
	"log"
	"os"
	"sync"
	"time"

	_ "github.com/jackc/pgx/v5/stdlib"
	"gorm.io/driver/postgres"
	"gorm.io/gorm"
	"gorm.io/gorm/logger"
)

// DB keeps the original *sql.DB for existing code that uses Query/Exec
var DB *sql.DB

// GormDB is the GORM *gorm.DB instance for ORM usage
var GormDB *gorm.DB

// initOnce ensures database is initialized exactly once (singleton)
var initOnce sync.Once

// initErr stores any error from initialization
var initErr error

// InitDB initializes both *sql.DB and *gorm.DB connections using PostgreSQL (Supabase).
// Uses sync.Once to guarantee singleton — safe for serverless cold starts and concurrent calls.
//
// IMPORTANT for Supabase serverless:
//   - Use TRANSACTION pooler (port 6543), NOT session pooler (port 5432)
//   - DB_DSN format: postgresql://postgres.[REF]:[PASS]@aws-0-[REGION].pooler.supabase.com:6543/postgres
func InitDB() {
	initOnce.Do(func() {
		dsn := os.Getenv("DB_DSN")
		if dsn == "" {
			log.Fatal("DB_DSN environment variable is required for PostgreSQL connection")
		}

		// Initialize GORM with PostgreSQL driver
		gdb, err := gorm.Open(postgres.Open(dsn), &gorm.Config{
			Logger: logger.Default.LogMode(logger.Silent),
			// Disable prepared statements — required for Supabase transaction pooling (PgBouncer).
			// PgBouncer in transaction mode cannot track prepared statements across connections.
			PrepareStmt: false,
		})
		if err != nil {
			initErr = fmt.Errorf("failed to connect to database (gorm): %w", err)
			log.Fatalf("FATAL: %v", initErr)
		}

		// Retrieve underlying sql.DB to configure pool
		sqlDB, err := gdb.DB()
		if err != nil {
			initErr = fmt.Errorf("failed to get underlying sql.DB: %w", err)
			log.Fatalf("FATAL: %v", initErr)
		}

		// ─── Connection Pool Configuration (Supabase Free Tier) ───
		// Supabase transaction pooler allows ~15 concurrent connections.
		// We keep our pool small to avoid exhausting the limit,
		// especially when multiple serverless instances run in parallel.
		sqlDB.SetMaxOpenConns(5)               // Max 5 active connections per instance
		sqlDB.SetMaxIdleConns(2)               // Keep 2 idle connections warm
		sqlDB.SetConnMaxLifetime(5 * time.Minute) // Recycle connections every 5 min
		sqlDB.SetConnMaxIdleTime(1 * time.Minute) // Close idle connections after 1 min
		// ──────────────────────────────────────────────────────────

		// Ping with retry + exponential backoff — do NOT crash on transient failures
		if err := pingWithRetry(sqlDB, 5, 2*time.Second); err != nil {
			log.Printf("WARNING: Database ping failed after retries: %v", err)
			log.Println("WARNING: App will start, but DB may be temporarily unreachable.")
			// Do NOT log.Fatal here — let the app start and recover when DB becomes available.
		}

		// Assign package-level singletons
		GormDB = gdb
		DB = sqlDB

		log.Println("Database connected successfully (PostgreSQL/Supabase — Transaction Pooler)")
	})
}

// pingWithRetry attempts to ping the database with exponential backoff.
// Returns nil on success, or the last error after all retries are exhausted.
func pingWithRetry(db *sql.DB, maxRetries int, initialDelay time.Duration) error {
	var err error
	delay := initialDelay

	for attempt := 1; attempt <= maxRetries; attempt++ {
		err = db.Ping()
		if err == nil {
			if attempt > 1 {
				log.Printf("Database ping succeeded on attempt %d/%d", attempt, maxRetries)
			}
			return nil
		}

		log.Printf("Database ping attempt %d/%d failed: %v — retrying in %v", attempt, maxRetries, err, delay)

		if attempt < maxRetries {
			time.Sleep(delay)
			delay *= 2 // exponential backoff: 2s → 4s → 8s → 16s
			if delay > 30*time.Second {
				delay = 30 * time.Second // cap at 30s
			}
		}
	}

	return fmt.Errorf("all %d ping attempts failed, last error: %w", maxRetries, err)
}

// GetDB returns the singleton *sql.DB, initializing if needed.
// Safe for lazy initialization in serverless request handlers.
func GetDB() *sql.DB {
	if DB == nil {
		InitDB()
	}
	return DB
}

// GetGormDB returns the singleton *gorm.DB, initializing if needed.
// Safe for lazy initialization in serverless request handlers.
func GetGormDB() *gorm.DB {
	if GormDB == nil {
		InitDB()
	}
	return GormDB
}
