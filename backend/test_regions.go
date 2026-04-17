package main

import (
	"context"
	"fmt"
	"os"

	"github.com/jackc/pgx/v5"
)

func testRegions() {
	password := "StudentHub%402026DB%21"
	projectRef := "evycuwsqufckfvejqxng"
	
	regions := []string{
		"ap-southeast-1", // Singapore
		"ap-southeast-2", // Sydney
		"us-east-1",      // N. Virginia
		"us-west-1",      // N. California
		"us-west-2",      // Oregon
		"eu-central-1",   // Frankfurt
		"eu-west-1",      // Ireland
		"eu-west-2",      // London
		"eu-west-3",      // Paris
		"ap-northeast-1", // Tokyo
		"ap-northeast-2", // Seoul
		"sa-east-1",      // Sao Paulo
		"ca-central-1",   // Canada
		"ap-south-1",     // Mumbai
	}

	success := false
	for _, region := range regions {
		dsn := fmt.Sprintf("postgresql://postgres.%s:%s@aws-0-%s.pooler.supabase.com:6543/postgres", projectRef, password, region)
		fmt.Printf("Trying region: %s... ", region)
		conn, err := pgx.Connect(context.Background(), dsn)
		if err != nil {
			fmt.Printf("Error\n")
			continue
		}
		fmt.Printf("SUCCESS!\n\n")
		fmt.Printf("WORKING CONNECTION STRING:\n%s\n", dsn)
		conn.Close(context.Background())
		success = true
		break
	}
	
	if !success {
		fmt.Println("None of the pooler regions worked.")
		os.Exit(1)
	}
	os.Exit(0)
}
