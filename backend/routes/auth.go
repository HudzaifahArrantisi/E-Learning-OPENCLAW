package routes

import (
	"nf-student-hub-backend/controllers"

	"github.com/gin-gonic/gin"
)

func AuthRoutes(r *gin.RouterGroup) {
	auth := r.Group("/auth")
	{
		auth.POST("/login", controllers.Login)
		auth.POST("/register/verify-student", controllers.VerifyStudentRegistration)
		auth.GET("/register/options", controllers.GetRegistrationOptions)
		auth.POST("/register", controllers.Register)
	}
}
