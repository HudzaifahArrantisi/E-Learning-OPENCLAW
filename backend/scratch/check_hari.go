package main

import (
	"database/sql"
	"fmt"
	"log"
	"os"
	"strings"

	_ "github.com/jackc/pgx/v5/stdlib"
	"github.com/joho/godotenv"
)

func main() {
	godotenv.Load(".env")

	dsn := os.Getenv("DB_DSN")
	if dsn == "" {
		log.Fatal("DB_DSN is required")
	}

	if !strings.Contains(dsn, "default_query_exec_mode") {
		if strings.Contains(dsn, "?") {
			dsn += "&default_query_exec_mode=exec&statement_cache_capacity=0"
		} else {
			dsn += "?default_query_exec_mode=exec&statement_cache_capacity=0"
		}
	}

	db, err := sql.Open("pgx", dsn)
	if err != nil {
		log.Fatalf("Failed to open connection: %v", err)
	}
	defer db.Close()

	fmt.Println("=== mata_kuliah column types ===")
	rows, err := db.Query(`
		SELECT column_name, data_type, udt_name
		FROM information_schema.columns
		WHERE table_name = 'mata_kuliah'
		ORDER BY ordinal_position
	`)
	if err != nil {
		log.Fatalf("Failed to query mata_kuliah columns: %v", err)
	}
	defer rows.Close()
	for rows.Next() {
		var name, dtype, udt string
		rows.Scan(&name, &dtype, &udt)
		fmt.Printf("  %s: %s (udt: %s)\n", name, dtype, udt)
	}

	fmt.Println("\n=== Distinct hari values in mata_kuliah ===")
	rows2, err := db.Query(`SELECT DISTINCT hari, LENGTH(hari::text), hari::text = 'Selasa' as matches FROM mata_kuliah WHERE deleted_at IS NULL ORDER BY hari`)
	if err != nil {
		log.Fatalf("Failed to query hari values: %v", err)
	}
	defer rows2.Close()
	for rows2.Next() {
		var hari string
		var length int
		var matches bool
		rows2.Scan(&hari, &length, &matches)
		fmt.Printf("  hari='%s' len=%d matches_Selasa=%v hex=", hari, length, matches)
		for _, b := range []byte(hari) {
			fmt.Printf("%02x ", b)
		}
		fmt.Println()
	}

	fmt.Println("\n=== Courses with hari like 'Selasa' ===")
	rows3, err := db.Query(`
		SELECT mk.kode, mk.nama, mk.hari, mk.hari::text
		FROM mata_kuliah mk
		WHERE mk.deleted_at IS NULL
		  AND TRIM(LOWER(mk.hari::text)) = TRIM(LOWER('Selasa'))
	`)
	if err != nil {
		log.Fatalf("Failed to query Selasa courses: %v", err)
	}
	defer rows3.Close()
	count := 0
	for rows3.Next() {
		var kode, nama, hari, hariText string
		rows3.Scan(&kode, &nama, &hari, &hariText)
		fmt.Printf("  %s: %s (hari=%s, text=%s)\n", kode, nama, hari, hariText)
		count++
	}
	fmt.Printf("  Total Selasa courses: %d\n", count)

	fmt.Println("\n=== Test GetMahasiswaCoursesByDay query (mahasiswa_id=1, hari=Selasa) ===")
	mahasiswaIDStr := "1"
	hari := "Selasa"
	rows4, err := db.Query(`
		SELECT DISTINCT
			mk.kode,
			mk.nama,
			d.name as dosen,
			mk.sks,
			mk.hari,
			mk.jam_mulai,
			mk.jam_selesai,
			COALESCE(a.status, 'belum_absen') as status_absen,
			COALESCE(TO_CHAR(a.created_at, 'HH24:MI'), '') as waktu_absen,
			COALESCE(a.pertemuan_ke, 0) as pertemuan_ke,
			COALESCE(asess.session_code, '') as session_code,
			(
				SELECT COUNT(DISTINCT mmk2.mahasiswa_id)
				FROM mahasiswa_mata_kuliah mmk2
				WHERE mmk2.mata_kuliah_kode = mk.kode
			) as total_mahasiswa
		FROM mata_kuliah mk
		JOIN dosen d ON mk.dosen_id = d.id
		JOIN mahasiswa_mata_kuliah mmk ON mk.kode = mmk.mata_kuliah_kode
		LEFT JOIN (
			SELECT DISTINCT a.student_id::text as student_id, asess.course_id, a.status, a.created_at, a.pertemuan_ke
			FROM attendance a
			JOIN attendance_sessions asess ON a.session_id::text = asess.id::text
			WHERE (a.created_at)::date = CURRENT_DATE AND a.student_id::text = $1::text
		) a ON mk.kode = a.course_id AND mmk.mahasiswa_id::text = a.student_id
		LEFT JOIN LATERAL (
			SELECT session_code, pertemuan_ke
			FROM attendance_sessions
			WHERE course_id = mk.kode
				AND status = 'active'
				AND expires_at > NOW()
				AND (created_at)::date = CURRENT_DATE
			ORDER BY created_at DESC
			LIMIT 1
		) asess ON TRUE
		WHERE mmk.mahasiswa_id::text = $1::text
			AND TRIM(LOWER(mk.hari::text)) = TRIM(LOWER($2::text))
			AND mk.deleted_at IS NULL
		ORDER BY mk.jam_mulai
	`, mahasiswaIDStr, hari)
	if err != nil {
		fmt.Printf("  QUERY FAILED: %v\n", err)
	} else {
		defer rows4.Close()
		qcount := 0
		for rows4.Next() {
			var kode, nama, dosen, courseHari, jamMulai, jamSelesai, statusAbsen, waktuAbsen, sessionCode string
			var sks, pertemuanKe, totalMhs int
			rows4.Scan(&kode, &nama, &dosen, &sks, &courseHari, &jamMulai, &jamSelesai,
				&statusAbsen, &waktuAbsen, &pertemuanKe, &sessionCode, &totalMhs)
			fmt.Printf("  %s: %s (hari=%s, dosen=%s)\n", kode, nama, courseHari, dosen)
			qcount++
		}
		fmt.Printf("  Total results: %d\n", qcount)
	}

	// Also check what mahasiswa exist
	fmt.Println("\n=== All mahasiswa ===")
	rows5, err := db.Query(`SELECT id, name, nim FROM mahasiswa LIMIT 10`)
	if err != nil {
		fmt.Printf("  Failed: %v\n", err)
	} else {
		defer rows5.Close()
		for rows5.Next() {
			var id int
			var name, nim string
			rows5.Scan(&id, &name, &nim)
			fmt.Printf("  id=%d name=%s nim=%s\n", id, name, nim)
		}
	}
}
