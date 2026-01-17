package main

import (
	// "net/http"
	"time"

	"github.com/gin-contrib/cors"
	"github.com/gin-gonic/gin"
)

func main() {
	InitDatabase()
	InitBroker()
	router := gin.Default()

	router.Use(cors.New(cors.Config{
		AllowAllOrigins:  true,
		AllowMethods:     []string{"GET", "POST", "PUT", "PATCH", "DELETE", "HEAD", "OPTIONS"},
		AllowHeaders:     []string{"Origin", "Content-Type", "Accept"},
		ExposeHeaders:    []string{"Content-Length"},
		AllowCredentials: true,
		MaxAge:           12 * time.Hour,
	}))

	router.GET("/", sayHello)
	router.POST("/run", handleRun)
	router.POST("/user/create", handleCreateUser)
	router.POST("/user/exists", handleUserExists)

	router.POST("/contest", handleCreateContest)
	router.PUT("/contest", handleUpdateContest)
	router.DELETE("/contest/:id", handleDeleteContest)
	router.GET("/contests", handleGetContests)
	router.GET("/contest/:id", handleGetContest)
	router.POST("/problem", handleCreateProblem)
	router.GET("/problem/:id", handleGetProblem)
	router.GET("/problems/practice", handleGetPracticeProblems)
	router.GET("/problems", handleGetAllProblems)
	router.GET("/users", handleGetAllUsers)
	router.PUT("/problem", handleUpdateProblem)
	router.DELETE("/problem/:id", handleDeleteProblem)

	router.POST("/contest/register", handleRegisterContest)
	router.GET("/contest/status", handleGetRegistrationStatus)
	router.GET("/contest/:id/registrations", handleGetContestRegistrations)
	router.GET("/leaderboard", handleGetLeaderboard)
	router.GET("/contest/:id/leaderboard", handleGetContestLeaderboard)
	router.GET("/contest/:id/leaderboard/stream", handleLeaderboardStream)
	router.GET("/problem/:id/leaderboard", handleGetProblemLeaderboard)

	router.Run(":8080")
}
