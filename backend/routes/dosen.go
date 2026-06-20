package routes

import (
	"nf-student-hub-backend/controllers"
	"nf-student-hub-backend/middlewares"

	"github.com/gin-gonic/gin"
)

func DosenRoutes(r *gin.RouterGroup) {
	dosen := r.Group("/dosen")
	dosen.Use(middlewares.JWTMiddleware(), middlewares.RoleMiddleware("dosen"))
	{
		dosen.POST("/absensi/create", controllers.CreateAttendanceSession)
		dosen.GET("/absensi/active", controllers.GetActiveSessions)
		dosen.GET("/absensi/summary", controllers.GetAttendanceByPertemuan)
		dosen.GET("/absensi/riwayat-pertemuan", controllers.GetRiwayatPertemuanDosen)
		dosen.POST("/absensi/refresh-token", controllers.RefreshSessionToken)
		dosen.POST("/absensi/update-status", controllers.UpdateAttendanceStatus)
		dosen.POST("/absensi/close", controllers.CloseAttendanceSession)
		dosen.GET("/absensi/qr/:token", controllers.GetQRCode)
		dosen.GET("/absensi/realtime/:session_id", controllers.GetRealtimeAttendance)
		dosen.GET("/absensi/:session_id", controllers.GetAttendanceSessionDetail)
		dosen.POST("/tugas", controllers.CreateTugas)
		dosen.GET("/tugas/:course_id/submissions", controllers.GetTugasSubmissions)
		dosen.POST("/tugas/:submission_id/grade", controllers.GradeSubmission)
		dosen.GET("/matkul/:course_id/pertemuan/:pertemuan", controllers.GetPertemuanDetail)
	}
}
