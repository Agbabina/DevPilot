package main

import (
	"bufio"
	"bytes"
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"os"
	"strconv"
	"strings"
	"time"
)

const apiURL = "https://devpilot-api-vsh2.onrender.com"
const configFile = ".devpilot"

type Config struct {
	APIURL      string
	Token       string
	ProjectID   int
	MilestoneID int
}

var config Config

type Resource struct {
	ID      int      `json:"id"`
	Title   string   `json:"title"`
	Content string   `json:"content"`
	Type    string   `json:"type"`
	Tags    []string `json:"tags"`
}
type Project struct {
	ID          int    `json:"id"`
	Name        string `json:"name"`
	Description string `json:"description"`
	Priority    string `json:"priority"`
	XPReward    int    `json:"xpReward"`
	Status      string `json:"status,omitempty"`
	GithubURL   string `json:"githubUrl,omitempty"`
}

type Task struct {
	ID          int    `json:"id"`
	Title       string `json:"title"`
	Description string `json:"description"`
	Priority    string `json:"priority"`
	XPReward    int    `json:"xpReward"`
	Status      string `json:"status"`
	Order       int    `json:"order"`
}

type Milestone struct {
	ID          int    `json:"id"`
	Title       string `json:"title"`
	Description string `json:"description"`
	XPReward    int    `json:"xpReward"`
	Status      string `json:"status"`
	Order       int    `json:"order"`
	Tasks       []Task `json:"tasks"`
}

// AI plan response types intentionally omit persistence-only status fields.
// The backend assigns valid default statuses when milestones and tasks are created.
type AIPlanTask struct {
	Title       string `json:"title"`
	Description string `json:"description"`
	Priority    string `json:"priority"`
	XPReward    int    `json:"xpReward"`
}

type AIPlanMilestone struct {
	Title       string        `json:"title"`
	Description string        `json:"description"`
	Difficulty  string        `json:"difficulty"`
	XPReward    int           `json:"xpReward"`
	Tasks       []AIPlanTask  `json:"tasks"`
}

type AIPlan struct {
	Description string            `json:"description"`
	GithubURL   string            `json:"githubUrl"`
	Milestones  []AIPlanMilestone `json:"milestones"`
}

type AuthResponse struct {
	AccessToken string `json:"accessToken"`
	User        struct {
		ID       int    `json:"id"`
		Username string `json:"username"`
		Email    string `json:"email"`
	} `json:"user"`
}

func main() {
	loadConfig()

	reader := bufio.NewReader(os.Stdin)

	if len(os.Args) < 2 {
		usage()
		return
	}

	switch os.Args[1] {
	case "init":
		wfInit(reader)

	case "login":
		login(reader)

	case "logout":
		logout()

	case "whoami":
		whoami()

	case "status":
		wfStatus(reader, os.Args[2:])

	case "dashboard", "home":
		wfStatus(reader, os.Args[2:])

	case "next":
		wfNext(reader, os.Args[2:])

	case "sync":
		syncOutbox()

	case "ai":
		if len(os.Args) > 2 && os.Args[2] == "plan" {
			wfAIPlanCommand(reader, os.Args[3:])
		} else {
			handleAI(reader)
		}

	case "project":
		handleWorkflowProject(reader, os.Args[2:])

	case "milestone":
		handleWorkflowMilestone(reader, os.Args[2:])

	case "task":
		handleWorkflowTask(reader, os.Args[2:])

	case "use":
		wfUse(reader, os.Args[2:])

	case "focus", "standup", "wip", "checkpoint", "todo", "map", "note", "notes", "count", "recent":
		handleProductivity(reader, os.Args[1], os.Args[2:])

	case "help", "--help", "-h":
		usage()
	case "resource":
		handleResource(reader)

	case "progress":
		showProgress()

	case "ship", "doctor", "resume", "daily", "pulse", "commit", "coffee", "matrix", "motivate":
		handlePremiumCommand(reader, os.Args[1])

	case "pr", "issue", "release", "inspect", "explain", "impact", "security", "deps", "test", "fix", "review":
		handleDevtools(reader)

	default:
		fmt.Println("Unknown command:", os.Args[1])
		usage()
	}
}

/* =========================
   CONFIG (.devpilot file)
========================= */

// loadConfig reads key=value pairs from .devpilot in the current directory.
// Falls back to the hardcoded apiURL and the DEVPILOT_TOKEN env var if the
// file doesn't exist or a value is missing, so existing setups still work.
func loadConfig() {
	config = Config{
		APIURL: apiURL,
		Token:  os.Getenv("DEVPILOT_TOKEN"),
	}

	if data, err := os.ReadFile(configFile); err == nil {
		for _, line := range strings.Split(string(data), "\n") {
			line = strings.TrimSpace(line)
			if line == "" || !strings.Contains(line, "=") {
				continue
			}
			parts := strings.SplitN(line, "=", 2)
			key := strings.TrimSpace(parts[0])
			value := strings.TrimSpace(parts[1])
			switch key {
			case "api_url":
				if value != "" {
					config.APIURL = value
				}
			case "token":
				if value != "" {
					config.Token = value
				}
			case "project_id":
				config.ProjectID, _ = strconv.Atoi(value)
			case "milestone_id":
				config.MilestoneID, _ = strconv.Atoi(value)
			}
		}
	}

	// Migrate the old Node CLI's localhost default. Use DEVPILOT_API_URL for
	// an intentional local-backend override.
	if strings.TrimRight(config.APIURL, "/") == "http://localhost:3000" {
		config.APIURL = apiURL
	}

	// Environment variables intentionally take precedence over local config.
	if override := strings.TrimSpace(os.Getenv("DEVPILOT_API_URL")); override != "" {
		config.APIURL = strings.TrimRight(override, "/")
	}
}

func saveConfig() error {
	contents := fmt.Sprintf("api_url=%s\ntoken=%s\nproject_id=%d\nmilestone_id=%d\n", config.APIURL, config.Token, config.ProjectID, config.MilestoneID)
	return os.WriteFile(configFile, []byte(contents), 0600)
}

/* =========================
   AUTH
========================= */

func login(reader *bufio.Reader) {
	email := ask(reader, "Email: ")
	password := askPassword("Password: ")

	body := map[string]string{
		"email":    email,
		"password": password,
	}

	var auth AuthResponse

	if err := request("POST", "/auth/login", body, &auth); err != nil {
		fmt.Println("Login failed:", err)
		return
	}

	if auth.AccessToken == "" {
		fmt.Println("Login failed: no access token returned.")
		return
	}

	config.Token = auth.AccessToken

	if err := saveConfig(); err != nil {
		fmt.Println("Logged in, but failed to save token:", err)
		return
	}

	fmt.Printf("Logged in as %s. Token saved to %s.\n", auth.User.Username, configFile)
}

func logout() {
	config.Token = ""

	if err := saveConfig(); err != nil {
		fmt.Println("Error clearing token:", err)
		return
	}

	fmt.Println("Logged out.")
}

func whoami() {
	if config.Token == "" {
		fmt.Println("Not logged in. Run `devpilot login` first.")
		return
	}

	var me map[string]any

	if err := request("GET", "/auth/me", nil, &me); err != nil {
		fmt.Println("Error:", err)
		return
	}

	data, err := json.MarshalIndent(me, "", "  ")
	if err != nil {
		fmt.Println("Error:", err)
		return
	}

	fmt.Println(string(data))
}

// askPassword prompts for a password. Stdlib-only, so input is echoed to
// the terminal as it's typed. If you want masked input later, add
// golang.org/x/term and swap this for term.ReadPassword.
func askPassword(prompt string) string {
	reader := bufio.NewReader(os.Stdin)
	fmt.Print(prompt)

	value, err := reader.ReadString('\n')
	if err != nil {
		return ""
	}
	return strings.TrimSpace(value)
}

func handleAI(reader *bufio.Reader) {
	if len(os.Args) < 3 {
		usage()
		return
	}

	switch os.Args[2] {
	case "plan":
		generatePlan(reader)

	case "suggest", "explain", "debug", "review", "improve", "generate", "summarize":
		aiAssist(reader, os.Args[2])

	default:
		fmt.Println("Unknown AI command:", os.Args[2])
		usage()
	}
}
func handleResource(reader *bufio.Reader) {
	if len(os.Args) < 3 {
		usage()
		return
	}

	switch os.Args[2] {
	case "list":
		var resources []Resource

		if err := request("GET", "/resources", nil, &resources); err != nil {
			fmt.Println("Error:", err)
			return
		}

		if len(resources) == 0 {
			fmt.Println("No resources found.")
			return
		}

		for _, resource := range resources {
			fmt.Printf(
				"#%d %-30s [%s]\n",
				resource.ID,
				resource.Title,
				resource.Type,
			)
		}

	case "create":
		body := map[string]any{
			"title":   ask(reader, "Title: "),
			"content": ask(reader, "Content: "),
			"type":    strings.ToUpper(ask(reader, "Type: ")),
		}

		var resource Resource

		if err := request("POST", "/resources", body, &resource); err != nil {
			fmt.Println("Error:", err)
			return
		}

		fmt.Println("Created resource:", resource.Title)

	case "delete":
		deleteResource(reader, "resource")

	default:
		fmt.Println("Unknown resource command:", os.Args[2])
		usage()
	}
}
func handleProject(reader *bufio.Reader) {
	if len(os.Args) < 3 {
		usage()
		return
	}

	switch os.Args[2] {
	case "create":
		createProject(reader)

	case "list":
		listProjects()

	case "show":
		showProject(reader)

	case "update":
		updateProject(reader)

	case "delete":
		deleteResource(reader, "project")

	case "start":
		updateProjectStatus(reader, "IN_PROGRESS")

	case "finish":
		updateProjectStatus(reader, "COMPLETED")

	case "milestones":
		listMilestones(reader)

	default:
		fmt.Println("Unknown project command:", os.Args[2])
		usage()
	}
}

func handleMilestone(reader *bufio.Reader) {
	if len(os.Args) < 3 {
		usage()
		return
	}

	switch os.Args[2] {
	case "create":
		createMilestone(reader)

	case "list":
		listMilestones(reader)

	case "show":
		showMilestone(reader)

	case "update":
		updateMilestone(reader)

	case "delete":
		deleteResource(reader, "milestone")

	case "start":
		updateMilestoneStatus(reader, "IN_PROGRESS")

	case "finish":
		updateMilestoneStatus(reader, "COMPLETED")

	case "tasks":
		listTasks(reader)

	default:
		fmt.Println("Unknown milestone command:", os.Args[2])
		usage()
	}
}

func handleTask(reader *bufio.Reader) {
	if len(os.Args) < 3 {
		usage()
		return
	}

	switch os.Args[2] {
	case "create":
		createTask(reader)

	case "list":
		listTasks(reader)

	case "show":
		showTask(reader)

	case "update":
		updateTask(reader)

	case "delete":
		deleteResource(reader, "task")

	case "start":
		updateTaskStatus(reader, "IN_PROGRESS")

	case "finish":
		updateTaskStatus(reader, "COMPLETED")

	case "next":
		nextTask(reader)

	default:
		fmt.Println("Unknown task command:", os.Args[2])
		usage()
	}
}

func request(method, path string, body any, out any) error {
	var reqBody io.Reader

	if body != nil {
		payload, err := json.Marshal(body)
		if err != nil {
			return err
		}

		reqBody = bytes.NewReader(payload)
	}

	req, err := http.NewRequest(method, config.APIURL+path, reqBody)
	if err != nil {
		return err
	}

	if body != nil {
		req.Header.Set("Content-Type", "application/json")
	}
	if config.Token != "" {
		req.Header.Set("Authorization", "Bearer "+config.Token)
	}

	res, err := http.DefaultClient.Do(req)
	if err != nil {
		if !syncingOutbox && config.Token != "" && isQueueableMutation(method, path) {
			if queueErr := queueOfflineRequest(method, path, body); queueErr != nil {
				return fmt.Errorf("backend unavailable (%v); could not queue change: %w", err, queueErr)
			}
			return fmt.Errorf("backend unavailable; queued %s %s locally. Run devpilot sync when online", method, path)
		}
		return fmt.Errorf("backend unavailable: %w", err)
	}

	defer res.Body.Close()

	data, err := io.ReadAll(res.Body)
	if err != nil {
		return err
	}

	if res.StatusCode == http.StatusUnauthorized {
		return fmt.Errorf("not authenticated — run `devpilot login`")
	}

	if res.StatusCode >= 300 {
		return fmt.Errorf("API %s: %s", res.Status, string(data))
	}

	if out != nil && len(data) > 0 {
		if err := json.Unmarshal(data, out); err != nil {
			return fmt.Errorf("invalid API response: %w", err)
		}
	}

	return nil
}

func usage() {
	fmt.Print(`
DevPilot CLI

Usage:

  devpilot init
  devpilot login
  devpilot logout
  devpilot whoami
  devpilot status
  devpilot send @username "message text"
  devpilot inbox [--unread]
  devpilot message reply <id> "text"
  devpilot message forward <id> @username
  devpilot message attach <id> <task-id>
  devpilot message search "query"
  devpilot use [project] [milestone]
  devpilot focus [minutes]      Start a focused work session (default 25)
  devpilot standup              Summarize recent commits and working tree
  devpilot wip                  Show changed files and diff summary
  devpilot checkpoint [note]    Save a resume checkpoint to Markdown
  devpilot todo                 Find TODO/FIXME/HACK/BUG markers
  devpilot map                  Print a compact project tree
  devpilot note <text>          Save a timestamped project note
  devpilot notes                Read saved project notes
  devpilot count                Count source files and lines
  devpilot recent               Show the last 10 commits
  devpilot next
  devpilot dashboard             Live command center: tasks, progress, Git, next action
  devpilot home                  Alias for dashboard
  devpilot sync
  devpilot ship [commit message]
  devpilot doctor
  devpilot resume
  devpilot daily
  devpilot pulse
  devpilot commit
  devpilot pr draft|create|review|merge|checks
  devpilot issue [title]
  devpilot release <version>
  devpilot inspect [map|todo|hotspots|checkpoint|onboard]
  devpilot explain <file>
  devpilot impact <file>
  devpilot security
  devpilot deps
  devpilot test
  devpilot fix [error]
  devpilot review --diff
  devpilot coffee
  devpilot matrix
  devpilot motivate

Projects:
  devpilot project create
  devpilot project list
  devpilot project show
  devpilot project update
  devpilot project delete
  devpilot project start
  devpilot project finish
  devpilot project milestones

Milestones:
  devpilot milestone create
  devpilot milestone list
  devpilot milestone show
  devpilot milestone update
  devpilot milestone delete
  devpilot milestone start
  devpilot milestone finish
  devpilot milestone tasks

Tasks:
  devpilot task create
  devpilot task list
  devpilot task show
  devpilot task update
  devpilot task delete
  devpilot task start
  devpilot task finish
  devpilot task next

AI:
  devpilot ai plan
  devpilot ai suggest
  devpilot ai explain
  devpilot ai debug
  devpilot ai review
  devpilot ai improve
  devpilot ai generate
  devpilot ai summarize
`)
}

func initProject() {
	config.APIURL = apiURL
	if override := strings.TrimSpace(os.Getenv("DEVPILOT_API_URL")); override != "" {
		config.APIURL = strings.TrimRight(override, "/")
	}

	if err := saveConfig(); err != nil {
		fmt.Println("Error:", err)
		return
	}

	fmt.Println("Initialized DevPilot in this directory. Run `devpilot login` to authenticate.")
}

func status() {
	var projects []Project

	if err := request("GET", "/projects", nil, &projects); err != nil {
		fmt.Println("Error:", err)
		return
	}

	if len(projects) == 0 {
		fmt.Println("No projects found.")
		return
	}

	fmt.Println("Projects:")

	for _, project := range projects {
		fmt.Printf(
			"#%d %-30s [%s] %s (+%d XP)\n",
			project.ID,
			project.Name,
			project.Status,
			project.Priority,
			project.XPReward,
		)
	}
}

func createProject(reader *bufio.Reader) {
	body := map[string]any{
		"name":        ask(reader, "Project name: "),
		"description": ask(reader, "Description: "),
		"priority":    strings.ToUpper(ask(reader, "Priority (LOW, MEDIUM, HIGH): ")),
		"xpReward":    id(reader, "XP reward: "),
		"githubUrl":   ask(reader, "GitHub repository URL (optional): "),
	}

	var project Project

	if err := request("POST", "/projects", body, &project); err != nil {
		fmt.Println("Error:", err)
		return
	}

	fmt.Printf(
		"Created project #%d: %s\n",
		project.ID,
		project.Name,
	)
}

func listProjects() {
	var projects []Project

	if err := request("GET", "/projects", nil, &projects); err != nil {
		fmt.Println("Error:", err)
		return
	}

	if len(projects) == 0 {
		fmt.Println("No projects found.")
		return
	}

	for _, project := range projects {
		fmt.Printf(
			"#%d %-30s [%s] %s (+%d XP)\n",
			project.ID,
			project.Name,
			project.Status,
			project.Priority,
			project.XPReward,
		)
	}
}

func showProject(reader *bufio.Reader) {
	projectID := id(reader, "Project ID: ")

	var project Project

	if err := request(
		"GET",
		"/projects/"+strconv.Itoa(projectID),
		nil,
		&project,
	); err != nil {
		fmt.Println("Error:", err)
		return
	}

	fmt.Println()
	fmt.Println("Project")
	fmt.Println("------------------------------")
	fmt.Println("ID:", project.ID)
	fmt.Println("Name:", project.Name)
	fmt.Println("Description:", project.Description)
	fmt.Println("Priority:", project.Priority)
	fmt.Println("Status:", project.Status)
	fmt.Println("XP Reward:", project.XPReward)
}

func updateProject(reader *bufio.Reader) {
	projectID := id(reader, "Project ID: ")

	body := map[string]any{
		"description": ask(reader, "New description: "),
		"priority":    strings.ToUpper(ask(reader, "Priority: ")),
		"xpReward":    id(reader, "XP reward: "),
		"githubUrl":   ask(reader, "GitHub repository URL (optional): "),
	}

	var project Project

	if err := request(
		"PATCH",
		"/projects/"+strconv.Itoa(projectID),
		body,
		&project,
	); err != nil {
		fmt.Println("Error:", err)
		return
	}

	fmt.Println("Updated project:", project.Name)
}

func updateProjectStatus(reader *bufio.Reader, status string) {
	projectID := id(reader, "Project ID: ")

	body := map[string]any{
		"status": status,
	}

	var project Project

	if err := request(
		"PATCH",
		"/projects/"+strconv.Itoa(projectID),
		body,
		&project,
	); err != nil {
		fmt.Println("Error:", err)
		return
	}

	fmt.Printf(
		"Project #%d is now %s.\n",
		project.ID,
		project.Status,
	)
}

func createMilestone(reader *bufio.Reader) {
	projectID := id(reader, "Project ID: ")

	body := map[string]any{
		"title":       ask(reader, "Milestone title: "),
		"description": ask(reader, "Description: "),
		"order":       id(reader, "Order: "),
		"xpReward":    id(reader, "XP reward: "),
		"githubUrl":   ask(reader, "GitHub repository URL (optional): "),
	}

	var milestone Milestone

	if err := request(
		"POST",
		"/projects/"+strconv.Itoa(projectID)+"/milestones",
		body,
		&milestone,
	); err != nil {
		fmt.Println("Error:", err)
		return
	}

	fmt.Println("Created milestone:", milestone.Title)
}

func listMilestones(reader *bufio.Reader) {
	projectID := id(reader, "Project ID: ")

	var milestones []Milestone

	if err := request(
		"GET",
		"/projects/"+strconv.Itoa(projectID)+"/milestones",
		nil,
		&milestones,
	); err != nil {
		fmt.Println("Error:", err)
		return
	}

	if len(milestones) == 0 {
		fmt.Println("No milestones found.")
		return
	}

	for _, milestone := range milestones {
		fmt.Printf(
			"#%d %s [%s] (+%d XP)\n",
			milestone.ID,
			milestone.Title,
			milestone.Status,
			milestone.XPReward,
		)
	}
}

func showMilestone(reader *bufio.Reader) {
	milestoneID := id(reader, "Milestone ID: ")

	var milestone Milestone

	if err := request(
		"GET",
		"/milestones/"+strconv.Itoa(milestoneID),
		nil,
		&milestone,
	); err != nil {
		fmt.Println("Error:", err)
		return
	}

	fmt.Println()
	fmt.Println("Milestone")
	fmt.Println("------------------------------")
	fmt.Println("ID:", milestone.ID)
	fmt.Println("Title:", milestone.Title)
	fmt.Println("Description:", milestone.Description)
	fmt.Println("Status:", milestone.Status)
	fmt.Println("Order:", milestone.Order)
	fmt.Println("XP Reward:", milestone.XPReward)
}

func updateMilestone(reader *bufio.Reader) {
	milestoneID := id(reader, "Milestone ID: ")

	body := map[string]any{
		"title":       ask(reader, "New title: "),
		"description": ask(reader, "New description: "),
		"xpReward":    id(reader, "XP reward: "),
		"githubUrl":   ask(reader, "GitHub repository URL (optional): "),
	}

	var milestone Milestone

	if err := request(
		"PATCH",
		"/milestones/"+strconv.Itoa(milestoneID),
		body,
		&milestone,
	); err != nil {
		fmt.Println("Error:", err)
		return
	}

	fmt.Println("Updated milestone:", milestone.Title)
}

func updateMilestoneStatus(reader *bufio.Reader, status string) {
	milestoneID := id(reader, "Milestone ID: ")

	body := map[string]any{
		"status": status,
	}

	var milestone Milestone

	if err := request(
		"PATCH",
		"/milestones/"+strconv.Itoa(milestoneID),
		body,
		&milestone,
	); err != nil {
		fmt.Println("Error:", err)
		return
	}

	fmt.Printf(
		"Milestone #%d is now %s.\n",
		milestone.ID,
		milestone.Status,
	)
}

func createTask(reader *bufio.Reader) {
	milestoneID := id(reader, "Milestone ID: ")

	body := map[string]any{
		"title":       ask(reader, "Task title: "),
		"description": ask(reader, "Description: "),
		"priority":    strings.ToUpper(ask(reader, "Priority (LOW, MEDIUM, HIGH): ")),
		"order":       id(reader, "Order: "),
		"githubUrl":   ask(reader, "GitHub repository URL (optional): "),
	}

	var task Task

	if err := request(
		"POST",
		"/milestones/"+strconv.Itoa(milestoneID)+"/tasks",
		body,
		&task,
	); err != nil {
		fmt.Println("Error:", err)
		return
	}

	fmt.Println("Created task:", task.Title)
}

func listTasks(reader *bufio.Reader) {
	milestoneID := id(reader, "Milestone ID: ")

	var tasks []Task

	if err := request(
		"GET",
		"/milestones/"+strconv.Itoa(milestoneID)+"/tasks",
		nil,
		&tasks,
	); err != nil {
		fmt.Println("Error:", err)
		return
	}

	if len(tasks) == 0 {
		fmt.Println("No tasks found.")
		return
	}

	for _, task := range tasks {
		fmt.Printf(
			"#%d %s [%s] [%s] (+%d XP)\n",
			task.ID,
			task.Title,
			task.Status,
			task.Priority,
			task.XPReward,
		)
	}
}

func showTask(reader *bufio.Reader) {
	taskID := id(reader, "Task ID: ")

	var task Task

	if err := request(
		"GET",
		"/tasks/"+strconv.Itoa(taskID),
		nil,
		&task,
	); err != nil {
		fmt.Println("Error:", err)
		return
	}

	fmt.Println()
	fmt.Println("Task")
	fmt.Println("------------------------------")
	fmt.Println("ID:", task.ID)
	fmt.Println("Title:", task.Title)
	fmt.Println("Description:", task.Description)
	fmt.Println("Priority:", task.Priority)
	fmt.Println("Status:", task.Status)
	fmt.Println("Order:", task.Order)
	fmt.Println("XP Reward:", task.XPReward)
}

func updateTask(reader *bufio.Reader) {
	taskID := id(reader, "Task ID: ")

	body := map[string]any{
		"title":       ask(reader, "New title: "),
		"description": ask(reader, "New description: "),
		"priority":    strings.ToUpper(ask(reader, "Priority: ")),
		"githubUrl":   ask(reader, "GitHub repository URL (optional): "),
	}

	var task Task

	if err := request(
		"PATCH",
		"/tasks/"+strconv.Itoa(taskID),
		body,
		&task,
	); err != nil {
		fmt.Println("Error:", err)
		return
	}

	fmt.Println("Updated task:", task.Title)
}

func updateTaskStatus(reader *bufio.Reader, status string) {
	taskID := id(reader, "Task ID: ")

	body := map[string]any{
		"status": status,
	}

	var task Task

	if err := request(
		"PATCH",
		"/tasks/"+strconv.Itoa(taskID),
		body,
		&task,
	); err != nil {
		fmt.Println("Error:", err)
		return
	}

	fmt.Printf(
		"Task #%d is now %s.\n",
		task.ID,
		task.Status,
	)
}

func showProgress() {
	var progress map[string]any

	if err := request("GET", "/progression/me", nil, &progress); err != nil {
		fmt.Println("Error:", err)
		return
	}

	data, err := json.MarshalIndent(progress, "", "  ")
	if err != nil {
		fmt.Println("Error:", err)
		return
	}

	fmt.Println(string(data))
}

func deleteResource(reader *bufio.Reader, kind string) {
	resourceID := id(
		reader,
		strings.Title(kind)+" ID: ",
	)

	paths := map[string]string{
		"project":   "/projects/",
		"milestone": "/milestones/",
		"task":      "/tasks/",
		"resource":  "/resources/",
	}

	path, exists := paths[kind]

	if !exists {
		fmt.Println("Unknown resource:", kind)
		return
	}

	confirm := ask(
		reader,
		"Are you sure? Type 'yes' to confirm: ",
	)

	if strings.ToLower(confirm) != "yes" {
		fmt.Println("Delete cancelled.")
		return
	}

	if err := request(
		"DELETE",
		path+strconv.Itoa(resourceID),
		nil,
		nil,
	); err != nil {
		fmt.Println("Error:", err)
		return
	}

	fmt.Printf(
		"Deleted %s #%d.\n",
		kind,
		resourceID,
	)
}

func nextTask(reader *bufio.Reader) {
	projectID := id(reader, "Project ID: ")

	var milestones []Milestone

	if err := request(
		"GET",
		"/projects/"+strconv.Itoa(projectID)+"/milestones",
		nil,
		&milestones,
	); err != nil {
		fmt.Println("Error:", err)
		return
	}

	for _, milestone := range milestones {
		for _, task := range milestone.Tasks {
			if task.Status == "TODO" {
				fmt.Println()
				fmt.Println("Next task:")
				fmt.Println("------------------------------")
				fmt.Printf("#%d %s\n", task.ID, task.Title)
				fmt.Println("Milestone:", milestone.Title)
				fmt.Println("Priority:", task.Priority)
				fmt.Printf("XP Reward: %d\n", task.XPReward)
				return
			}
		}
	}

	fmt.Println("No TODO tasks found.")
}

func aiAssist(reader *bufio.Reader, action string) {
	var result struct {
		Result string `json:"result"`
	}

	body := map[string]string{
		"action":  action,
		"context": ask(reader, "Context (optional): "),
	}

	if err := request(
		"POST",
		"/ai/assist",
		body,
		&result,
	); err != nil {
		fmt.Println("Error:", err)
		return
	}

	slowPrint(result.Result)
}

func generatePlan(reader *bufio.Reader) {
	name := ask(reader, "Project name: ")
	context := ask(reader, "Context / requirements: ")

	priority := strings.ToUpper(
		ask(reader, "Priority (LOW, MEDIUM, HIGH): "),
	)

	if priority == "" {
		priority = "MEDIUM"
	}

	var plan AIPlan

	if err := request(
		"POST",
		"/ai/projects/generate",
		map[string]string{
			"name":     name,
			"goal":     context,
			"priority": priority,
		},
		&plan,
	); err != nil {
		fmt.Println("Error:", err)
		return
	}

	project := Project{
		Name:        name,
		Description: plan.Description,
		Priority:    priority,
	}

	var saved Project

	if err := request(
		"POST",
		"/projects",
		project,
		&saved,
	); err != nil {
		fmt.Println("Error saving project:", err)
		return
	}

	fmt.Printf(
		"\nCreated project #%d: %s\n",
		saved.ID,
		saved.Name,
	)

	fmt.Print("Description: ")
	slowPrint(saved.Description)

	for i, milestone := range plan.Milestones {
		var savedMilestone struct {
			ID int `json:"id"`
		}

		body := map[string]any{
			"title":       milestone.Title,
			"description": milestone.Description,
			"order":       i + 1,
		}

		if err := request(
			"POST",
			"/projects/"+strconv.Itoa(saved.ID)+"/milestones",
			body,
			&savedMilestone,
		); err != nil {
			fmt.Println("Milestone error:", err)
			continue
		}

		fmt.Print("  Milestone: ")

		slowPrint(
			fmt.Sprintf(
				"%s (+%d XP)",
				milestone.Title,
				milestone.XPReward,
			),
		)

		for j, task := range milestone.Tasks {
			body := map[string]any{
				"title":       task.Title,
				"description": task.Description,
				"priority":    task.Priority,
				"order":       j + 1,
			}

			if err := request(
				"POST",
				"/milestones/"+strconv.Itoa(savedMilestone.ID)+"/tasks",
				body,
				nil,
			); err != nil {
				fmt.Println("Task error:", err)
				continue
			}

			fmt.Print("    Task: ")

			slowPrint(
				fmt.Sprintf(
					"%s [%s] (+%d XP)",
					task.Title,
					task.Priority,
					task.XPReward,
				),
			)
		}
	}

	fmt.Println("\nPlan created successfully.")
}

func slowPrint(text string) {
	for _, character := range text {
		fmt.Print(string(character))
		time.Sleep(35 * time.Millisecond)
	}

	fmt.Println()
}

func ask(reader *bufio.Reader, prompt string) string {
	fmt.Print(prompt)

	value, err := reader.ReadString('\n')
	if err != nil {
		return ""
	}

	return strings.TrimSpace(value)
}

func id(reader *bufio.Reader, label string) int {
	for {
		value := ask(reader, label)

		number, err := strconv.Atoi(value)

		if err == nil && number > 0 {
			return number
		}

		fmt.Println("Please enter a valid ID.")
	}
}
 
// Messaging commands use the authenticated API; private messages are visible only to participants.
func sendMessage() {
	if len(os.Args) < 4 {
		fmt.Println("Usage: devpilot send @username \"message text\"")
		return
	}
	var sent map[string]any
	if err := request("POST", "/messages/send", map[string]string{"recipient": os.Args[2], "message": strings.Join(os.Args[3:], " ")}, &sent); err != nil { fmt.Println("Error:", err); return }
	fmt.Printf("Message sent to @%v (message #%v).\n", nestedUsername(sent, "recipient"), sent["id"])
}

func showInbox() {
	unread := len(os.Args) > 2 && os.Args[2] == "--unread"
	path := "/messages/inbox"
	if unread { path += "?unread=true" }
	var messages []map[string]any
	if err := request("GET", path, nil, &messages); err != nil { fmt.Println("Error:", err); return }
	if len(messages) == 0 { if unread { fmt.Println("No unread messages.") } else { fmt.Println("Inbox is empty.") }; return }
	for _, m := range messages {
		sender, recipient := nestedUsername(m, "sender"), nestedUsername(m, "recipient")
		marker := " "
		if m["readAt"] == nil && recipient != "unknown" { marker = "*" }
		fmt.Printf("%s #%v @%s → @%s  %s\n    %s\n", marker, m["id"], sender, recipient, m["createdAt"], m["body"])
		if m["taskId"] != nil { fmt.Printf("    linked task: #%v\n", m["taskId"]) }
	}
}

func handleMessageCommand() {
	if len(os.Args) < 3 { fmt.Println("Usage: devpilot message reply|forward|attach|search ..."); return }
	switch os.Args[2] {
	case "reply":
		if len(os.Args) < 5 { fmt.Println("Usage: devpilot message reply <id> \"text\""); return }
		id, err := strconv.Atoi(os.Args[3]); if err != nil || id < 1 { fmt.Println("Message ID must be a positive number."); return }
		var sent map[string]any
		if err := request("POST", "/messages/"+strconv.Itoa(id)+"/reply", map[string]string{"message": strings.Join(os.Args[4:], " ")}, &sent); err != nil { fmt.Println("Error:", err); return }
		fmt.Printf("Reply sent (message #%v).\n", sent["id"])
	case "forward":
		if len(os.Args) != 5 { fmt.Println("Usage: devpilot message forward <id> @username"); return }
		id, err := strconv.Atoi(os.Args[3]); if err != nil || id < 1 { fmt.Println("Message ID must be a positive number."); return }
		var sent map[string]any
		if err := request("POST", "/messages/"+strconv.Itoa(id)+"/forward", map[string]string{"recipient": os.Args[4]}, &sent); err != nil { fmt.Println("Error:", err); return }
		fmt.Printf("Forwarded as message #%v.\n", sent["id"])
	case "attach":
		if len(os.Args) != 5 { fmt.Println("Usage: devpilot message attach <message-id> <task-id>"); return }
		id, e1 := strconv.Atoi(os.Args[3]); taskID, e2 := strconv.Atoi(os.Args[4])
		if e1 != nil || e2 != nil || id < 1 || taskID < 1 { fmt.Println("Message and task IDs must be positive numbers."); return }
		var updated map[string]any
		if err := request("POST", "/messages/"+strconv.Itoa(id)+"/attach", map[string]int{"taskId": taskID}, &updated); err != nil { fmt.Println("Error:", err); return }
		fmt.Printf("Message #%d linked to task #%d.\n", id, taskID)
	case "search":
		if len(os.Args) < 4 { fmt.Println("Usage: devpilot message search \"query\""); return }
		var messages []map[string]any
		if err := request("GET", "/messages/search?q="+urlQueryEscape(strings.Join(os.Args[3:], " ")), nil, &messages); err != nil { fmt.Println("Error:", err); return }
		if len(messages) == 0 { fmt.Println("No matching messages."); return }
		for _, m := range messages { fmt.Printf("#%v @%s: %s\n", m["id"], nestedUsername(m, "sender"), m["body"]) }
	default:
		fmt.Println("Unknown message command:", os.Args[2])
	}
}

func nestedUsername(value map[string]any, key string) string {
	nested, ok := value[key].(map[string]any)
	if !ok { return "unknown" }
	username, _ := nested["username"].(string)
	if username == "" { return "unknown" }
	return username
}

func urlQueryEscape(value string) string {
	replacer := strings.NewReplacer("%", "%25", " ", "%20", "+", "%2B", "&", "%26", "?", "%3F", "#", "%23")
	return replacer.Replace(value)
}
