# Code Judge Project

## Overview
Code Judge is a full-stack web application designed to run and evaluate user-submitted code. It features a Next.js frontend for the user interface and a Go (Gin) backend that manages code execution within isolated Docker containers.

## Tech Stack

### Frontend
*   **Framework:** Next.js 16 (App Router)
*   **Language:** TypeScript
*   **Styling:** Tailwind CSS 4
*   **State/UI:** React 19

### Backend
*   **Language:** Go 1.25.1
*   **Framework:** Gin
*   **Execution Environment:** Docker (Python 3.11 image)

## Architecture

1.  **User Submission:** The frontend sends a JSON payload (`username`, `problem`, `solution`) to the backend `POST /run` endpoint.
2.  **Workspace Preparation:**
    *   The backend creates a unique directory for the user in `backend/workspace/<username>`.
    *   It populates this directory with:
        *   `solution.py`: The user's submitted code.
        *   `input.txt`: Input data fetched from `backend/runner/testcase-<problem>-input.txt`.
        *   `expected.txt`: Expected output fetched from `backend/runner/testcase-<problem>-output.txt`.
3.  **Code Execution:**
    *   The backend spins up a temporary Docker container using the `python:3.11` image.
    *   The user's workspace directory is mounted to `/code` inside the container.
    *   Resource limits are applied: 0.5 CPUs, 128MB memory.
    *   The command executed is: `python solution.py < input.txt > output.txt`.
4.  **Result Retrieval:**
    *   The backend reads the generated `output.txt` from the workspace.
    *   The result is returned to the frontend.

## Directory Structure

*   `backend/`: Go backend source code.
    *   `main.go`: Server entry point and router setup.
    *   `routes.go`: Request handlers (`handleRun`).
    *   `tools.go`: Logic for workspace management and Docker execution.
    *   `runner/`: Stores test case files (e.g., `testcase-1-input.txt`).
    *   `workspace/`: Transient directories created for each user execution.
*   `frontend/`: Next.js frontend application.

## Development Setup

### Prerequisites
*   Go 1.25+
*   Node.js & npm/yarn/pnpm
*   Docker (Must be running for code execution to work)

### Running the Backend
1.  Navigate to the `backend` directory:
    ```bash
    cd backend
    ```
2.  Run the server:
    ```bash
    go run .
    ```
    The server listens on `http://localhost:8080`.

### Running the Frontend
1.  Navigate to the `frontend` directory:
    ```bash
    cd frontend
    ```
2.  Install dependencies:
    ```bash
    npm install
    ```
3.  Start the development server:
    ```bash
    npm run dev
    ```
    The app is available at `http://localhost:3000`.

## Key Files & Implementation Details

*   **`backend/tools.go`**: Contains the critical `runInContainer` function which defines the Docker command. It mounts the local workspace directory to the container to persist I/O operations.
*   **`backend/runner/`**: This directory acts as the "database" for test cases. Currently, it supports file-based test cases named `testcase-<id>-input.txt`.
*   **`backend/routes.go`**: Handlers parse the JSON request. Note that the system currently assumes the solution is a Python script (`solution.py`) that reads from Stdin and writes to Stdout.

## Notes
*   **Security:** The system uses Docker for isolation, but ensure the Docker socket/daemon is secured in production environments.
*   **Concurrency:** Workspace directories are namespaced by `username`. Ensure unique usernames are used to avoid race conditions if multiple requests come from the "same" user simultaneously, or consider using UUIDs for request IDs.
