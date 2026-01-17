package main

import (
	"bytes"
	"encoding/json"
	"fmt"
	"os"
	"os/exec"
	"path/filepath"
	"strings"
)

// RunResult represents the result of a single test case execution from the Python harness
type RunResult struct {
	Status    string      `json:"status"` // "ok", "runtime_error", "system_error"
	Result    interface{} `json:"result"` // The return value from the user's function
	Error     string      `json:"error"`
	Time      float64     `json:"time"`
	Traceback string      `json:"traceback"`
}

// ExecuteFunctionRun orchestrates the Function-based execution pipeline
func ExecuteFunctionRun(username string, solutionCode string, signature ProblemSignature, testCases []map[string]interface{}) ([]RunResult, error) {
	// 1. Prepare Workspace
	runPath, err := makeRunDirectory(username)
	if err != nil {
		return nil, fmt.Errorf("workspace error: %v", err)
	}
	defer cleanRunDirectory(username) // Clean up after run

	// 2. Write User Code (solution.py)
	if err := createFileFromText(runPath, "solution.py", solutionCode); err != nil {
		return nil, fmt.Errorf("failed to write solution: %v", err)
	}

	// 3. Write Test Cases (testcases.json)
	tcJSON, err := json.Marshal(testCases)
	if err != nil {
		return nil, fmt.Errorf("failed to marshal test cases: %v", err)
	}
	if err := createFileFromText(runPath, "testcases.json", string(tcJSON)); err != nil {
		return nil, fmt.Errorf("failed to write test cases: %v", err)
	}

	// 4. Prepare Harness (runner.py)
	// We read the template and inject the target function name
	harnessTemplate, err := os.ReadFile(filepath.Join("runner", "harness.py"))
	if err != nil {
		return nil, fmt.Errorf("failed to read harness template: %v", err)
	}
	
harnessCode := strings.Replace(string(harnessTemplate), "{METHOD_NAME}", signature.FunctionName, 1)
	if err := createFileFromText(runPath, "runner.py", harnessCode); err != nil {
		return nil, fmt.Errorf("failed to write runner: %v", err)
	}

	// 5. Execute in Docker
	// We need the absolute path for the volume mount
	absWorkDir, err := filepath.Abs(runPath)
	if err != nil {
		return nil, fmt.Errorf("failed to get absolute path: %v", err)
	}

	cmd := exec.Command("docker", "run",
		"--rm",
		"--cpus=0.5",
		"--memory=128m",
		"-v", absWorkDir+":/code",
		"-w", "/code",
		"python:3.11",
		"python", "runner.py",
	) 

	var stdout, stderr bytes.Buffer
	cmd.Stdout = &stdout
	cmd.Stderr = &stderr

	if err := cmd.Run(); err != nil {
		return nil, fmt.Errorf("execution error: %v, stderr: %s", err, stderr.String())
	}

	// 6. Parse Results
	// The harness prints exactly one line of JSON at the end
	outputLines := strings.Split(strings.TrimSpace(stdout.String()), "\n")
	lastLine := outputLines[len(outputLines)-1]

	var results []RunResult
	if err := json.Unmarshal([]byte(lastLine), &results); err != nil {
		return nil, fmt.Errorf("internal error: failed to parse runner output: %s", lastLine)
	}

	return results, nil
}
