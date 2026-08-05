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

const apiURL = "http://localhost:3000"

type Project struct {
	ID          int    `json:"id"`
	Name        string `json:"name"`
	Description string `json:"description"`
	Priority    string `json:"priority"`
	XPReward    int    `json:"xpReward"`
	Status      string `json:"status"`
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

type AIPlan struct {
	Description string      `json:"description"`
	GithubURL   string      `json:"githubUrl"`
	Milestones  []Milestone `json:"milestones"`
}

func main() {
	reader := bufio.NewReader(os.Stdin)

	if len(os.Args) < 2 {
		usage()
		return
	}

	switch os.Args[1] {
	case "init":
		initProject()

	case "status":
		status()

	case "next":
		nextTask(reader)

	case "ai":
		handleAI(reader)

	case "project":
		handleProject(reader)

	case "milestone":
		handleMilestone(reader)

	case "task":
		handleTask(reader)

	case "help", "--help", "-h":
		usage()

	default:
		fmt.Println("Unknown command:", os.Args[1])
		usage()
	}
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

	req, err := http.NewRequest(method, apiURL+path, reqBody)
	if err != nil {
		return err
	}

	if body != nil {
		req.Header.Set("Content-Type", "application/json")
	}

	res, err := http.DefaultClient.Do(req)
	if err != nil {
		return fmt.Errorf("backend unavailable: %w", err)
	}

	defer res.Body.Close()

	data, err := io.ReadAll(res.Body)
	if err != nil {
		return err
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
	fmt.Println(`
DevPilot CLI

Usage:

  devpilot init
  devpilot status
  devpilot next

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
	if err := os.WriteFile(
		".devpilot",
		[]byte("api_url="+apiURL+"\n"),
		0644,
	); err != nil {
		fmt.Println("Error:", err)
		return
	}

	fmt.Println("Initialized DevPilot in this directory.")
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
		"xpReward":    id(reader, "XP reward: "),
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
		"xpReward":    id(reader, "XP reward: "),
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

func deleteResource(reader *bufio.Reader, kind string) {
	resourceID := id(
		reader,
		strings.Title(kind)+" ID: ",
	)

	paths := map[string]string{
		"project":   "/projects/",
		"milestone": "/milestones/",
		"task":      "/tasks/",
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
			"xpReward":    milestone.XPReward,
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
				"xpReward":    task.XPReward,
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
