package main

import (
	"bufio"
	"encoding/json"
	"errors"
	"fmt"
	"os"
	"os/exec"
	"path/filepath"
	"sort"
	"strconv"
	"strings"
	"time"
)

var syncingOutbox bool

type ProjectContext struct {
	ProjectID int      `json:"projectId"`
	ProjectName string `json:"projectName"`
	WorkingDir string `json:"workingDir"`
	Branch string `json:"branch"`
	SavedAt time.Time `json:"savedAt"`
	GitStatus string `json:"gitStatus"`
	Terminal string `json:"terminal"`
	TerminalFlags string `json:"terminalFlags"`
	EnvFiles []string `json:"envFiles"`
	NotesPath string `json:"notesPath"`
	LinksPath string `json:"linksPath"`
	Project Project `json:"project"`
	Milestones []Milestone `json:"milestones"`
}

type FocusSession struct {
	ProjectID int `json:"projectId,omitempty"`
	TaskID int `json:"taskId,omitempty"`
	StartedAt time.Time `json:"startedAt"`
	EndedAt time.Time `json:"endedAt"`
	PlannedMinutes int `json:"plannedMinutes"`
	ActiveSeconds int64 `json:"activeSeconds"`
}

type QueuedRequest struct {
	Method string `json:"method"`
	Path string `json:"path"`
	Body json.RawMessage `json:"body,omitempty"`
	QueuedAt time.Time `json:"queuedAt"`
}

func stateDir() string {
	home, err := os.UserHomeDir()
	if err != nil || home == "" { return filepath.Join(".", ".devpilot-data") }
	return filepath.Join(home, ".devpilot")
}
func ensureStateDir() error { return os.MkdirAll(stateDir(), 0700) }
func readJSON(path string, target any) error {
	data, err := os.ReadFile(path); if err != nil { return err }
	return json.Unmarshal(data, target)
}
func writeJSON(path string, value any) error {
	if err := ensureStateDir(); err != nil { return err }
	data, err := json.MarshalIndent(value, "", "  "); if err != nil { return err }
	return os.WriteFile(path, data, 0600)
}
func gitOutput(args ...string) (string, error) {
	cmd := exec.Command("git", args...)
	out, err := cmd.CombinedOutput()
	if err != nil { return strings.TrimSpace(string(out)), fmt.Errorf("git %s: %s", strings.Join(args, " "), strings.TrimSpace(string(out))) }
	return strings.TrimSpace(string(out)), nil
}
func gitRoot() (string, error) { return gitOutput("rev-parse", "--show-toplevel") }
func contextPath(id int) string { return filepath.Join(stateDir(), "contexts", strconv.Itoa(id)+".json") }
func projectContextDir() string { return filepath.Join(stateDir(), "contexts") }

func handleContext(reader *bufio.Reader) {
	if len(os.Args) < 3 || os.Args[2] != "switch" || len(os.Args) < 4 {
		fmt.Println("Usage: devpilot context switch <project-id>")
		return
	}
	projectID, err := strconv.Atoi(os.Args[3])
	if err != nil || projectID < 1 { fmt.Println("Project ID must be a positive number."); return }
	root, err := gitRoot()
	if err != nil { fmt.Println("Run this command inside a Git repository:", err); return }
	branch, err := gitOutput("branch", "--show-current")
	if err != nil { fmt.Println(err); return }
	status, _ := gitOutput("status", "--short")
	terminal := os.Getenv("TERM")
	if terminal == "" { terminal = os.Getenv("WT_SESSION"); if terminal != "" { terminal = "Windows Terminal" } }
	if terminal == "" { terminal = "unknown" }
	snapshot := ProjectContext{
		ProjectID: projectID, WorkingDir: root, Branch: branch, SavedAt: time.Now(),
		GitStatus: status, Terminal: terminal,
		TerminalFlags: os.Getenv("DEVPILOT_TERMINAL_FLAGS"),
		EnvFiles: findEnvFiles(root),
		NotesPath: filepath.Join(root, ".devpilot", "notes.md"),
		LinksPath: filepath.Join(root, ".devpilot", "links.txt"),
	}
	// Save the state being left, if a previously selected project is known.
	var previous struct { ProjectID int `json:"projectId"` }
	if readJSON(filepath.Join(stateDir(), "active-context.json"), &previous) == nil && previous.ProjectID > 0 {
		oldPath := contextPath(previous.ProjectID)
		var old ProjectContext
		if readJSON(oldPath, &old) == nil {
			old.Branch, old.GitStatus, old.Terminal, old.TerminalFlags = branch, status, terminal, snapshot.TerminalFlags
			old.SavedAt = time.Now()
			_ = writeJSON(oldPath, old)
		}
	}
	var project Project
	if err := request("GET", "/projects/"+strconv.Itoa(projectID), nil, &project); err != nil {
		fmt.Printf("Could not load project from DevPilot API: %v\n", err)
		fmt.Println("Connect to the backend and retry; the existing local context has not been replaced.")
		return
	}
	snapshot.Project, snapshot.ProjectName = project, project.Name
	_ = request("GET", "/projects/"+strconv.Itoa(projectID)+"/milestones", nil, &snapshot.Milestones)
	if err := os.MkdirAll(projectContextDir(), 0700); err != nil { fmt.Println("Cannot create context directory:", err); return }
	targetPath := contextPath(projectID)
	var previousTarget ProjectContext
	targetExists := readJSON(targetPath, &previousTarget) == nil
	if targetExists && previousTarget.Branch != "" && previousTarget.Branch != branch {
		if status != "" {
			fmt.Println("Your working tree has changes. Saved context was loaded without changing branches to protect your work.")
		} else {
			if _, checkoutErr := gitOutput("checkout", previousTarget.Branch); checkoutErr != nil {
				fmt.Println("Saved branch could not be checked out; keeping current branch:", checkoutErr)
			} else { branch = previousTarget.Branch; snapshot.Branch = branch }
		}
	}
	if err := writeJSON(targetPath, snapshot); err != nil { fmt.Println("Could not save context:", err); return }
	_ = writeJSON(filepath.Join(stateDir(), "active-context.json"), map[string]any{"projectId": projectID, "projectName": project.Name, "updatedAt": time.Now()})
	fmt.Printf("\nDevPilot context loaded: %s (#%d)\nBranch: %s\nWorking tree: %s\n", project.Name, projectID, branch, cleanOr(status, "clean"))
	fmt.Printf("Environment files found (names only): %s\n", strings.Join(snapshot.EnvFiles, ", "))
	fmt.Printf("Task notes: %s\nRelevant links: %s\n", snapshot.NotesPath, snapshot.LinksPath)
	if _, err := os.Stat(snapshot.NotesPath); errors.Is(err, os.ErrNotExist) { fmt.Println("Tip: add task-specific notes to the notes file above.") }
	if _, err := os.Stat(snapshot.LinksPath); errors.Is(err, os.ErrNotExist) { fmt.Println("Tip: add documentation/task URLs to the links file above, one per line.") }
}
func cleanOr(value, fallback string) string { if strings.TrimSpace(value)=="" { return fallback }; return value }
func findEnvFiles(root string) []string {
	var found []string
	for _, name := range []string{".env", ".env.local", ".env.development", ".env.dev", ".env.test"} {
		if info, err := os.Stat(filepath.Join(root, name)); err == nil && !info.IsDir() { found = append(found, name) }
	}
	return found
}

func handleStandup() {
	root, err := gitRoot(); if err != nil { fmt.Println("Run this command inside a Git repository:", err); return }
	log, err := gitOutput("log", "--since=24 hours ago", "--date=iso-strict", "--pretty=format:%h%x09%s%x09%an%x09%aI")
	if err != nil { fmt.Println(err); return }
	var projects []Project
	var taskLines []string
	if err := request("GET", "/projects", nil, &projects); err == nil {
		for _, p := range projects {
			var milestones []Milestone
			if request("GET", "/projects/"+strconv.Itoa(p.ID)+"/milestones", nil, &milestones) != nil { continue }
			for _, m := range milestones {
				for _, t := range m.Tasks {
					if strings.EqualFold(t.Status, "IN_PROGRESS") || strings.EqualFold(t.Status, "COMPLETED") {
						taskLines = append(taskLines, fmt.Sprintf("- [%s] **%s** (project: %s / milestone: %s)", statusMark(t.Status), t.Title, p.Name, m.Title))
					}
				}
			}
		}
	} else { taskLines = append(taskLines, "- Task statuses unavailable (DevPilot API offline).") }
	if log == "" { log = "No commits found in the last 24 hours." }
	if len(taskLines) == 0 { taskLines = []string{"- No in-progress or completed tasks found."} }
	sort.Strings(taskLines)
	now := time.Now()
	var b strings.Builder
	fmt.Fprintf(&b, "# DevPilot Daily Standup\n\n**Date:** %s  \n**Repository:** %s  \n**Window:** Previous 24 hours\n\n", now.Format("2006-01-02"), filepath.Base(root))
	b.WriteString("## Git activity\n\n| Commit | Change | Author | Time |\n|---|---|---|---|\n")
	for _, line := range strings.Split(log, "\n") {
		parts := strings.SplitN(line, "\t", 4)
		if len(parts) == 4 { fmt.Fprintf(&b, "| `%s` | %s | %s | %s |\n", parts[0], escapeTable(parts[1]), escapeTable(parts[2]), parts[3]) }
	}
	b.WriteString("\n## Task progress\n\n")
	b.WriteString(strings.Join(taskLines, "\n"))
	b.WriteString("\n\n## Blockers / notes\n\n- Add blockers here before sharing this standup.\n")
	path := filepath.Join(root, "standup-"+now.Format("2006-01-02")+".md")
	if err := os.WriteFile(path, []byte(b.String()), 0644); err != nil { fmt.Println("Could not write standup:", err); return }
	fmt.Println(b.String())
	fmt.Println("Saved:", path)
}
func statusMark(status string) string { if strings.EqualFold(status, "COMPLETED") { return "x" }; return " " }
func escapeTable(s string) string { return strings.ReplaceAll(strings.ReplaceAll(s, "|", "\\|"), "\n", " ") }

func handleFocus() {
	minutes := 25
	if len(os.Args) >= 3 {
		if parsed, err := strconv.Atoi(os.Args[2]); err == nil { minutes = parsed } else { fmt.Println("Usage: devpilot focus <mins> [--task <task-id>]"); return }
	}
	if minutes < 1 || minutes > 1440 { fmt.Println("Focus duration must be between 1 and 1440 minutes."); return }
	taskID, projectID := 0, 0
	for i := 3; i < len(os.Args); i++ {
		if os.Args[i] == "--task" && i+1 < len(os.Args) { taskID, _ = strconv.Atoi(os.Args[i+1]); i++ }
	}
	var active struct { ProjectID int `json:"projectId"` }
	if readJSON(filepath.Join(stateDir(), "active-context.json"), &active) == nil { projectID = active.ProjectID }
	start := time.Now()
	taskLabel := "none"
	if taskID > 0 { taskLabel = strconv.Itoa(taskID) }
	fmt.Printf("Focus started for %d minutes. Task: %s. Press Ctrl+C to end early.\n", minutes, taskLabel)
	ticker := time.NewTicker(time.Minute); defer ticker.Stop()
	deadline := start.Add(time.Duration(minutes)*time.Minute)
	for time.Now().Before(deadline) {
		<-ticker.C
		remaining := time.Until(deadline)
		if remaining > 0 { fmt.Printf("\rFocused · %d:%02d remaining", int(remaining.Minutes()), int(remaining.Seconds())%60) }
	}
	fmt.Println("\nFocus session complete.")
	session := FocusSession{ProjectID: projectID, TaskID: taskID, StartedAt: start, EndedAt: time.Now(), PlannedMinutes: minutes, ActiveSeconds: int64(time.Since(start).Seconds())}
	path := filepath.Join(stateDir(), "focus-sessions.json")
	var sessions []FocusSession; _ = readJSON(path, &sessions)
	sessions = append(sessions, session)
	if err := writeJSON(path, sessions); err != nil { fmt.Println("Could not save focus session:", err); return }
	fmt.Printf("Logged %d minutes locally to %s\n", int(session.ActiveSeconds/60), path)
}

func handleMessageDraft() {
	root, err := gitRoot(); if err != nil { fmt.Println("Run this command inside a Git repository:", err); return }
	diff, _ := gitOutput("diff", "--stat", "HEAD")
	untracked, _ := gitOutput("status", "--short")
	commits, _ := gitOutput("log", "-5", "--pretty=format:- %s")
	if diff == "" { diff = "No tracked changes in the working diff." }
	if untracked == "" { untracked = "No uncommitted or untracked files detected." }
	pr := fmt.Sprintf("# Pull Request\n\n## Summary\n- Describe the user-facing change.\n\n## Changes\n```text\n%s\n```\n\n## Validation\n- [ ] Tests/build run locally\n- [ ] Manually verified the affected workflow\n\n## Working tree\n```text\n%s\n```\n", diff, untracked)
	msg := "chore: update development work"
	if commits != "" { first := strings.TrimPrefix(strings.SplitN(commits, "\n", 2)[0], "- "); if first != "" { msg = first } }
	dir := filepath.Join(root, ".devpilot")
	if err := os.MkdirAll(dir, 0700); err != nil { fmt.Println(err); return }
	if err := os.WriteFile(filepath.Join(dir, "pr-draft.md"), []byte(pr), 0600); err != nil { fmt.Println(err); return }
	if err := os.WriteFile(filepath.Join(dir, "message-draft.txt"), []byte(msg+"\n"), 0600); err != nil { fmt.Println(err); return }
	fmt.Println("Generated local drafts (not published):")
	fmt.Println("  .devpilot/pr-draft.md")
	fmt.Println("  .devpilot/message-draft.txt")
	fmt.Println("\nSuggested message:", msg)
}

func queueOfflineRequest(method, path string, body any) error {
	if method != "POST" && method != "PATCH" && method != "PUT" && method != "DELETE" { return fmt.Errorf("backend unavailable and this request cannot be queued safely") }
	var raw json.RawMessage
	if body != nil { data, err := json.Marshal(body); if err != nil { return err }; raw = data }
	file := filepath.Join(stateDir(), "outbox.json")
	var queue []QueuedRequest
	if err := readJSON(file, &queue); err != nil && !errors.Is(err, os.ErrNotExist) { return err }
	queue = append(queue, QueuedRequest{Method: method, Path: path, Body: raw, QueuedAt: time.Now()})
	if err := writeJSON(file, queue); err != nil { return err }
	fmt.Printf("Backend offline: queued %s %s locally. It will retry on the next DevPilot command.\n", method, path)
	return nil
}
func syncOutbox() {
	file := filepath.Join(stateDir(), "outbox.json")
	var queue []QueuedRequest
	if err := readJSON(file, &queue); err != nil || len(queue)==0 { return }
	remaining := make([]QueuedRequest, 0)
	syncingOutbox = true
	defer func() { syncingOutbox = false }()
	for i, item := range queue {
		var body any
		if len(item.Body)>0 { _ = json.Unmarshal(item.Body, &body) }
		if err := request(item.Method, item.Path, body, nil); err != nil {
			remaining = append(remaining, queue[i:]...)
			fmt.Printf("Offline sync paused; %d queued change(s) remain: %v\n", len(remaining), err)
			break
		}
	}
	if len(remaining)==0 { _ = os.Remove(file); fmt.Printf("Synced %d offline change(s).\n", len(queue)); return }
	_ = writeJSON(file, remaining)
}
