package main

import (
	"log"
	"math/rand"
	"os"
	"strings"
	"time"

	"nf-student-hub-backend/config"
	"nf-student-hub-backend/routes"

	"github.com/fatih/color"
	"github.com/gin-contrib/cors"
	"github.com/gin-gonic/gin"
	"github.com/joho/godotenv"
	"github.com/mbndr/figlet4go"
)

func main() {
	godotenv.Load()

	config.InitDB()

	// Initialize random seed
	rand.Seed(time.Now().UnixNano())

	// buat folde
	os.MkdirAll("uploads/posts", 0755)
	os.MkdirAll("uploads/materi", 0755)
	os.MkdirAll("uploads/tugas", 0755)
	os.MkdirAll("uploads/tugasdosen", 0755)
	os.MkdirAll("uploads/profile", 0755)

	r := gin.Default()

	// konfigurasi cros
	r.Use(cors.New(cors.Config{
		AllowOriginFunc: func(origin string) bool {
			return true
		},
		AllowMethods:     []string{"GET", "POST", "PUT", "DELETE", "OPTIONS"},
		AllowHeaders:     []string{"Origin", "Content-Type", "Authorization", "Accept", "X-Requested-With"},
		AllowCredentials: true,
	}))

	r.Static("/uploads", "./uploads")

	routes.SetupRoutes(r, config.GormDB)

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
			if line != "" { // Skip empty lines
				colorFunc := colors[i%len(colors)]
				colorFunc("%s\n", line)
			}
		}
	}
	log.Println("Starting NF Student HUB Server...")
	log.Println("Materi & Tugas System: Ready")
	log.Println("Upload directories: Created")

	log.Printf("Selamat datang! Ini nama '%s' dalam bentuk besar.", nama)

	log.Println("Server jalan → http://localhost:8080")
	log.Println("Materi: http://localhost:8080/uploads/materi/...")
	log.Println("Tugas Mahasiswa: http://localhost:8080/uploads/tugas/...")
	log.Println("Tugas Dosen: http://localhost:8080/uploads/tugasdosen/...")
	log.Println("Profile: http://localhost:8080/uploads/profile/...")

	r.Run("0.0.0.0:8080")
}
