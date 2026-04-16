package main

import (
	"context"
	"fmt"
	"os"
	"strings"

	"github.com/jackc/pgx/v5"
)

func main() {
	password := "StudentHub%402026DB%21"
	projectRef := "evycuwsqufckfvejqxng"
	
	dsns := []string{
		fmt.Sprintf("postgresql://postgres:%s@db.%s.supabase.co:5432/postgres", password, projectRef), // direct
		fmt.Sprintf("postgresql://postgres.%s:%s@aws-0-ap-southeast-1.pooler.supabase.com:6543/postgres", projectRef, password), // pooler tx
		fmt.Sprintf("postgresql://postgres.%s:%s@aws-0-ap-southeast-1.pooler.supabase.com:5432/postgres", projectRef, password), // pooler session
	}

	success := false
	for _, dsn := range dsns {
		fmt.Printf("\nTrying: %s\n", strings.ReplaceAll(dsn, password, "HIDDEN_PASSWORD"))
		conn, err := pgx.Connect(context.Background(), dsn)
		if err != nil {
			fmt.Printf("  Error: %v\n", err)
			continue
		}
		fmt.Printf("  Success! Successfully connected.\n")
		conn.Close(context.Background())
		success = true
		break // Found working connection
	}
	
	if !success {
		fmt.Println("None of the connections worked.")
		os.Exit(1)
	}
	os.Exit(0)
}
