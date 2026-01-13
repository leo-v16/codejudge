package main

import (
	"net/http"

	"github.com/gin-gonic/gin"
)

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
	hydrateRunDirectory(run.Username, run.Problem, run.Solution)
	message, err := runInContainer(run.Username)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	output, err := getOutputText(run.Username)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusAccepted, gin.H{
		"username": run.Username,
		"message": message,
		"output": output,
	})
}