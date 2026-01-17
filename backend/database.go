package main

import (
	"sort"
	"time"

	"gorm.io/driver/sqlite"
	"gorm.io/gorm"

	_ "modernc.org/sqlite"
)

var DB *gorm.DB

func InitDatabase() {
	database, err := gorm.Open(
		&sqlite.Dialector{
			DriverName: "sqlite",
			DSN:        "users.db",
		},
		&gorm.Config{},
	)
	if err != nil {
		panic("error: " + err.Error())
	}
	database.AutoMigrate(&User{}, &Contest{}, &Problem{}, &Registration{}, &Submission{})
	DB = database
}

func CreateUser(user User) error {
	result := DB.Create(&user)
	return result.Error
}

func GetAllUsers() ([]User, error) {
	var users []User
	err := DB.Find(&users).Error
	return users, err
}

func UserExists(username string) (bool, error) {
	var user User
	result := DB.Where("username = ?", username).First(&user)
	if result.Error != nil {
		if result.Error == gorm.ErrRecordNotFound {
			return false, nil
		}
		return false, result.Error
	}
	return true, nil
}

func VerifyUser(username, password string) (bool, error) {
	var user User
	result := DB.Where("username = ? AND password = ?", username, password).First(&user)
	if result.Error != nil {
		if result.Error == gorm.ErrRecordNotFound {
			return false, nil
		}
		return false, result.Error
	}
	return true, nil
}

func CreateContest(contest Contest) error {
	return DB.Create(&contest).Error
}

func UpdateContest(contest Contest) error {
	return DB.Save(&contest).Error
}

func DeleteContest(id uint) error {
	// Unlink problems first (make them practice problems)
	if err := DB.Model(&Problem{}).Where("contest_id = ?", id).Update("contest_id", 0).Error; err != nil {
		return err
	}
	return DB.Delete(&Contest{}, id).Error
}

func GetContests() ([]Contest, error) {
	var contests []Contest
	err := DB.Find(&contests).Error
	return contests, err
}

func CreateProblem(problem Problem) error {
	return DB.Create(&problem).Error
}

func GetContestByID(id uint) (Contest, error) {
	var contest Contest
	err := DB.Preload("Problems").First(&contest, id).Error
	return contest, err
}

func GetProblemByID(id uint) (Problem, error) {
	var problem Problem
	err := DB.First(&problem, id).Error
	return problem, err
}

func GetPracticeProblems() ([]Problem, error) {
	var problems []Problem
	err := DB.Where("contest_id = ?", 0).Find(&problems).Error
	return problems, err
}

func GetAllProblems() ([]Problem, error) {
	var problems []Problem
	err := DB.Find(&problems).Error
	return problems, err
}

func UpdateProblem(problem Problem) error {
	return DB.Save(&problem).Error
}

func DeleteProblem(id uint) error {
	return DB.Delete(&Problem{}, id).Error
}

func RegisterForContest(userID string, contestID uint, extraInfo string) error {
	registration := Registration{
		UserID:       userID,
		ContestID:    contestID,
		RegisteredAt: time.Now(),
		ExtraInfo:    extraInfo,
	}
	return DB.Create(&registration).Error
}

func IsUserRegistered(userID string, contestID uint) (bool, error) {
	var registration Registration
	err := DB.Where("user_id = ? AND contest_id = ?", userID, contestID).First(&registration).Error
	if err != nil {
		if err == gorm.ErrRecordNotFound {
			return false, nil
		}
		return false, err
	}
	return true, nil
}

func GetContestRegistrationsCount(contestID uint) (int64, error) {
	var count int64
	err := DB.Model(&Registration{}).Where("contest_id = ?", contestID).Count(&count).Error
	return count, err
}

func GetContestRegistrations(contestID uint) ([]Registration, error) {
	var registrations []Registration
	err := DB.Where("contest_id = ?", contestID).Find(&registrations).Error
	return registrations, err
}

func GetUserRegistrations(userID string) ([]Registration, error) {
	var registrations []Registration
	err := DB.Where("user_id = ?", userID).Find(&registrations).Error
	return registrations, err
}

func CreateSubmission(submission Submission) error {
	return DB.Create(&submission).Error
}

type LeaderboardEntry struct {
	UserID string `json:"username"`
	Score  int    `json:"score"`
}

func GetLeaderboard() ([]LeaderboardEntry, error) {
	var entries []LeaderboardEntry
	// Select user_id, sum points of unique passed problems
	err := DB.Table("submissions").
		Select("submissions.user_id, sum(problems.points) as score").
		Joins("join problems on problems.id = submissions.problem_id").
		Where("submissions.status = ?", "Passed").
		Group("submissions.user_id").
		Order("score desc").
		Scan(&entries).Error
	return entries, err
}

func GetContestLeaderboard(contestID uint) ([]LeaderboardEntry, error) {
	// 1. Get all registered users
	var registrations []Registration
	if err := DB.Where("contest_id = ?", contestID).Find(&registrations).Error; err != nil {
		return nil, err
	}
	println("DEBUG: Found registrations:", len(registrations), "for contest:", contestID)

	// Map to track scores. Initialize with 0.
	scores := make(map[string]int)
	for _, reg := range registrations {
		scores[reg.UserID] = 0
	}

	// 2. Get points for solved problems
	type UserProblemPoints struct {
		UserID string
		Points int
	}
	var solved []UserProblemPoints

	// Group by user and problem to ensure we don't double count points for multiple submissions
	err := DB.Table("submissions").
		Select("submissions.user_id, problems.points").
		Joins("JOIN problems ON problems.id = submissions.problem_id").
		Where("submissions.status = ? AND problems.contest_id = ?", "Passed", contestID).
		Group("submissions.user_id, submissions.problem_id"). 
		Scan(&solved).Error

	if err != nil {
		return nil, err
	}

	// 3. Aggregate
	for _, s := range solved {
		if _, ok := scores[s.UserID]; ok {
			scores[s.UserID] += s.Points
		}
	}

	// 4. Convert to slice
	var leaderboard []LeaderboardEntry
	for user, score := range scores {
		leaderboard = append(leaderboard, LeaderboardEntry{UserID: user, Score: score})
	}

	// 5. Sort (Desc score)
	sort.Slice(leaderboard, func(i, j int) bool {
		return leaderboard[i].Score > leaderboard[j].Score
	})

	return leaderboard, nil
}

// func Scan(&entries).Error
// 	return entries, err
// }

type ProblemLeaderboardEntry struct {
	UserID    string    `json:"username"`
	CreatedAt time.Time `json:"created_at"`
	Status    string    `json:"status"`
}

func GetProblemLeaderboard(problemID uint) ([]ProblemLeaderboardEntry, error) {
	var entries []ProblemLeaderboardEntry
	err := DB.Table("submissions").
		Select("user_id, created_at, status").
		Where("problem_id = ? AND status = ?", problemID, "Passed").
		Order("created_at asc").
		Scan(&entries).Error
	return entries, err
}
