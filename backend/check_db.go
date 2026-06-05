package main

import (
	"database/sql"
	"fmt"
	"log"
	"os"
	"time"

	_ "github.com/jackc/pgx/v5/stdlib"
	"github.com/joho/godotenv"
)

func main() {
	// Load .env
	err := godotenv.Load(".env")
	if err != nil {
		log.Println("No .env file found, using system environment variables")
	}

	dsn := os.Getenv("DB_DSN")
	if dsn == "" {
		log.Fatal("DB_DSN environment variable is required")
	}

	db, err := sql.Open("pgx", dsn)
	if err != nil {
		log.Fatalf("Failed to open DB: %v", err)
	}
	defer db.Close()

	err = db.Ping()
	if err != nil {
		log.Fatalf("Failed to ping DB: %v", err)
	}
	fmt.Println("Successfully connected to database!")

	// 1. Check sizes of tables
	tables := []string{"tugas", "mata_kuliah", "mahasiswa_mata_kuliah", "submissions"}
	for _, t := range tables {
		var count int
		err = db.QueryRow(fmt.Sprintf("SELECT COUNT(*) FROM %s", t)).Scan(&count)
		if err != nil {
			fmt.Printf("Error counting rows in %s: %v\n", t, err)
		} else {
			fmt.Printf("Table %s has %d rows\n", t, count)
		}
	}

	// 2. Measure query time
	// Let's get one student ID from mahasiswa table
	var mahasiswaID int
	err = db.QueryRow("SELECT id FROM mahasiswa LIMIT 1").Scan(&mahasiswaID)
	if err != nil {
		log.Fatalf("Failed to get a student ID: %v", err)
	}
	fmt.Printf("Testing query using student ID: %d\n", mahasiswaID)

	query := `
		SELECT 
			t.id,
			t.course_id,
			mk.nama AS course_name,
			t.pertemuan,
			t.title,
			COALESCE(t.description, '') AS description,
			COALESCE(t.file_tugas, '') AS file_tugas,
			t.due_date,
			COALESCE(t.type, 'tugas') AS type,
			t.created_at,
			s.id AS submission_id,
			s.grade
		FROM tugas t
		JOIN mata_kuliah mk ON t.course_id = mk.kode
		JOIN mahasiswa_mata_kuliah mmk ON mmk.mata_kuliah_kode = t.course_id
		LEFT JOIN submissions s ON s.task_id = t.id AND s.student_id = $1
		WHERE mmk.mahasiswa_id = $2
			AND t.deleted_at IS NULL
		ORDER BY t.created_at DESC
	`

	start := time.Now()
	rows, err := db.Query(query, mahasiswaID, mahasiswaID)
	if err != nil {
		log.Fatalf("Query failed: %v", err)
	}
	defer rows.Close()

	count := 0
	for rows.Next() {
		count++
	}
	duration := time.Since(start)
	fmt.Printf("Query retrieved %d tasks in %v\n", count, duration)

	// Explain analyze
	fmt.Println("\nRunning EXPLAIN ANALYZE on the query:")
	explainQuery := "EXPLAIN ANALYZE " + query
	explainRows, err := db.Query(explainQuery, mahasiswaID, mahasiswaID)
	if err != nil {
		log.Fatalf("Explain query failed: %v", err)
	}
	defer explainRows.Close()

	for explainRows.Next() {
		var line string
		if err := explainRows.Scan(&line); err != nil {
			log.Fatalf("Scan failed: %v", err)
		}
		fmt.Println(line)
	}
}
