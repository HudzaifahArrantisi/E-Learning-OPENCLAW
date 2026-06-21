package routes

import (
	"nf-student-hub-backend/controllers"
	"nf-student-hub-backend/middlewares"

	"github.com/gin-gonic/gin"
)

func SetupAPIRoutes(r *gin.RouterGroup) {
	// Auth
	r.POST("/auth/login", controllers.Login)
	r.POST("/auth/register/verify-student", controllers.VerifyStudentRegistration)
	r.GET("/auth/register/options", controllers.GetRegistrationOptions)
	r.POST("/auth/register", controllers.Register)
	r.GET("/auth/verify", middlewares.JWTMiddleware(), controllers.Verify)

	// Mahasiswa
	r.GET("/mahasiswa/profile", middlewares.JWTMiddleware(), controllers.GetMahasiswaProfile)
	r.POST("/mahasiswa/profile", middlewares.JWTMiddleware(), controllers.UpdateMahasiswaProfile)
	r.POST("/mahasiswa/scan-attendance", middlewares.JWTMiddleware(), middlewares.RoleMiddleware("mahasiswa"), controllers.ScanAttendance)
	r.GET("/mahasiswa/ukt/in", middlewares.JWTMiddleware(), controllers.GetUKTInvoices)
	r.POST("/mahasiswa/payment", middlewares.JWTMiddleware(), controllers.CreateUKTPayment)

	// UKM
	r.GET("/ukm/posts", middlewares.JWTMiddleware(), controllers.GetUKMPosts)
	r.POST("/ukm/posts", middlewares.JWTMiddleware(), controllers.CreateUKMPost)

	// FEED & LIKE (INI YANG BARU!)
	r.GET("/feed", middlewares.JWTMiddleware(), controllers.GetFeed)            // ← tambah ini
	r.POST("/feed/:id/like", middlewares.JWTMiddleware(), controllers.LikePost) // ← tambah ini
}
