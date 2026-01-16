package main

import (
	"time"
)

type User struct {
	Username string `gorm:"primaryKey"`
	Email    string
	Password string
}

type Contest struct {
	ID          uint      `gorm:"primaryKey" json:"id"`
	Title       string    `json:"title"`
	Description string    `json:"description"`
	StartTime   time.Time `json:"start_time"`
	EndTime     time.Time `json:"end_time"`
	Problems    []Problem `json:"problems"`
	RegistrationConfig string `json:"registration_config"` // e.g. "Team Name, University"
}

type Registration struct {
	ID        uint      `gorm:"primaryKey" json:"id"`
	UserID    string    `json:"user_id"`
	ContestID uint      `json:"contest_id"`
	RegisteredAt time.Time `json:"registered_at"`
	ExtraInfo    string    `json:"extra_info"` // JSON or text provided by user
}

type Problem struct {
	ID          uint   `gorm:"primaryKey" json:"id"`
	ContestID   uint   `json:"contest_id"`
	Title       string `json:"title"`
	Description string `json:"description"`
	Input       string `json:"input"`    // Test case input
	Output      string `json:"output"`   // Expected output
	Template    string `json:"template"` // Starter code
	RunnerCode  string `json:"runner_code"` // Hidden code to feed input
	Difficulty  string `json:"difficulty"`
	Points      int    `json:"points"`
}

type Submission struct {
	ID        uint      `gorm:"primaryKey" json:"id"`
	UserID    string    `json:"user_id"`
	ProblemID uint      `json:"problem_id"`
	Status    string    `json:"status"`
	CreatedAt time.Time `json:"created_at"`
}
