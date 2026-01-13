package main

import (
	"bytes"
	"os"
	"os/exec"
	"path/filepath"
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

func hydrateRunDirectory(username, problemNumber, solution string) error {
	path, err := makeRunDirectory(username)
	if err != nil {
		return err
	}
	inputText, err := os.ReadFile(filepath.Join(RUNNER, "testcase-"+problemNumber+"-input.txt"))
	if err != nil {
		return err
	}
	expectedText, err := os.ReadFile(filepath.Join(RUNNER, "testcase-"+problemNumber+"-output.txt"))
	if err != nil {
		return err
	}
	createFileFromText(path, "solution.py", solution)
	createFileFromText(path, "input.txt", string(inputText))
	createFileFromText(path, "expected.txt", string(expectedText))
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