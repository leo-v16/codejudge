package main

import (
	"encoding/json"
	"io"
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
		return
	}

	problemID, err := strconv.Atoi(run.Problem)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid problem ID"})
		return
	}

	problem, err := GetProblemByID(uint(problemID))
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Problem not found"})
		return
	}

	// === NEW: Function-Based Execution ===
	if problem.SignatureJSON != "" {
		var signature ProblemSignature
		if err := json.Unmarshal([]byte(problem.SignatureJSON), &signature); err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": "Invalid problem signature"})
			return
		}
		
		var testCases []map[string]interface{}
		if err := json.Unmarshal([]byte(problem.TestCasesJSON), &testCases); err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": "Invalid test cases"})
			return
		}

		results, err := ExecuteFunctionRun(run.Username, run.Solution, signature, testCases)
		if err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
			return
		}

		// Validation & Scoring
		status := "Passed"
		var firstFailedResult *RunResult
		var firstFailedInput interface{}
		var firstFailedExpected interface{}
		failedIndex := -1
		passedCount := 0
		totalCount := len(testCases)

		for i, res := range results {
			expected := testCases[i]["output"]
			
			resBytes, _ := json.Marshal(res.Result)
			expBytes, _ := json.Marshal(expected)
			
			passed := res.Status == "ok" && string(resBytes) == string(expBytes)

			if passed {
				passedCount++
			} else if firstFailedResult == nil {
				status = "Failed"
				firstFailedResult = &results[i]
				firstFailedInput = testCases[i]["input"]
				firstFailedExpected = expected
				failedIndex = i + 1 // 1-based index
			}
		}

		if status == "Passed" {
			CreateSubmission(Submission{
				UserID:    run.Username,
				ProblemID: uint(problemID),
				Status:    "Passed",
				CreatedAt: time.Now(),
			})
			if problem.ContestID != 0 {
				leaderboard, _ := GetContestLeaderboard(problem.ContestID)
				Broker.Broadcast(problem.ContestID, leaderboard)
			}
		}

		// Format response
		var output, expectedStr, inputStr string
		if firstFailedResult != nil {
			outputBytes, _ := json.Marshal(firstFailedResult.Result)
			if firstFailedResult.Status != "ok" {
				output = firstFailedResult.Error // Show error if runtime error
			} else {
				output = string(outputBytes)
			}
			
			expBytes, _ := json.Marshal(firstFailedExpected)
			expectedStr = string(expBytes)
			
			inBytes, _ := json.Marshal(firstFailedInput)
			inputStr = string(inBytes)
		}

		c.JSON(http.StatusAccepted, gin.H{
			"username":        run.Username,
			"message":         "", 
			"output":          output,
			"status":          status,
			"expected_output": expectedStr,
			"actual_output":   output,
			"test_case_input": inputStr,
			"passed_count":    passedCount,
			"total_count":     totalCount,
			"failed_index":    failedIndex,
		})
		return
	}

	// === LEGACY: IO-Based Execution ===
	// problem is now the ID string
	err = hydrateRunDirectory(run.Username, run.Problem, run.Solution)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	message, err := runInContainer(run.Username)
	if err != nil {
		// Include the stderr (message) so user can see the Python traceback
		c.JSON(http.StatusInternalServerError, gin.H{
			"error":  err.Error(),
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
		// problemID, _ := strconv.Atoi(run.Problem) // run.Problem is ID string
		CreateSubmission(Submission{
			UserID:    run.Username,
			ProblemID: uint(problemID),
			Status:    "Passed",
			CreatedAt: time.Now(),
		})

		// Broadcast Leaderboard Update
		problem, _ := GetProblemByID(uint(problemID))
		if problem.ContestID != 0 {
			leaderboard, _ := GetContestLeaderboard(problem.ContestID)
			Broker.Broadcast(problem.ContestID, leaderboard)
		}
	}

	c.JSON(http.StatusAccepted, gin.H{
		"username":        run.Username,
		"message":         message,
		"output":          output,
		"status":          status,
		"expected_output": expected,
		"actual_output":   actual,
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

func handleLeaderboardStream(c *gin.Context) {
	contestIDStr := c.Param("id")
	contestID, err := strconv.Atoi(contestIDStr)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid contest ID"})
		return
	}

	c.Header("Content-Type", "text/event-stream")
	c.Header("Cache-Control", "no-cache")
	c.Header("Connection", "keep-alive")
	c.Header("Transfer-Encoding", "chunked")

	clientChan := Broker.Subscribe(uint(contestID))
	defer Broker.Unsubscribe(uint(contestID), clientChan)

	c.Stream(func(w io.Writer) bool {
		select {
		case msg, ok := <-clientChan:
			if ok {
				c.SSEvent("message", msg)
				return true
			}
			return false
		case <-c.Request.Context().Done():
			return false
		}
	})
}

func handleGetProblemLeaderboard(c *gin.Context) {
	problemIDStr := c.Param("id")
	problemID, err := strconv.Atoi(problemIDStr)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid problem ID"})
		return
	}

	problem, err := GetProblemByID(uint(problemID))
	if err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Problem not found"})
		return
	}

	if problem.ContestID != 0 {
		// Return the contest leaderboard
		leaderboard, err := GetContestLeaderboard(problem.ContestID)
		if err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
			return
		}
		c.JSON(http.StatusOK, leaderboard)
	} else {
		// Fallback for practice problems (global leaderboard or specific)
		// For now, let's keep the old behavior for practice problems or return empty
		leaderboard, err := GetProblemLeaderboard(uint(problemID))
		if err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
			return
		}
		c.JSON(http.StatusOK, leaderboard)
	}
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
			"id":           contest.ID,
			"title":        contest.Title,
			"description":  contest.Description,
			"start_time":   contest.StartTime,
			"end_time":     contest.EndTime,
			"problems":     contest.Problems,
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
		"id":                  contest.ID,
		"title":               contest.Title,
		"description":         contest.Description,
		"start_time":          contest.StartTime,
		"end_time":            contest.EndTime,
		"problems":            contest.Problems, // Gorm preloads this
		"participants":        count,
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
