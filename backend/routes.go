package main

import (
	"net/http"
	"strconv"
	"time"

	"github.com/gin-gonic/gin"
)

// usermanagement, read and write to sqllite using gorm

type Run struct {
	Username string `json:"username"`
	Problem  string `json:"problem"`
	Solution string `json:"solution"`
}

func sayHello(c *gin.Context) {
	name := c.DefaultQuery("name", "not-specified")
	c.JSON(http.StatusOK, gin.H{
		"message": "Hello " + name + "!",
	})
}

func handleRun(c *gin.Context) {
	var run Run
	if err := c.ShouldBindJSON(&run); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
	}
	// problem is now the ID string
	err := hydrateRunDirectory(run.Username, run.Problem, run.Solution)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}
	
	message, err := runInContainer(run.Username)
	if err != nil {
		// Include the stderr (message) so user can see the Python traceback
		c.JSON(http.StatusInternalServerError, gin.H{
			"error": err.Error(),
			"output": message,
		})
		return
	}

	output, err := getOutputText(run.Username)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	passed, expected, actual, input, err := checkOutput(run.Username)
	status := "Failed"
	if err == nil && passed {
		status = "Passed"
		// Record submission
		problemID, _ := strconv.Atoi(run.Problem) // run.Problem is ID string
		CreateSubmission(Submission{
			UserID:    run.Username,
			ProblemID: uint(problemID),
			Status:    "Passed",
			CreatedAt: time.Now(),
		})
	}

	c.JSON(http.StatusAccepted, gin.H{
		"username": run.Username,
		"message": message,
		"output": output,
		"status": status,
		"expected_output": expected,
		"actual_output": actual,
		"test_case_input": input,
	})
}

func handleGetLeaderboard(c *gin.Context) {
	leaderboard, err := GetLeaderboard()
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusOK, leaderboard)
}

func handleGetContestLeaderboard(c *gin.Context) {
	contestIDStr := c.Param("id")
	contestID, err := strconv.Atoi(contestIDStr)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid contest ID"})
		return
	}

	leaderboard, err := GetContestLeaderboard(uint(contestID))
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusOK, leaderboard)
}

func handleGetProblemLeaderboard(c *gin.Context) {
	problemIDStr := c.Param("id")
	problemID, err := strconv.Atoi(problemIDStr)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid problem ID"})
		return
	}

	leaderboard, err := GetProblemLeaderboard(uint(problemID))
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusOK, leaderboard)
}

func handleCreateUser(c *gin.Context) {
	var user User
	if err := c.ShouldBindJSON(&user); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}
	if err := CreateUser(user); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusCreated, gin.H{"message": "User created successfully"})
}

func handleUserExists(c *gin.Context) {
	var body struct {
		Username string `json:"username"`
		Password string `json:"password"`
	}
	if err := c.ShouldBindJSON(&body); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	exists, err := VerifyUser(body.Username, body.Password)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	println("Verifying user:", body.Username, "Password provided:", body.Password, "Result:", exists)

	c.JSON(http.StatusOK, gin.H{"exists": exists})
}

func handleCreateContest(c *gin.Context) {
	var contest Contest
	if err := c.ShouldBindJSON(&contest); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}
	if err := CreateContest(contest); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusCreated, gin.H{"message": "Contest created successfully", "id": contest.ID})
}

func handleUpdateContest(c *gin.Context) {
	var contest Contest
	if err := c.ShouldBindJSON(&contest); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}
	if err := UpdateContest(contest); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusOK, gin.H{"message": "Contest updated successfully"})
}

func handleDeleteContest(c *gin.Context) {
	idStr := c.Param("id")
	id, err := strconv.Atoi(idStr)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid contest ID"})
		return
	}
	if err := DeleteContest(uint(id)); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusOK, gin.H{"message": "Contest deleted successfully"})
}

func handleGetContests(c *gin.Context) {
	contests, err := GetContests()
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	
	var result []map[string]interface{}
	for _, contest := range contests {
		count, _ := GetContestRegistrationsCount(contest.ID)
		result = append(result, map[string]interface{}{
			"id":          contest.ID,
			"title":       contest.Title,
			"description": contest.Description,
			"start_time":  contest.StartTime,
			"end_time":    contest.EndTime,
			"problems":    contest.Problems,
			"participants": count,
		})
	}

	c.JSON(http.StatusOK, result)
}

func handleCreateProblem(c *gin.Context) {
	var problem Problem
	if err := c.ShouldBindJSON(&problem); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}
	if err := CreateProblem(problem); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusCreated, gin.H{"message": "Problem created successfully", "id": problem.ID})
}

func handleGetContest(c *gin.Context) {
	idStr := c.Param("id")
	id, err := strconv.Atoi(idStr)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid contest ID"})
		return
	}
	contest, err := GetContestByID(uint(id))
	if err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Contest not found"})
		return
	}
	
	count, _ := GetContestRegistrationsCount(contest.ID)
	
	c.JSON(http.StatusOK, gin.H{
		"id":          contest.ID,
		"title":       contest.Title,
		"description": contest.Description,
		"start_time":  contest.StartTime,
		"end_time":    contest.EndTime,
		"problems":    contest.Problems, // Gorm preloads this
		"participants": count,
		"registration_config": contest.RegistrationConfig,
	})
}

func handleGetProblem(c *gin.Context) {
	idStr := c.Param("id")
	id, err := strconv.Atoi(idStr)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid problem ID"})
		return
	}
	problem, err := GetProblemByID(uint(id))
	if err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Problem not found"})
		return
	}
	
	// Hide hidden runner code from public API
	problem.RunnerCode = ""
	
	c.JSON(http.StatusOK, problem)
}

func handleGetPracticeProblems(c *gin.Context) {
	problems, err := GetPracticeProblems()
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusOK, problems)
}

func handleGetAllProblems(c *gin.Context) {
	problems, err := GetAllProblems()
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusOK, problems)
}

func handleUpdateProblem(c *gin.Context) {
	var problem Problem
	if err := c.ShouldBindJSON(&problem); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}
	if err := UpdateProblem(problem); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusOK, gin.H{"message": "Problem updated successfully"})
}

func handleDeleteProblem(c *gin.Context) {
	idStr := c.Param("id")
	id, err := strconv.Atoi(idStr)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid problem ID"})
		return
	}
	if err := DeleteProblem(uint(id)); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusOK, gin.H{"message": "Problem deleted successfully"})
}

func handleRegisterContest(c *gin.Context) {
	var body struct {
		UserID    string `json:"user_id"`
		ContestID uint   `json:"contest_id"`
		ExtraInfo string `json:"extra_info"`
	}
	if err := c.ShouldBindJSON(&body); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}
	
	// Check if already registered
	registered, err := IsUserRegistered(body.UserID, body.ContestID)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	if registered {
		c.JSON(http.StatusConflict, gin.H{"message": "Already registered"})
		return
	}

	if err := RegisterForContest(body.UserID, body.ContestID, body.ExtraInfo); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusOK, gin.H{"message": "Registered successfully"})
}

func handleGetRegistrationStatus(c *gin.Context) {
	userID := c.Query("user_id")
	contestIDStr := c.Query("contest_id")
	contestID, _ := strconv.Atoi(contestIDStr)

	registered, err := IsUserRegistered(userID, uint(contestID))
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	
	c.JSON(http.StatusOK, gin.H{"registered": registered})
}

func handleGetContestRegistrations(c *gin.Context) {
	contestIDStr := c.Param("id")
	contestID, err := strconv.Atoi(contestIDStr)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid contest ID"})
		return
	}

	registrations, err := GetContestRegistrations(uint(contestID))
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusOK, registrations)
}
