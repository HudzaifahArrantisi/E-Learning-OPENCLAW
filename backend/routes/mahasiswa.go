package routes

import (
	"nf-student-hub-backend/controllers"
	"nf-student-hub-backend/middlewares"

	"github.com/gin-gonic/gin"
)

func MahasiswaRoutes(r *gin.RouterGroup) {
	mahasiswa := r.Group("/mahasiswa")
	mahasiswa.Use(middlewares.JWTMiddleware(), middlewares.RoleMiddleware("mahasiswa"))
	{
		mahasiswa.GET("/profile", controllers.GetMahasiswaProfile)
		mahasiswa.POST("/profile/verify-student", controllers.VerifyStudentForMahasiswaProfile)
		mahasiswa.PUT("/profile", controllers.UpdateMahasiswaProfile)
		mahasiswa.PUT("/profile/peminatan", controllers.UpdateMahasiswaPeminatan)
		mahasiswa.GET("/courses", controllers.GetMahasiswaCourses)
		mahasiswa.GET("/matkul/:course_id/pertemuan", controllers.GetPertemuanByMatkul)
		mahasiswa.GET("/matkul/:course_id/pertemuan/:pertemuan", controllers.GetPertemuanDetail)
		mahasiswa.POST("/absensi/scan", controllers.ScanAttendance)
		mahasiswa.GET("/ukt", controllers.GetUKTInvoices)
		mahasiswa.POST("/ukt/pay", controllers.CreateUKTPayment)
	}
}
