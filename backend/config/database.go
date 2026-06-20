package config

import (
	"database/sql"
	"fmt"
	"log"
	"os"
	"strings"
	"sync"
	"time"

	_ "github.com/jackc/pgx/v5/stdlib"
	"gorm.io/driver/postgres"
	"gorm.io/gorm"
	"gorm.io/gorm/logger"
	"nf-student-hub-backend/models"
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
//   - DB_DSN or DATABASE_URL format:
//     postgresql://postgres.[REF]:[PASS]@aws-0-[REGION].pooler.supabase.com:6543/postgres
func InitDB() {
	initOnce.Do(func() {
		dsn := strings.TrimSpace(os.Getenv("DB_DSN"))
		if dsn == "" {
			dsn = strings.TrimSpace(os.Getenv("DATABASE_URL"))
		}
		if dsn == "" {
			log.Fatal("DB_DSN or DATABASE_URL environment variable is required for PostgreSQL connection")
		}

		// Disable pgx prepared statement cache to fix Supabase transaction pooling (42P05 error)
		if !strings.Contains(dsn, "default_query_exec_mode") {
			if strings.Contains(dsn, "?") {
				dsn += "&default_query_exec_mode=exec&statement_cache_capacity=0"
			} else {
				dsn += "?default_query_exec_mode=exec&statement_cache_capacity=0"
			}
		}

		// Initialize GORM with PostgreSQL driver
		gdb, err := gorm.Open(postgres.Open(dsn), &gorm.Config{
			Logger:      logger.Default.LogMode(logger.Silent),
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

		sqlDB.SetMaxOpenConns(25)                 // Allow more concurrent connections to avoid queuing latency
		sqlDB.SetMaxIdleConns(10)                 // Keep 10 idle connections warm to avoid connection startup latency
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

		if err := gdb.AutoMigrate(&models.Follow{}, &models.SocialNotification{}); err != nil {
			log.Printf("WARNING: social feature migration failed: %v", err)
		}
		if err := ensureUploadSchemaCompatibility(sqlDB); err != nil {
			log.Printf("WARNING: upload schema compatibility migration failed: %v", err)
		}

		log.Println("Database connected successfully (PostgreSQL/Supabase — Transaction Pooler)")
	})
}

func ensureUploadSchemaCompatibility(db *sql.DB) error {
	statements := []string{
		`ALTER TABLE uploads ADD COLUMN IF NOT EXISTS file_path TEXT`,
		`ALTER TABLE uploads ADD COLUMN IF NOT EXISTS width INTEGER NOT NULL DEFAULT 0`,
		`ALTER TABLE uploads ADD COLUMN IF NOT EXISTS height INTEGER NOT NULL DEFAULT 0`,
		`ALTER TABLE uploads ALTER COLUMN file_data DROP NOT NULL`,
		`CREATE EXTENSION IF NOT EXISTS "uuid-ossp"`,
		`ALTER TABLE uploads ADD COLUMN IF NOT EXISTS uuid UUID DEFAULT uuid_generate_v4()`,
		`UPDATE uploads SET uuid = uuid_generate_v4() WHERE uuid IS NULL`,
		`ALTER TABLE uploads ALTER COLUMN uuid SET NOT NULL`,
		`CREATE UNIQUE INDEX IF NOT EXISTS idx_uploads_uuid ON uploads (uuid)`,
		`CREATE INDEX IF NOT EXISTS idx_uploads_uuid_active ON uploads (uuid) WHERE deleted_at IS NULL AND status = 'ready'`,
	}

	for _, stmt := range statements {
		if _, err := db.Exec(stmt); err != nil {
			return fmt.Errorf("%s: %w", stmt, err)
		}
	}

	return nil
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
