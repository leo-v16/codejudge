package main

import (
	"bytes"
	"fmt"
	"os"
		"os/exec"
		"path/filepath"
		"strconv"
		"strings"
	)
	
	const WORKSPACE = "workspace"
	const RUNNER = "runner"
	
	func makeRunDirectory(username string) (string, error) {
		runPath := filepath.Join(WORKSPACE, username)
		if err := os.MkdirAll(runPath, 0755); err != nil {
			return "", err
		}
		return runPath, nil
	}
	
	func createFileFromText(dest, filename, text string) error {
		file, err := os.Create(filepath.Join(dest, filename))
		if err != nil {
			return  err
		}
		defer file.Close()
	
		_, err = file.WriteString(text)
		return err
	}
	
	func hydrateRunDirectory(username, problemIDStr, solution string) error {
		path, err := makeRunDirectory(username)
		if err != nil {
			return err
		}
	
		// Fetch problem from DB
		problemID, err := strconv.Atoi(problemIDStr)
		if err != nil {
			return fmt.Errorf("invalid problem id: %v", err)
		}
	
			problem, err := GetProblemByID(uint(problemID))
	
			if err != nil {
	
				return fmt.Errorf("problem not found: %v", err)
	
			}
	
		
	
			fullSolution := solution
	
			if problem.RunnerCode != "" {
	
				fullSolution = solution + "\n\n" + problem.RunnerCode
	
			}
	
		
	
			createFileFromText(path, "solution.py", fullSolution)
	
			createFileFromText(path, "input.txt", problem.Input)
	
			createFileFromText(path, "expected.txt", problem.Output)
	
		
		createFileFromText(path, "output.txt", "")
	
		return nil
	}
	
	func runInContainer(username string) (string, error) {
		workDir, err := filepath.Abs(filepath.Join(WORKSPACE, username))
		if err != nil {
			return "", err
		}
		cmd := exec.Command("docker", "run",
			"--rm", 
			"--cpus=0.5",
			"--memory=128m",
			"-v", workDir+":/code",
			"-w", "/code",
			"python:3.11",
			"sh", "-c", "python solution.py < input.txt > output.txt",
		)
		cmd.Dir = workDir
	
		var stderr bytes.Buffer
		var out bytes.Buffer
	
		cmd.Stderr = &stderr
		cmd.Stdout = &out
	
		if err := cmd.Run(); err != nil {
			return stderr.String(), err
		}
		return out.String(), nil
	}
	
	func cleanRunDirectory(username string) error {
		targetPath := filepath.Join(WORKSPACE, username)
		return os.RemoveAll(targetPath)
	}
	
	func getOutputText(username string) (string, error) {
		outputPath := filepath.Join(WORKSPACE, username, "output.txt")
		output, err := os.ReadFile(outputPath)
		if err != nil {
			return "", err
		}
		return string(output), nil
	}
	
	func checkOutput(username string) (bool, string, string, string, error) {
		outputPath := filepath.Join(WORKSPACE, username, "output.txt")
		expectedPath := filepath.Join(WORKSPACE, username, "expected.txt")
		inputPath := filepath.Join(WORKSPACE, username, "input.txt")
	
		output, err := os.ReadFile(outputPath)
		if err != nil {
			return false, "", "", "", err
		}
		expected, err := os.ReadFile(expectedPath)
		if err != nil {
			return false, "", "", "", err
		}
		input, err := os.ReadFile(inputPath)
		if err != nil {
			return false, "", "", "", err
		}
	
		match := strings.TrimSpace(string(output)) == strings.TrimSpace(string(expected))
		return match, string(expected), string(output), string(input), nil
	}