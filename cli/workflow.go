package main

import (
	"bufio"
	"fmt"
	"os"
	"os/exec"
	"path/filepath"
	"sort"
	"strconv"
	"strings"
	"time"
)

/* =========================================================
   DEVPILOT WORKFLOW LAYER

   Ideas that make the project -> milestone -> task flow fast:

   1. Active context. `devpilot use` remembers your project (and
      milestone) in .devpilot, so nothing asks for IDs any more.
   2. Names beat numbers. Wherever an ID is accepted you can type
      part of a name, or nothing at all and pick from a menu.
   3. Inline first, prompts second. `devpilot task create "Fix login"
      -p high` needs zero prompts; bare `task create` guides you.
   4. Bulk entry. Type many milestones / tasks, one per line.
   5. Chains. Finishing a task celebrates, offers to close the
      milestone/project, and offers to start what is next.
========================================================= */

/* ---------- argument parsing ---------- */

type wfArgs struct {
	Pos   []string
	Flags map[string]string
	Bools map[string]bool
}

func wfParse(args []string) wfArgs {
	out := wfArgs{Flags: map[string]string{}, Bools: map[string]bool{}}
	valueFlags := map[string]string{
		"-p": "priority", "--priority": "priority",
		"-d": "desc", "--desc": "desc",
		"-m": "milestone", "--milestone": "milestone",
		"--project": "project", "--github": "github", "--xp": "xp",
	}
	boolFlags := map[string]string{
		"-y": "yes", "--yes": "yes", "--ai": "ai", "--manual": "manual",
	}
	for i := 0; i < len(args); i++ {
		a := args[i]
		if strings.HasPrefix(a, "--") && strings.Contains(a, "=") {
			parts := strings.SplitN(a, "=", 2)
			if key, ok := valueFlags[parts[0]]; ok {
				out.Flags[key] = parts[1]
				continue
			}
		}
		if key, ok := valueFlags[a]; ok {
			if i+1 < len(args) {
				out.Flags[key] = args[i+1]
				i++
			}
			continue
		}
		if key, ok := boolFlags[a]; ok {
			out.Bools[key] = true
			continue
		}
		out.Pos = append(out.Pos, a)
	}
	return out
}

func (a wfArgs) text() string { return strings.TrimSpace(strings.Join(a.Pos, " ")) }

func wfParseID(s string) (int, bool) {
	n, err := strconv.Atoi(strings.TrimPrefix(strings.TrimSpace(s), "#"))
	return n, err == nil && n > 0
}
func wfPriority(s, def string) string {
	switch strings.ToLower(strings.TrimSpace(s)) {
	case "":
		return def
	case "h", "high":
		return "HIGH"
	case "m", "med", "medium":
		return "MEDIUM"
	case "l", "low":
		return "LOW"
	}
	return strings.ToUpper(strings.TrimSpace(s))
}

/* ---------- small prompts ---------- */

func wfAsk(reader *bufio.Reader, label, def string) string {
	prompt := label
	if def != "" {
		prompt += " [" + uiTrim(def, 40) + "]"
	}
	value := ask(reader, prompt+": ")
	if value == "" {
		return def
	}
	return value
}

func wfConfirm(reader *bufio.Reader, prompt string, defYes bool) bool {
	hint := "[y/N]"
	if defYes {
		hint = "[Y/n]"
	}
	in := strings.ToLower(ask(reader, prompt+" "+hint+" "))
	if in == "" {
		return defYes
	}
	return in == "y" || in == "yes"
}

// wfMatch returns indexes of names matching q (exact matches win, then substrings).
func wfMatch(names []string, q string) []int {
	q = strings.ToLower(strings.TrimSpace(q))
	if q == "" {
		return nil
	}
	var exact, partial []int
	for i, name := range names {
		lower := strings.ToLower(name)
		if lower == q {
			exact = append(exact, i)
		} else if strings.Contains(lower, q) {
			partial = append(partial, i)
		}
	}
	if len(exact) > 0 {
		return exact
	}
	return partial
}

// wfPick shows a numbered menu and returns the chosen index, or -1 when cancelled.
// The user can type a number, or part of an entry's text.
func wfPick(reader *bufio.Reader, title string, labels []string, def int) int {
	if len(labels) == 0 {
		return -1
	}
	fmt.Println()
	fmt.Println(uiBold(title))
	for i, label := range labels {
		marker := " "
		if i == def {
			marker = uiCyan(">")
		}
		fmt.Printf("  %s %2d) %s\n", marker, i+1, label)
	}
	for attempts := 0; attempts < 5; attempts++ {
		prompt := "Choose"
		if def >= 0 {
			prompt += fmt.Sprintf(" [%d]", def+1)
		}
		in := strings.TrimSpace(ask(reader, prompt+" (q to cancel): "))
		if in == "" && def >= 0 {
			return def
		}
		if strings.EqualFold(in, "q") || in == "0" {
			return -1
		}
		if n, err := strconv.Atoi(in); err == nil && n >= 1 && n <= len(labels) {
			return n - 1
		}
		if m := wfMatch(labels, in); len(m) == 1 {
			return m[0]
		}
		fmt.Println("Type a number from the list, or q to cancel.")
	}
	return -1
}

/* ---------- context (.devpilot) ---------- */

func wfRequireLogin() bool {
	if config.Token != "" {
		return true
	}
	fmt.Println("You're not logged in yet. Run `devpilot login` first.")
	return false
}

func wfSetContext(projectID, milestoneID int) {
	config.ProjectID = projectID
	config.MilestoneID = milestoneID
	if err := saveConfig(); err != nil {
		fmt.Println(uiDim("(could not save context: " + err.Error() + ")"))
	}
}

func wfNormalizeURL(u string) string {
	u = strings.ToLower(strings.TrimSpace(u))
	u = strings.TrimSuffix(u, "/")
	u = strings.TrimSuffix(u, ".git")
	u = strings.TrimPrefix(u, "https://")
	u = strings.TrimPrefix(u, "http://")
	u = strings.TrimPrefix(u, "git@")
	return strings.Replace(u, "github.com:", "github.com/", 1)
}

func wfGitRemote() string {
	out, err := exec.Command("git", "remote", "get-url", "origin").Output()
	if err != nil {
		return ""
	}
	return strings.TrimSpace(string(out))
}

// wfDetectProject matches this folder to a project by git remote, then by folder name.
func wfDetectProject(projects []Project) (Project, bool) {
	if remote := wfNormalizeURL(wfGitRemote()); remote != "" {
		for _, p := range projects {
			if p.GithubURL != "" && wfNormalizeURL(p.GithubURL) == remote {
				return p, true
			}
		}
	}
	if wd, err := os.Getwd(); err == nil {
		base := strings.ToLower(filepath.Base(wd))
		var found []Project
		for _, p := range projects {
			if strings.ToLower(p.Name) == base {
				found = append(found, p)
			}
		}
		if len(found) == 1 {
			return found[0], true
		}
	}
	return Project{}, false
}

/* ---------- data access ---------- */

func wfProjects() ([]Project, error) {
	var projects []Project
	err := request("GET", "/projects", nil, &projects)
	return projects, err
}

func wfSortByOrder(ms []Milestone) {
	sort.SliceStable(ms, func(i, j int) bool { return ms[i].Order < ms[j].Order })
	for i := range ms {
		tasks := ms[i].Tasks
		sort.SliceStable(tasks, func(a, b int) bool { return tasks[a].Order < tasks[b].Order })
	}
}

// wfTree loads a project's milestones with their tasks, ordered.
func wfTree(projectID int) ([]Milestone, error) {
	var ms []Milestone
	if err := request("GET", "/projects/"+strconv.Itoa(projectID)+"/milestones", nil, &ms); err != nil {
		return nil, err
	}
	for i := range ms {
		if ms[i].Tasks == nil {
			var tasks []Task
			if err := request("GET", "/milestones/"+strconv.Itoa(ms[i].ID)+"/tasks", nil, &tasks); err == nil {
				ms[i].Tasks = tasks
			}
		}
	}
	wfSortByOrder(ms)
	return ms, nil
}

func wfCount(m Milestone) (done, total int) {
	for _, t := range m.Tasks {
		total++
		if t.Status == "COMPLETED" {
			done++
		}
	}
	return
}

func wfTotals(ms []Milestone) (done, total int) {
	for _, m := range ms {
		d, t := wfCount(m)
		done += d
		total += t
	}
	return
}

type wfTaskRef struct {
	Task      Task
	Milestone Milestone
}

func wfFlatTasks(ms []Milestone) []wfTaskRef {
	var out []wfTaskRef
	for _, m := range ms {
		for _, t := range m.Tasks {
			out = append(out, wfTaskRef{Task: t, Milestone: m})
		}
	}
	return out
}

/* ---------- creating things ---------- */

func wfNewProject(name, desc, priority, github string, xp int) (Project, bool) {
	body := map[string]any{"name": name, "priority": priority}
	if desc != "" {
		body["description"] = desc
	}
	if github != "" {
		body["githubUrl"] = github
	}
	if xp > 0 {
		body["xpReward"] = xp
	}
	var p Project
	if err := request("POST", "/projects", body, &p); err != nil {
		fmt.Println("Error:", err)
		return p, false
	}
	return p, true
}

func wfNewMilestone(p Project, title, desc string, order, xp int) (Milestone, bool) {
	body := map[string]any{"title": title, "order": order}
	if desc != "" {
		body["description"] = desc
	}
	if xp > 0 {
		body["xpReward"] = xp
	}
	var m Milestone
	if err := request("POST", "/projects/"+strconv.Itoa(p.ID)+"/milestones", body, &m); err != nil {
		fmt.Println("Error:", err)
		return m, false
	}
	return m, true
}

func wfNewTask(m Milestone, title, desc, priority string, order int) (Task, bool) {
	body := map[string]any{"title": title, "priority": priority, "order": order}
	if desc != "" {
		body["description"] = desc
	}
	var t Task
	if err := request("POST", "/milestones/"+strconv.Itoa(m.ID)+"/tasks", body, &t); err != nil {
		fmt.Println("Error:", err)
		return t, false
	}
	return t, true
}

// wfTaskLine parses "Write tests !high" into a title and priority.
func wfTaskLine(line string) (string, string) {
	fields := strings.Fields(line)
	priority := "MEDIUM"
	if n := len(fields); n > 1 && strings.HasPrefix(fields[n-1], "!") {
		switch strings.ToLower(fields[n-1][1:]) {
		case "high", "h":
			priority = "HIGH"
			fields = fields[:n-1]
		case "medium", "med", "m":
			fields = fields[:n-1]
		case "low", "l":
			priority = "LOW"
			fields = fields[:n-1]
		}
	}
	return strings.Join(fields, " "), priority
}

// wfTaskLoop reads tasks one per line (blank line to finish) and creates them as you type.
func wfTaskLoop(reader *bufio.Reader, m Milestone, existing int) int {
	fmt.Println()
	fmt.Printf("  Tasks for %s\n", uiBold("\""+m.Title+"\""))
	fmt.Println(uiDim("  One per line. Add !high or !low at the end. Blank line = done."))
	created := 0
	order := existing
	for {
		line := ask(reader, "    task> ")
		if line == "" {
			break
		}
		title, priority := wfTaskLine(line)
		if title == "" {
			continue
		}
		order++
		t, ok := wfNewTask(m, title, "", priority, order)
		if !ok {
			break
		}
		created++
		xp := ""
		if t.XPReward > 0 {
			xp = uiYellow(fmt.Sprintf("  +%d XP", t.XPReward))
		}
		fmt.Printf("      %s %s  %s%s\n", uiGreen("+"), t.Title, uiPriorityTag(priority), xp)
	}
	return created
}

// wfMilestoneLoop reads milestones one per line and walks into tasks for each.
func wfMilestoneLoop(reader *bufio.Reader, p Project, existing int) {
	fmt.Println()
	fmt.Println(uiDim("  Type a milestone, then its tasks. Blank milestone = finish."))
	order := existing
	for {
		fmt.Println()
		title := ask(reader, "  milestone> ")
		if title == "" {
			return
		}
		order++
		m, ok := wfNewMilestone(p, title, "", order, 0)
		if !ok {
			return
		}
		fmt.Printf("  %s milestone %d: %s\n", uiGreen("+"), order, uiBold(m.Title))
		wfSetContext(p.ID, m.ID)
		wfTaskLoop(reader, m, 0)
	}
}

func wfAfterProjectCreated(reader *bufio.Reader, p Project, a wfArgs) {
	wfSetContext(p.ID, 0)
	fmt.Println()
	uiBox(
		"Project created: "+p.Name,
		fmt.Sprintf("#%d   %s   now your active project here", p.ID, p.Priority),
	)
	choice := 0
	switch {
	case a.Bools["ai"]:
		choice = 1
	case a.Bools["manual"]:
		choice = 2
	case a.Bools["yes"]:
		choice = 3
	default:
		choice = 1 + wfPick(reader, "How do you want to build the plan?", []string{
			"AI plan     - generate milestones and tasks for me",
			"By hand     - type milestones and tasks quickly",
			"Later       - I'll plan it another time",
		}, 1)
	}
	switch choice {
	case 1:
		wfAIPlanInto(reader, p, p.Description)
	case 2:
		wfMilestoneLoop(reader, p, 0)
		wfNextSteps()
	default:
		fmt.Println()
		fmt.Println("  Next: " + uiCyan("devpilot milestone create") + "  or  " + uiCyan("devpilot ai plan"))
	}
}

func wfNextSteps() {
	fmt.Println()
	fmt.Println("  Ready. See the board with " + uiCyan("devpilot status") + ", then run " + uiCyan("devpilot next") + " to start.")
}

/* ---------- project create ---------- */

func wfProjectCreate(reader *bufio.Reader, args []string) {
	if !wfRequireLogin() {
		return
	}
	a := wfParse(args)
	name := a.text()
	interactive := name == ""

	uiHeader("new project")
	if interactive {
		name = wfAsk(reader, "Project name", "")
		if name == "" {
			fmt.Println("Cancelled: a project needs a name.")
			return
		}
	}
	desc := a.Flags["desc"]
	priority := wfPriority(a.Flags["priority"], "MEDIUM")
	github := a.Flags["github"]
	if interactive {
		if desc == "" {
			desc = wfAsk(reader, "What is it about? (optional)", "")
		}
		if a.Flags["priority"] == "" {
			priority = wfPriority(wfAsk(reader, "Priority (low / medium / high)", "medium"), "MEDIUM")
		}
		if github == "" {
			github = wfAsk(reader, "GitHub URL (Enter to skip)", wfGitRemote())
		}
	}
	xp, _ := strconv.Atoi(a.Flags["xp"])

	p, ok := wfNewProject(name, desc, priority, github, xp)
	if !ok {
		return
	}
	wfAfterProjectCreated(reader, p, a)
}

/* ---------- AI plan ---------- */

func wfAIPlanInto(reader *bufio.Reader, p Project, goal string) {
	if goal == "" {
		goal = ask(reader, "Describe what you're building (stack, goals, must-haves): ")
	}
	if goal == "" {
		goal = p.Name
	}
	priority := p.Priority
	if priority == "" {
		priority = "MEDIUM"
	}
	fmt.Println(uiDim("  Planning... (the first request can take a while if the server is asleep)"))

	var plan AIPlan
	if err := request("POST", "/ai/projects/generate", map[string]string{
		"name": p.Name, "goal": goal, "priority": priority,
	}, &plan); err != nil {
		fmt.Println("AI plan failed:", err)
		fmt.Println("You can still plan by hand with " + uiCyan("devpilot milestone create"))
		return
	}

	if p.Description == "" && plan.Description != "" {
		if err := request("PATCH", "/projects/"+strconv.Itoa(p.ID), map[string]any{"description": plan.Description}, nil); err == nil {
			fmt.Print("  " + uiBold("About: "))
			uiType(plan.Description, 6*time.Millisecond)
		}
	}

	first := 0
	taskCount := 0
	for i, pm := range plan.Milestones {
		m, ok := wfNewMilestone(p, pm.Title, pm.Description, i+1, 0)
		if !ok {
			continue
		}
		if first == 0 {
			first = m.ID
		}
		fmt.Println()
		uiType(fmt.Sprintf("  [M%d] %s", i+1, pm.Title), 6*time.Millisecond)
		for j, pt := range pm.Tasks {
			t, ok := wfNewTask(m, pt.Title, pt.Description, wfPriority(pt.Priority, "MEDIUM"), j+1)
			if !ok {
				continue
			}
			taskCount++
			uiType(fmt.Sprintf("       - %s  [%s]", t.Title, wfPriority(pt.Priority, "MEDIUM")), 4*time.Millisecond)
		}
	}
	if first > 0 {
		wfSetContext(p.ID, first)
	}
	fmt.Println()
	uiBox(fmt.Sprintf("Plan ready: %d milestones, %d tasks", len(plan.Milestones), taskCount))
	wfNextSteps()
}

func wfAIPlanCommand(reader *bufio.Reader, args []string) {
	if !wfRequireLogin() {
		return
	}
	a := wfParse(args)
	uiHeader("ai plan")
	name := a.text()
	if name == "" {
		name = wfAsk(reader, "Project name", "")
	}
	if name == "" {
		fmt.Println("Cancelled: a project needs a name.")
		return
	}
	goal := a.Flags["desc"]
	if goal == "" {
		goal = ask(reader, "What are you building? (stack, goals, requirements): ")
	}
	priority := wfPriority(a.Flags["priority"], "")
	if priority == "" {
		priority = wfPriority(wfAsk(reader, "Priority (low / medium / high)", "medium"), "MEDIUM")
	}
	p, ok := wfNewProject(name, "", priority, a.Flags["github"], 0)
	if !ok {
		return
	}
	wfSetContext(p.ID, 0)
	fmt.Printf("  %s project #%d created\n", uiGreen("+"), p.ID)
	wfAIPlanInto(reader, p, goal)
}

/* ---------- resolving projects / milestones / tasks ---------- */

func wfPickProject(reader *bufio.Reader, projects []Project) (Project, bool) {
	if len(projects) == 0 {
		fmt.Println("No projects yet - let's make your first one.")
		wfProjectCreate(reader, nil)
		return Project{}, false
	}
	labels := make([]string, 0, len(projects)+1)
	def := 0
	for i, p := range projects {
		tag := ""
		if p.ID == config.ProjectID {
			tag = uiCyan("  (active)")
			def = i
		}
		labels = append(labels, fmt.Sprintf("%-28s %-12s %s%s", uiTrim(p.Name, 28), p.Status, p.Priority, tag))
	}
	labels = append(labels, "+ New project")
	idx := wfPick(reader, "Which project?", labels, def)
	switch {
	case idx < 0:
		return Project{}, false
	case idx == len(projects):
		wfProjectCreate(reader, nil)
		return Project{}, false
	}
	return projects[idx], true
}

// wfActiveProject returns the project saved in .devpilot, auto-detecting or asking when needed.
func wfActiveProject(reader *bufio.Reader) (Project, bool) {
	if !wfRequireLogin() {
		return Project{}, false
	}
	if config.ProjectID > 0 {
		var p Project
		err := request("GET", "/projects/"+strconv.Itoa(config.ProjectID), nil, &p)
		if err == nil {
			return p, true
		}
		if !strings.Contains(err.Error(), "404") {
			fmt.Println("Error:", err)
			return Project{}, false
		}
		fmt.Println("The saved project no longer exists. Pick another one.")
		wfSetContext(0, 0)
	}
	projects, err := wfProjects()
	if err != nil {
		fmt.Println("Error:", err)
		return Project{}, false
	}
	if p, ok := wfDetectProject(projects); ok {
		fmt.Printf("Using project %s (matched this folder).\n", uiBold(p.Name))
		wfSetContext(p.ID, 0)
		return p, true
	}
	p, ok := wfPickProject(reader, projects)
	if ok {
		wfSetContext(p.ID, 0)
	}
	return p, ok
}

// wfProjectFromArg resolves an optional id or name; no argument means the active project.
func wfProjectFromArg(reader *bufio.Reader, arg string) (Project, bool) {
	arg = strings.TrimSpace(arg)
	if arg == "" {
		return wfActiveProject(reader)
	}
	if !wfRequireLogin() {
		return Project{}, false
	}
	if n, ok := wfParseID(arg); ok {
		var p Project
		if err := request("GET", "/projects/"+strconv.Itoa(n), nil, &p); err != nil {
			fmt.Println("Error:", err)
			return p, false
		}
		return p, true
	}
	projects, err := wfProjects()
	if err != nil {
		fmt.Println("Error:", err)
		return Project{}, false
	}
	names := make([]string, len(projects))
	for i, p := range projects {
		names[i] = p.Name
	}
	matches := wfMatch(names, arg)
	switch len(matches) {
	case 0:
		fmt.Printf("No project matches %q. Run `devpilot project list`.\n", arg)
		return Project{}, false
	case 1:
		return projects[matches[0]], true
	}
	labels := make([]string, len(matches))
	for i, idx := range matches {
		labels[i] = fmt.Sprintf("%-28s %s", projects[idx].Name, projects[idx].Status)
	}
	choice := wfPick(reader, "Which one did you mean?", labels, 0)
	if choice < 0 {
		return Project{}, false
	}
	return projects[matches[choice]], true
}

func wfMilestoneLabel(m Milestone) string {
	d, t := wfCount(m)
	return fmt.Sprintf("%-26s %s %d/%d", uiTrim(m.Title, 26), uiBar(d, t, 10), d, t)
}

// wfActiveMilestone picks the milestone tasks should go to (saved, only open one, or asked).
func wfActiveMilestone(reader *bufio.Reader, p Project, ms []Milestone) (Milestone, bool) {
	if len(ms) == 0 {
		fmt.Println("This project has no milestones yet.")
		if !wfConfirm(reader, "Create one now?", true) {
			return Milestone{}, false
		}
		title := wfAsk(reader, "Milestone title", "")
		if title == "" {
			return Milestone{}, false
		}
		m, ok := wfNewMilestone(p, title, "", 1, 0)
		if ok {
			wfSetContext(p.ID, m.ID)
		}
		return m, ok
	}
	if config.MilestoneID > 0 {
		for _, m := range ms {
			if m.ID == config.MilestoneID && m.Status != "COMPLETED" {
				return m, true
			}
		}
	}
	var open []Milestone
	for _, m := range ms {
		if m.Status != "COMPLETED" {
			open = append(open, m)
		}
	}
	if len(ms) == 1 || len(open) == 1 {
		m := ms[0]
		if len(open) == 1 {
			m = open[0]
		}
		wfSetContext(p.ID, m.ID)
		return m, true
	}
	labels := make([]string, 0, len(ms)+1)
	def := 0
	for i, m := range ms {
		labels = append(labels, uiStatusMark(m.Status)+" "+wfMilestoneLabel(m))
		if def == 0 && m.Status == "IN_PROGRESS" {
			def = i
		}
	}
	labels = append(labels, "+ New milestone")
	idx := wfPick(reader, "Which milestone?", labels, def)
	switch {
	case idx < 0:
		return Milestone{}, false
	case idx == len(ms):
		title := wfAsk(reader, "Milestone title", "")
		if title == "" {
			return Milestone{}, false
		}
		m, ok := wfNewMilestone(p, title, "", len(ms)+1, 0)
		if ok {
			wfSetContext(p.ID, m.ID)
		}
		return m, ok
	}
	wfSetContext(p.ID, ms[idx].ID)
	return ms[idx], true
}

// wfResolveMilestone handles id / name / menu selection among a project's milestones.
func wfResolveMilestone(reader *bufio.Reader, p Project, ms []Milestone, arg string) (Milestone, bool) {
	arg = strings.TrimSpace(arg)
	if arg == "" {
		return wfActiveMilestone(reader, p, ms)
	}
	if n, ok := wfParseID(arg); ok {
		for _, m := range ms {
			if m.ID == n {
				return m, true
			}
		}
		var m Milestone
		if err := request("GET", "/milestones/"+strconv.Itoa(n), nil, &m); err != nil {
			fmt.Println("Error:", err)
			return m, false
		}
		return m, true
	}
	titles := make([]string, len(ms))
	for i, m := range ms {
		titles[i] = m.Title
	}
	matches := wfMatch(titles, arg)
	switch len(matches) {
	case 0:
		fmt.Printf("No milestone matches %q.\n", arg)
		return Milestone{}, false
	case 1:
		return ms[matches[0]], true
	}
	labels := make([]string, len(matches))
	for i, idx := range matches {
		labels[i] = wfMilestoneLabel(ms[idx])
	}
	choice := wfPick(reader, "Which one did you mean?", labels, 0)
	if choice < 0 {
		return Milestone{}, false
	}
	return ms[matches[choice]], true
}

func wfTaskLabel(r wfTaskRef) string {
	label := fmt.Sprintf("%s %-34s %s", uiStatusMark(r.Task.Status), uiTrim(r.Task.Title, 34), uiPriorityTag(r.Task.Priority))
	if r.Milestone.Title != "" {
		label += uiDim("  in " + uiTrim(r.Milestone.Title, 24))
	}
	return label
}

func wfPickTaskRef(reader *bufio.Reader, title string, cands []wfTaskRef) (wfTaskRef, bool) {
	labels := make([]string, len(cands))
	for i, c := range cands {
		labels[i] = wfTaskLabel(c)
	}
	idx := wfPick(reader, title, labels, 0)
	if idx < 0 {
		return wfTaskRef{}, false
	}
	return cands[idx], true
}

// wfResolveTask handles id / name / menu selection. want filters the menu when no argument is given.
func wfResolveTask(reader *bufio.Reader, ms []Milestone, arg, pickTitle string, want func(Task) bool) (wfTaskRef, bool) {
	all := wfFlatTasks(ms)
	arg = strings.TrimSpace(arg)
	if arg != "" {
		if n, ok := wfParseID(arg); ok {
			for _, r := range all {
				if r.Task.ID == n {
					return r, true
				}
			}
			var t Task
			if err := request("GET", "/tasks/"+strconv.Itoa(n), nil, &t); err != nil {
				fmt.Println("Error:", err)
				return wfTaskRef{}, false
			}
			return wfTaskRef{Task: t}, true
		}
		titles := make([]string, len(all))
		for i, r := range all {
			titles[i] = r.Task.Title
		}
		matches := wfMatch(titles, arg)
		switch len(matches) {
		case 0:
			fmt.Printf("No task matches %q.\n", arg)
			return wfTaskRef{}, false
		case 1:
			return all[matches[0]], true
		}
		cands := make([]wfTaskRef, len(matches))
		for i, idx := range matches {
			cands[i] = all[idx]
		}
		return wfPickTaskRef(reader, "Which one did you mean?", cands)
	}

	var cands []wfTaskRef
	for _, r := range all {
		if want == nil || want(r.Task) {
			cands = append(cands, r)
		}
	}
	if len(cands) == 0 {
		fmt.Println("No matching tasks.")
		return wfTaskRef{}, false
	}
	// Tasks from the active milestone float to the top.
	sort.SliceStable(cands, func(i, j int) bool {
		return cands[i].Milestone.ID == config.MilestoneID && cands[j].Milestone.ID != config.MilestoneID
	})
	if len(cands) == 1 {
		return cands[0], true
	}
	return wfPickTaskRef(reader, pickTitle, cands)
}

func wfIsTodo(t Task) bool       { return t.Status == "TODO" || t.Status == "" }
func wfIsInProgress(t Task) bool { return t.Status == "IN_PROGRESS" }
func wfIsOpen(t Task) bool       { return t.Status != "COMPLETED" }

/* ---------- milestone create ---------- */

func wfMilestoneCreate(reader *bufio.Reader, args []string) {
	a := wfParse(args)
	p, ok := wfProjectFromArg(reader, a.Flags["project"])
	if !ok {
		return
	}
	existing, err := wfTree(p.ID)
	if err != nil {
		fmt.Println("Error:", err)
		return
	}
	uiHeader("new milestone")
	fmt.Printf("  Project: %s\n", uiBold(p.Name))

	title := a.text()
	inline := title != ""
	if !inline {
		title = wfAsk(reader, "Milestone title", "")
		if title == "" {
			fmt.Println("Cancelled: a milestone needs a title.")
			return
		}
	}
	xp, _ := strconv.Atoi(a.Flags["xp"])
	m, ok := wfNewMilestone(p, title, a.Flags["desc"], len(existing)+1, xp)
	if !ok {
		return
	}
	wfSetContext(p.ID, m.ID)
	fmt.Printf("  %s milestone %d: %s  %s\n", uiGreen("+"), len(existing)+1, uiBold(m.Title), uiDim("(now active)"))

	if a.Bools["yes"] {
		return
	}
	if wfConfirm(reader, "Add tasks to it now?", true) {
		wfTaskLoop(reader, m, 0)
	}
	if !inline || wfConfirm(reader, "Add another milestone?", false) {
		wfMilestoneLoop(reader, p, len(existing)+1)
	}
	wfNextSteps()
}

/* ---------- task create ---------- */

func wfTaskCreate(reader *bufio.Reader, args []string) {
	a := wfParse(args)
	p, ok := wfProjectFromArg(reader, a.Flags["project"])
	if !ok {
		return
	}
	ms, err := wfTree(p.ID)
	if err != nil {
		fmt.Println("Error:", err)
		return
	}
	var m Milestone
	if flag := a.Flags["milestone"]; flag != "" {
		m, ok = wfResolveMilestone(reader, p, ms, flag)
	} else {
		m, ok = wfActiveMilestone(reader, p, ms)
	}
	if !ok {
		return
	}
	existing := 0
	for _, cur := range ms {
		if cur.ID == m.ID {
			existing = len(cur.Tasks)
		}
	}

	title := a.text()
	inline := title != ""
	priority := wfPriority(a.Flags["priority"], "MEDIUM")
	if !inline {
		uiHeader("new task")
		fmt.Printf("  %s  >  %s\n", p.Name, uiBold(m.Title))
		title = wfAsk(reader, "Task title", "")
		if title == "" {
			fmt.Println("Cancelled: a task needs a title.")
			return
		}
		if a.Flags["priority"] == "" {
			priority = wfPriority(wfAsk(reader, "Priority (low / medium / high)", "medium"), "MEDIUM")
		}
	}
	t, ok := wfNewTask(m, title, a.Flags["desc"], priority, existing+1)
	if !ok {
		return
	}
	xp := ""
	if t.XPReward > 0 {
		xp = uiYellow(fmt.Sprintf("  +%d XP", t.XPReward))
	}
	fmt.Printf("  %s %s  %s%s  %s\n", uiGreen("+"), uiBold(t.Title), uiPriorityTag(priority), xp, uiDim("in "+m.Title))
	wfSetContext(p.ID, m.ID)

	if !inline && !a.Bools["yes"] {
		wfTaskLoop(reader, m, existing+1)
		wfNextSteps()
	}
}

/* ---------- start / finish ---------- */

func wfPatchStatus(path, status string, out any) error {
	return request("PATCH", path, map[string]any{"status": status}, out)
}

func wfStartTask(p Project, ref wfTaskRef) bool {
	var t Task
	if err := wfPatchStatus("/tasks/"+strconv.Itoa(ref.Task.ID), "IN_PROGRESS", &t); err != nil {
		fmt.Println("Error:", err)
		return false
	}
	if ref.Milestone.ID > 0 {
		if ref.Milestone.Status != "IN_PROGRESS" && ref.Milestone.Status != "COMPLETED" {
			_ = wfPatchStatus("/milestones/"+strconv.Itoa(ref.Milestone.ID), "IN_PROGRESS", nil)
		}
		wfSetContext(p.ID, ref.Milestone.ID)
	}
	if p.Status != "IN_PROGRESS" && p.Status != "COMPLETED" && p.ID > 0 {
		_ = wfPatchStatus("/projects/"+strconv.Itoa(p.ID), "IN_PROGRESS", nil)
	}
	fmt.Println()
	fmt.Printf("  %s Started: %s\n", uiYellow(">>"), uiBold(ref.Task.Title))
	if ref.Milestone.Title != "" {
		fmt.Printf("     %s\n", uiDim("in "+ref.Milestone.Title))
	}
	fmt.Println("     Done? Run " + uiCyan("devpilot task finish"))
	return true
}

func wfTaskStart(reader *bufio.Reader, args []string) {
	a := wfParse(args)
	p, ok := wfProjectFromArg(reader, a.Flags["project"])
	if !ok {
		return
	}
	ms, err := wfTree(p.ID)
	if err != nil {
		fmt.Println("Error:", err)
		return
	}
	ref, ok := wfResolveTask(reader, ms, a.text(), "Start which task?", wfIsTodo)
	if !ok {
		return
	}
	wfStartTask(p, ref)
}

func wfTaskFinish(reader *bufio.Reader, args []string) {
	a := wfParse(args)
	p, ok := wfProjectFromArg(reader, a.Flags["project"])
	if !ok {
		return
	}
	ms, err := wfTree(p.ID)
	if err != nil {
		fmt.Println("Error:", err)
		return
	}
	want, title := wfIsInProgress, "Finish which task?"
	hasActive := false
	for _, r := range wfFlatTasks(ms) {
		if wfIsInProgress(r.Task) {
			hasActive = true
			break
		}
	}
	if !hasActive {
		want, title = wfIsOpen, "Nothing is in progress. Finish which task?"
	}
	ref, ok := wfResolveTask(reader, ms, a.text(), title, want)
	if !ok {
		return
	}
	wfFinishTask(reader, p, ref)
}

// wfFinishTask completes a task, then walks the user up the chain: milestone, project, next task.
func wfFinishTask(reader *bufio.Reader, p Project, ref wfTaskRef) {
	var t Task
	if err := wfPatchStatus("/tasks/"+strconv.Itoa(ref.Task.ID), "COMPLETED", &t); err != nil {
		fmt.Println("Error:", err)
		return
	}
	xp := t.XPReward
	if xp == 0 {
		xp = ref.Task.XPReward
	}
	title := t.Title
	if title == "" {
		title = ref.Task.Title
	}
	uiTaskDone(title, xp)

	ms, err := wfTree(p.ID)
	if err != nil {
		return
	}
	var current *Milestone
	for i := range ms {
		if ms[i].ID == ref.Milestone.ID {
			current = &ms[i]
		}
	}
	if current != nil {
		d, total := wfCount(*current)
		fmt.Printf("  %s  %s %d/%d\n", uiBold(uiTrim(current.Title, 30)), uiBar(d, total, 20), d, total)
		if total > 0 && d == total {
			uiMilestoneDone(current.Title)
			if current.Status != "COMPLETED" {
				if wfConfirm(reader, "Mark the milestone complete?", true) {
					if err := wfPatchStatus("/milestones/"+strconv.Itoa(current.ID), "COMPLETED", nil); err != nil {
						fmt.Println("Error:", err)
					} else {
						current.Status = "COMPLETED"
					}
				}
			}
		}
	}

	allDone := len(ms) > 0
	for _, m := range ms {
		d, total := wfCount(m)
		if total == 0 || d != total {
			allDone = false
		}
	}
	if allDone {
		uiProjectDone(p.Name)
		if p.Status != "COMPLETED" && wfConfirm(reader, "Mark the whole project complete?", true) {
			if err := wfPatchStatus("/projects/"+strconv.Itoa(p.ID), "COMPLETED", nil); err != nil {
				fmt.Println("Error:", err)
			}
		}
		return
	}

	for _, r := range wfFlatTasks(ms) {
		if wfIsTodo(r.Task) {
			fmt.Println()
			fmt.Printf("  Up next: %s  %s\n", uiBold(r.Task.Title), uiDim("in "+r.Milestone.Title))
			if wfConfirm(reader, "Start it now?", true) {
				wfStartTask(p, r)
			}
			return
		}
	}
}

func wfNext(reader *bufio.Reader, args []string) {
	a := wfParse(args)
	p, ok := wfProjectFromArg(reader, firstNonEmpty(a.Flags["project"], a.text()))
	if !ok {
		return
	}
	ms, err := wfTree(p.ID)
	if err != nil {
		fmt.Println("Error:", err)
		return
	}
	all := wfFlatTasks(ms)
	for _, r := range all {
		if wfIsInProgress(r.Task) {
			fmt.Println()
			uiBox("IN PROGRESS", r.Task.Title, wfTaskMeta(r))
			fmt.Println("  Finish it with " + uiCyan("devpilot task finish"))
			return
		}
	}
	for _, r := range all {
		if wfIsTodo(r.Task) {
			fmt.Println()
			uiBox("NEXT UP", r.Task.Title, wfTaskMeta(r))
			if wfConfirm(reader, "Start it now?", true) {
				wfStartTask(p, r)
			}
			return
		}
	}
	if len(all) == 0 {
		fmt.Println("No tasks yet. Add some with " + uiCyan("devpilot task create"))
		return
	}
	uiProjectDone(p.Name)
}

func firstNonEmpty(values ...string) string {
	for _, v := range values {
		if strings.TrimSpace(v) != "" {
			return v
		}
	}
	return ""
}

func wfTaskMeta(r wfTaskRef) string {
	parts := []string{}
	if r.Milestone.Title != "" {
		parts = append(parts, r.Milestone.Title)
	}
	if r.Task.Priority != "" {
		parts = append(parts, r.Task.Priority)
	}
	if r.Task.XPReward > 0 {
		parts = append(parts, fmt.Sprintf("+%d XP", r.Task.XPReward))
	}
	return strings.Join(parts, "  |  ")
}

/* ---------- milestone / project status changes ---------- */

func wfMilestoneStatus(reader *bufio.Reader, args []string, status string) {
	a := wfParse(args)
	p, ok := wfProjectFromArg(reader, a.Flags["project"])
	if !ok {
		return
	}
	ms, err := wfTree(p.ID)
	if err != nil {
		fmt.Println("Error:", err)
		return
	}
	m, ok := wfResolveMilestone(reader, p, ms, a.text())
	if !ok {
		return
	}
	if status == "COMPLETED" {
		var open []Task
		for _, t := range m.Tasks {
			if wfIsOpen(t) {
				open = append(open, t)
			}
		}
		if len(open) > 0 {
			fmt.Printf("  %d task(s) are still open in %s.\n", len(open), uiBold(m.Title))
			if !wfConfirm(reader, "Complete them too?", false) {
				fmt.Println("Okay - finish the tasks first with `devpilot task finish`.")
				return
			}
			for _, t := range open {
				if err := wfPatchStatus("/tasks/"+strconv.Itoa(t.ID), "COMPLETED", nil); err != nil {
					fmt.Println("Error:", err)
					return
				}
			}
		}
	}
	var out Milestone
	if err := wfPatchStatus("/milestones/"+strconv.Itoa(m.ID), status, &out); err != nil {
		fmt.Println("Error:", err)
		return
	}
	if status == "COMPLETED" {
		uiMilestoneDone(m.Title)
		return
	}
	wfSetContext(p.ID, m.ID)
	fmt.Printf("  %s Milestone %s is now %s %s\n", uiYellow(">>"), uiBold(m.Title), status, uiDim("(active)"))
}

func wfProjectStatus(reader *bufio.Reader, args []string, status string) {
	a := wfParse(args)
	p, ok := wfProjectFromArg(reader, a.text())
	if !ok {
		return
	}
	if status == "COMPLETED" {
		ms, err := wfTree(p.ID)
		if err == nil {
			open := 0
			for _, m := range ms {
				if m.Status != "COMPLETED" {
					open++
				}
			}
			if open > 0 && !wfConfirm(reader, fmt.Sprintf("%d milestone(s) are still open. Finish the project anyway?", open), false) {
				fmt.Println("Okay - nothing changed.")
				return
			}
		}
	}
	var out Project
	if err := wfPatchStatus("/projects/"+strconv.Itoa(p.ID), status, &out); err != nil {
		fmt.Println("Error:", err)
		return
	}
	if status == "COMPLETED" {
		uiProjectDone(p.Name)
		return
	}
	wfSetContext(p.ID, config.MilestoneID)
	uiRocket("Project " + p.Name + " is live")
}

/* ---------- views ---------- */

func wfDashboard(p Project, ms []Milestone) {
	done, total := wfTotals(ms)
	all := wfFlatTasks(ms)
	var active, next *wfTaskRef
	for i := range all {
		if wfIsInProgress(all[i].Task) && active == nil {
			active = &all[i]
		}
		if wfIsTodo(all[i].Task) && next == nil {
			next = &all[i]
		}
	}

	uiBanner()
	uiBox("COMMAND CENTER", fmt.Sprintf("%s  #%d  %s  %s", uiTrim(p.Name, 28), p.ID, p.Status, uiPriorityTag(p.Priority)))
	fmt.Printf("  MILESTONE PROGRESS  %s  %d/%d milestones\n", uiBar(wfCompletedMilestones(ms), len(ms), 20), wfCompletedMilestones(ms), len(ms))
	fmt.Printf("  TASK PROGRESS       %s  %d/%d tasks\n", uiBar(done, total, 20), done, total)

	fmt.Println()
	fmt.Println("  " + uiBold("CURRENT FOCUS"))
	switch {
	case active != nil:
		fmt.Printf("  %s %s\n", uiYellow("▶"), uiBold(active.Task.Title))
		fmt.Printf("    %s  ·  %s\n", uiDim(active.Milestone.Title), uiPriorityTag(active.Task.Priority))
	case next != nil:
		fmt.Printf("  %s Nothing in progress yet.\n", uiDim("○"))
		fmt.Printf("    Suggested: %s\n", uiBold(next.Task.Title))
		fmt.Printf("    %s\n", uiDim("Milestone: "+next.Milestone.Title))
	default:
		fmt.Printf("  %s No open tasks found.\n", uiGreen("✓"))
	}

	fmt.Println()
	fmt.Println("  " + uiBold("MILESTONE ROADMAP"))
	if len(ms) == 0 {
		fmt.Println("    No milestones yet. Start with " + uiCyan("devpilot milestone create"))
	} else {
		for i, m := range ms {
			d, t := wfCount(m)
			activeMark := ""
			if m.ID == config.MilestoneID { activeMark = uiCyan("  ◀ active") }
			fmt.Printf("  %s %d. %s%s\n", uiStatusMark(m.Status), i+1, uiTrim(m.Title, 34), activeMark)
			fmt.Printf("      %s  %d/%d tasks\n", uiBar(d, t, 18), d, t)
		}
	}

	fmt.Println()
	fmt.Println("  " + uiBold("GIT SNAPSHOT"))
	branch, status, stat := wfGitSnapshot()
	if branch == "" {
		fmt.Println("    " + uiDim("Not inside a Git repository (or Git is unavailable)."))
	} else {
		fmt.Printf("    Branch   %s\n", uiCyan(branch))
		if strings.TrimSpace(status) == "" {
			fmt.Printf("    Working tree %s\n", uiGreen("clean"))
		} else {
			lines := strings.Split(strings.TrimSpace(status), "\n")
			fmt.Printf("    Working tree %s (%d changed path(s))\n", uiYellow("dirty"), len(lines))
			for i, line := range lines {
				if i >= 4 { fmt.Printf("      %s\n", uiDim(fmt.Sprintf("... and %d more", len(lines)-i))); break }
				fmt.Printf("      %s\n", uiDim(line))
			}
		}
		if strings.TrimSpace(stat) != "" { fmt.Printf("    Diff     %s\n", uiDim(strings.TrimSpace(stat))) }
	}

	fmt.Println()
	fmt.Println("  " + uiBold("ONE NEXT ACTION"))
	switch {
	case active != nil:
		fmt.Println("    " + uiCyan("devpilot task finish") + "  — complete the task you're working on")
	case next != nil:
		fmt.Printf("    %s %q\n", uiCyan("devpilot task start"), next.Task.Title)
	case len(ms) == 0:
		fmt.Println("    " + uiCyan("devpilot milestone create") + "  — map out the first milestone")
	default:
		fmt.Println("    " + uiGreen("All tasks complete. Ship it!"))
		fmt.Println("    " + uiCyan("devpilot project finish"))
	}
	fmt.Println()
	fmt.Println(uiDim("  Shortcuts: devpilot next  ·  devpilot task list  ·  devpilot wip"))
}

func wfCompletedMilestones(ms []Milestone) int {
	n := 0
	for _, m := range ms { if strings.EqualFold(m.Status, "COMPLETED") { n++ } }
	return n
}

func wfGitSnapshot() (branch, status, stat string) {
	if out, err := exec.Command("git", "branch", "--show-current").Output(); err == nil {
		branch = strings.TrimSpace(string(out))
	}
	if branch == "" { return "", "", "" }
	if out, err := exec.Command("git", "status", "--short").Output(); err == nil {
		status = string(out)
	}
	if out, err := exec.Command("git", "diff", "--stat").Output(); err == nil {
		stat = strings.TrimSpace(string(out))
	}
	return
}

func wfStatus(reader *bufio.Reader, args []string) {
	if config.Token == "" {
		uiBanner()
		fmt.Println("  Welcome! Run " + uiCyan("devpilot login") + " to get started.")
		return
	}
	var p Project
	if config.ProjectID > 0 {
		if err := request("GET", "/projects/"+strconv.Itoa(config.ProjectID), nil, &p); err != nil {
			if !strings.Contains(err.Error(), "404") {
				fmt.Println("Error:", err)
				return
			}
			wfSetContext(0, 0)
			p = Project{}
		}
	}
	if p.ID == 0 {
		projects, err := wfProjects()
		if err != nil {
			fmt.Println("Error:", err)
			return
		}
		if found, ok := wfDetectProject(projects); ok {
			p = found
			wfSetContext(p.ID, 0)
		} else {
			uiBanner()
			if len(projects) == 0 {
				fmt.Println("  No projects yet. Create one with " + uiCyan("devpilot project create"))
				return
			}
			fmt.Println("  Your projects:")
			for _, pr := range projects {
				fmt.Printf("    #%-4d %-28s %-12s %s\n", pr.ID, uiTrim(pr.Name, 28), pr.Status, pr.Priority)
			}
			fmt.Println()
			fmt.Println("  Pick one to work on with " + uiCyan("devpilot use"))
			return
		}
	}
	ms, err := wfTree(p.ID)
	if err != nil {
		fmt.Println("Error:", err)
		return
	}
	wfDashboard(p, ms)
}

func wfProjectList() {
	if !wfRequireLogin() {
		return
	}
	projects, err := wfProjects()
	if err != nil {
		fmt.Println("Error:", err)
		return
	}
	if len(projects) == 0 {
		fmt.Println("No projects found. Create one with `devpilot project create`.")
		return
	}
	for _, p := range projects {
		marker := " "
		if p.ID == config.ProjectID {
			marker = uiCyan("*")
		}
		fmt.Printf(" %s #%-4d %-28s %-12s %s (+%d XP)\n", marker, p.ID, uiTrim(p.Name, 28), p.Status, uiPriorityTag(p.Priority), p.XPReward)
	}
	fmt.Println(uiDim("\n * = active here. Switch with `devpilot use`."))
}

func wfProjectShow(reader *bufio.Reader, args []string) {
	a := wfParse(args)
	p, ok := wfProjectFromArg(reader, a.text())
	if !ok {
		return
	}
	ms, err := wfTree(p.ID)
	if err != nil {
		fmt.Println("Error:", err)
		return
	}
	if p.Description != "" {
		fmt.Println()
		fmt.Println("  " + p.Description)
	}
	wfDashboard(p, ms)
}

func wfMilestoneList(reader *bufio.Reader, args []string) {
	a := wfParse(args)
	p, ok := wfProjectFromArg(reader, firstNonEmpty(a.Flags["project"], a.text()))
	if !ok {
		return
	}
	ms, err := wfTree(p.ID)
	if err != nil {
		fmt.Println("Error:", err)
		return
	}
	if len(ms) == 0 {
		fmt.Println("No milestones yet. Create one with `devpilot milestone create`.")
		return
	}
	fmt.Printf("\n  %s\n\n", uiBold(p.Name))
	for i, m := range ms {
		d, t := wfCount(m)
		active := ""
		if m.ID == config.MilestoneID {
			active = uiCyan("  <- active")
		}
		fmt.Printf("  %s %d. %-30s %s %d/%d%s\n", uiStatusMark(m.Status), i+1, uiTrim(m.Title, 30), uiBar(d, t, 14), d, t, active)
	}
}

func wfMilestoneShow(reader *bufio.Reader, args []string) {
	a := wfParse(args)
	p, ok := wfProjectFromArg(reader, a.Flags["project"])
	if !ok {
		return
	}
	ms, err := wfTree(p.ID)
	if err != nil {
		fmt.Println("Error:", err)
		return
	}
	m, ok := wfResolveMilestone(reader, p, ms, a.text())
	if !ok {
		return
	}
	for _, cur := range ms {
		if cur.ID == m.ID {
			m = cur
		}
	}
	d, t := wfCount(m)
	fmt.Println()
	uiBox(m.Title, fmt.Sprintf("#%d   %s", m.ID, m.Status))
	if m.Description != "" {
		fmt.Println("  " + m.Description)
	}
	fmt.Printf("  Progress  %s  %d/%d\n\n", uiBar(d, t, 22), d, t)
	for _, task := range m.Tasks {
		fmt.Printf("    %s %s  %s\n", uiStatusMark(task.Status), uiTrim(task.Title, 44), uiPriorityTag(task.Priority))
	}
}

func wfTaskList(reader *bufio.Reader, args []string) {
	a := wfParse(args)
	p, ok := wfProjectFromArg(reader, a.Flags["project"])
	if !ok {
		return
	}
	ms, err := wfTree(p.ID)
	if err != nil {
		fmt.Println("Error:", err)
		return
	}
	m, ok := wfResolveMilestone(reader, p, ms, a.text())
	if !ok {
		return
	}
	for _, cur := range ms {
		if cur.ID == m.ID {
			m = cur
		}
	}
	if len(m.Tasks) == 0 {
		fmt.Println("No tasks yet. Add one with `devpilot task create`.")
		return
	}
	fmt.Printf("\n  %s\n\n", uiBold(m.Title))
	for _, task := range m.Tasks {
		xp := ""
		if task.XPReward > 0 {
			xp = uiDim(fmt.Sprintf("  +%d XP", task.XPReward))
		}
		fmt.Printf("    %s #%-4d %-40s %s%s\n", uiStatusMark(task.Status), task.ID, uiTrim(task.Title, 40), uiPriorityTag(task.Priority), xp)
	}
}

func wfTaskShow(reader *bufio.Reader, args []string) {
	a := wfParse(args)
	p, ok := wfProjectFromArg(reader, a.Flags["project"])
	if !ok {
		return
	}
	ms, err := wfTree(p.ID)
	if err != nil {
		fmt.Println("Error:", err)
		return
	}
	ref, ok := wfResolveTask(reader, ms, a.text(), "Which task?", nil)
	if !ok {
		return
	}
	fmt.Println()
	uiBox(ref.Task.Title, fmt.Sprintf("#%d   %s   %s", ref.Task.ID, ref.Task.Status, ref.Task.Priority), wfTaskMeta(ref))
	if ref.Task.Description != "" {
		fmt.Println("  " + ref.Task.Description)
	}
}

/* ---------- update / delete ---------- */

func wfProjectUpdate(reader *bufio.Reader, args []string) {
	a := wfParse(args)
	p, ok := wfProjectFromArg(reader, a.text())
	if !ok {
		return
	}
	fmt.Printf("\n  Editing %s %s\n", uiBold(p.Name), uiDim("(Enter keeps the current value)"))
	body := map[string]any{}
	if v := wfAsk(reader, "Description", p.Description); v != p.Description {
		body["description"] = v
	}
	if v := wfPriority(wfAsk(reader, "Priority", p.Priority), p.Priority); v != p.Priority {
		body["priority"] = v
	}
	if v := wfAsk(reader, "GitHub URL", p.GithubURL); v != p.GithubURL {
		body["githubUrl"] = v
	}
	if len(body) == 0 {
		fmt.Println("Nothing changed.")
		return
	}
	if err := request("PATCH", "/projects/"+strconv.Itoa(p.ID), body, nil); err != nil {
		fmt.Println("Error:", err)
		return
	}
	fmt.Println(uiGreen("  Saved."))
}

func wfMilestoneUpdate(reader *bufio.Reader, args []string) {
	a := wfParse(args)
	p, ok := wfProjectFromArg(reader, a.Flags["project"])
	if !ok {
		return
	}
	ms, err := wfTree(p.ID)
	if err != nil {
		fmt.Println("Error:", err)
		return
	}
	m, ok := wfResolveMilestone(reader, p, ms, a.text())
	if !ok {
		return
	}
	fmt.Printf("\n  Editing %s %s\n", uiBold(m.Title), uiDim("(Enter keeps the current value)"))
	body := map[string]any{}
	if v := wfAsk(reader, "Title", m.Title); v != m.Title {
		body["title"] = v
	}
	if v := wfAsk(reader, "Description", m.Description); v != m.Description {
		body["description"] = v
	}
	if len(body) == 0 {
		fmt.Println("Nothing changed.")
		return
	}
	if err := request("PATCH", "/milestones/"+strconv.Itoa(m.ID), body, nil); err != nil {
		fmt.Println("Error:", err)
		return
	}
	fmt.Println(uiGreen("  Saved."))
}

func wfTaskUpdate(reader *bufio.Reader, args []string) {
	a := wfParse(args)
	p, ok := wfProjectFromArg(reader, a.Flags["project"])
	if !ok {
		return
	}
	ms, err := wfTree(p.ID)
	if err != nil {
		fmt.Println("Error:", err)
		return
	}
	ref, ok := wfResolveTask(reader, ms, a.text(), "Edit which task?", nil)
	if !ok {
		return
	}
	t := ref.Task
	fmt.Printf("\n  Editing %s %s\n", uiBold(t.Title), uiDim("(Enter keeps the current value)"))
	body := map[string]any{}
	if v := wfAsk(reader, "Title", t.Title); v != t.Title {
		body["title"] = v
	}
	if v := wfAsk(reader, "Description", t.Description); v != t.Description {
		body["description"] = v
	}
	if v := wfPriority(wfAsk(reader, "Priority", t.Priority), t.Priority); v != t.Priority {
		body["priority"] = v
	}
	if len(body) == 0 {
		fmt.Println("Nothing changed.")
		return
	}
	if err := request("PATCH", "/tasks/"+strconv.Itoa(t.ID), body, nil); err != nil {
		fmt.Println("Error:", err)
		return
	}
	fmt.Println(uiGreen("  Saved."))
}

// wfDelete removes a project, milestone or task after resolving it by id, name or menu.
func wfDelete(reader *bufio.Reader, kind string, args []string) {
	a := wfParse(args)
	var (
		path, name string
		id         int
	)
	switch kind {
	case "project":
		p, ok := wfProjectFromArg(reader, a.text())
		if !ok {
			return
		}
		path, name, id = "/projects/", p.Name, p.ID
	case "milestone":
		p, ok := wfProjectFromArg(reader, a.Flags["project"])
		if !ok {
			return
		}
		ms, err := wfTree(p.ID)
		if err != nil {
			fmt.Println("Error:", err)
			return
		}
		m, ok := wfResolveMilestone(reader, p, ms, a.text())
		if !ok {
			return
		}
		path, name, id = "/milestones/", m.Title, m.ID
	case "task":
		p, ok := wfProjectFromArg(reader, a.Flags["project"])
		if !ok {
			return
		}
		ms, err := wfTree(p.ID)
		if err != nil {
			fmt.Println("Error:", err)
			return
		}
		ref, ok := wfResolveTask(reader, ms, a.text(), "Delete which task?", nil)
		if !ok {
			return
		}
		path, name, id = "/tasks/", ref.Task.Title, ref.Task.ID
	default:
		fmt.Println("Unknown resource:", kind)
		return
	}
	if !a.Bools["yes"] && !wfConfirm(reader, fmt.Sprintf("Delete %s %q? This can't be undone.", kind, name), false) {
		fmt.Println("Delete cancelled.")
		return
	}
	if err := request("DELETE", path+strconv.Itoa(id), nil, nil); err != nil {
		fmt.Println("Error:", err)
		return
	}
	if kind == "project" && id == config.ProjectID {
		wfSetContext(0, 0)
	}
	if kind == "milestone" && id == config.MilestoneID {
		wfSetContext(config.ProjectID, 0)
	}
	fmt.Printf("  Deleted %s %q.\n", kind, name)
}

/* ---------- use (switch context) and init ---------- */

// wfUse sets the active project (and optionally milestone) for this folder.
func wfUse(reader *bufio.Reader, args []string) {
	if !wfRequireLogin() {
		return
	}
	a := wfParse(args)
	var p Project
	var ok bool
	if len(a.Pos) > 0 {
		p, ok = wfProjectFromArg(reader, a.Pos[0])
	} else {
		projects, err := wfProjects()
		if err != nil {
			fmt.Println("Error:", err)
			return
		}
		p, ok = wfPickProject(reader, projects)
	}
	if !ok {
		return
	}
	wfSetContext(p.ID, 0)

	ms, err := wfTree(p.ID)
	if err != nil {
		fmt.Println("Error:", err)
		return
	}
	var m Milestone
	if len(a.Pos) > 1 {
		m, ok = wfResolveMilestone(reader, p, ms, strings.Join(a.Pos[1:], " "))
	} else if len(ms) > 0 {
		labels := make([]string, 0, len(ms)+1)
		def := 0
		for i, cur := range ms {
			labels = append(labels, uiStatusMark(cur.Status)+" "+wfMilestoneLabel(cur))
			if def == 0 && cur.Status == "IN_PROGRESS" {
				def = i
			}
		}
		labels = append(labels, "- no default milestone (ask me each time)")
		idx := wfPick(reader, "Default milestone for new tasks?", labels, def)
		if idx >= 0 && idx < len(ms) {
			m, ok = ms[idx], true
		} else {
			ok = false
		}
	} else {
		ok = false
	}
	if ok {
		wfSetContext(p.ID, m.ID)
	}

	fmt.Println()
	line := "Active: " + p.Name
	if ok {
		line += "  >  " + m.Title
	}
	uiBox(line)
	fmt.Println("  Try " + uiCyan("devpilot status") + ", " + uiCyan("devpilot next") + " or " + uiCyan("devpilot task create"))
}

func wfInit(reader *bufio.Reader) {
	uiBanner()
	config.APIURL = apiURL
	if override := strings.TrimSpace(os.Getenv("DEVPILOT_API_URL")); override != "" {
		config.APIURL = strings.TrimRight(override, "/")
	}
	if err := saveConfig(); err != nil {
		fmt.Println("Error:", err)
		return
	}
	fmt.Println("  Initialized DevPilot in this folder (.devpilot).")

	// .devpilot holds your login token: warn if git would commit it.
	if _, err := exec.LookPath("git"); err == nil {
		if err := exec.Command("git", "rev-parse", "--is-inside-work-tree").Run(); err == nil {
			if exec.Command("git", "check-ignore", "-q", configFile).Run() != nil {
				fmt.Println(uiYellow("  Heads up: .devpilot stores your login token. Add it to .gitignore so it never gets committed."))
			}
		}
	}

	if config.Token == "" {
		if !wfConfirm(reader, "Log in now?", true) {
			fmt.Println("  Run " + uiCyan("devpilot login") + " when you're ready.")
			return
		}
		login(reader)
	}
	if config.Token != "" {
		wfUse(reader, nil)
	}
}

// Small terminal UI helpers. The workflow layer intentionally uses only the Go standard library.
const uiReset = "\x1b[0m"
const uiCyanCode = "\x1b[36m"
const uiGreenCode = "\x1b[32m"
const uiYellowCode = "\x1b[33m"
const uiDimCode = "\x1b[2m"
const uiBoldCode = "\x1b[1m"

func uiCyan(s string) string { return uiCyanCode + s + uiReset }
func uiGreen(s string) string { return uiGreenCode + s + uiReset }
func uiYellow(s string) string { return uiYellowCode + s + uiReset }
func uiDim(s string) string { return uiDimCode + s + uiReset }
func uiBold(s string) string { return uiBoldCode + s + uiReset }
func uiTrim(s string, n int) string {
	r := []rune(s)
	if n <= 0 || len(r) <= n { return s }
	if n <= 3 { return string(r[:n]) }
	return string(r[:n-1]) + "…"
}
func uiPriorityTag(s string) string {
	switch strings.ToUpper(s) {
	case "HIGH": return uiYellow("[HIGH]")
	case "LOW": return uiDim("[LOW]")
	default: return "[MED]"
	}
}
func uiStatusMark(s string) string {
	switch strings.ToUpper(s) {
	case "COMPLETED": return uiGreen("✓")
	case "IN_PROGRESS": return uiCyan("▶")
	default: return uiDim("○")
	}
}
func uiBar(done, total, width int) string {
	if width < 1 { return "" }
	if total <= 0 { return strings.Repeat("░", width) }
	filled := done * width / total
	if filled > width { filled = width }
	return uiGreen(strings.Repeat("█", filled)) + uiDim(strings.Repeat("░", width-filled))
}
func uiHeader(title string) {
	fmt.Println()
	fmt.Println(uiCyan("┌─ " + strings.ToUpper(title) + " " + strings.Repeat("─", max(0, 38-len(title)))))
}
func uiBox(title string, lines ...string) {
	fmt.Println()
	fmt.Println(uiCyan("┌─ " + title + " " + strings.Repeat("─", max(0, 38-len([]rune(title))))))
	for _, line := range lines { fmt.Println("│ " + line) }
	fmt.Println(uiCyan("└" + strings.Repeat("─", 42)))
}
func uiBanner() {
	fmt.Println(uiCyan(`
  ____             ____  _ _       _
 |  _ \  _____   _|  _ \(_) | ___ | |_
 | | | |/ _ \ \ / / |_) | | |/ _ \| __|
 | |_| |  __/\ V /|  __/| | | (_) | |_
 |____/ \___| \_/ |_|   |_|_|\___/ \__|
             BUILD. TRACK. SHIP.
`))
}
func uiType(s string, _ time.Duration) { fmt.Println(s) }
func uiTaskDone(title string, xp int) { fmt.Printf("  %s %s  %s\n", uiGreen("✓"), title, uiYellow(fmt.Sprintf("+%d XP", xp))) }
func uiMilestoneDone(title string) { uiRocket("Milestone complete: " + title) }
func uiProjectDone(title string) { uiRocket("Project complete: " + title) }
func uiRocket(message string) { fmt.Println(); fmt.Println(uiGreen("🚀 " + message)) }


// Workflow dispatchers replace the old ID-first CRUD prompts while keeping
// the existing command names intact.
func handleWorkflowProject(reader *bufio.Reader, args []string) {
	if len(args) == 0 { wfStatus(reader, nil); return }
	switch args[0] {
	case "create": wfProjectCreate(reader, args[1:])
	case "list": wfProjectList()
	case "show": wfProjectShow(reader, args[1:])
	case "update": wfProjectUpdate(reader, args[1:])
	case "delete": wfDelete(reader, "project", args[1:])
	case "start": wfProjectStatus(reader, args[1:], "IN_PROGRESS")
	case "finish": wfProjectStatus(reader, args[1:], "COMPLETED")
	case "milestones": wfMilestoneList(reader, args[1:])
	default: fmt.Println("Unknown project command:", args[0]); usage()
	}
}
func handleWorkflowMilestone(reader *bufio.Reader, args []string) {
	if len(args) == 0 { wfMilestoneList(reader, nil); return }
	switch args[0] {
	case "create": wfMilestoneCreate(reader, args[1:])
	case "list": wfMilestoneList(reader, args[1:])
	case "show": wfMilestoneShow(reader, args[1:])
	case "update": wfMilestoneUpdate(reader, args[1:])
	case "delete": wfDelete(reader, "milestone", args[1:])
	case "start": wfMilestoneStatus(reader, args[1:], "IN_PROGRESS")
	case "finish": wfMilestoneStatus(reader, args[1:], "COMPLETED")
	case "tasks": wfTaskList(reader, args[1:])
	default: fmt.Println("Unknown milestone command:", args[0]); usage()
	}
}
func handleWorkflowTask(reader *bufio.Reader, args []string) {
	if len(args) == 0 { wfTaskList(reader, nil); return }
	switch args[0] {
	case "create": wfTaskCreate(reader, args[1:])
	case "list": wfTaskList(reader, args[1:])
	case "show": wfTaskShow(reader, args[1:])
	case "update": wfTaskUpdate(reader, args[1:])
	case "delete": wfDelete(reader, "task", args[1:])
	case "start": wfTaskStart(reader, args[1:])
	case "finish": wfTaskFinish(reader, args[1:])
	case "next": wfNext(reader, args[1:])
	default: fmt.Println("Unknown task command:", args[0]); usage()
	}
}
