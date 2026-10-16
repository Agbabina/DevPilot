package main

import (
	"bufio"
	"encoding/json"
	"fmt"
	"os"
	"os/exec"
	"path/filepath"
	"regexp"
	"sort"
	"strings"
)

func devRun(name string, args ...string) (string, error) {
	cmd := exec.Command(name, args...)
	cmd.Dir, _ = os.Getwd()
	out, err := cmd.CombinedOutput()
	if err != nil {
		if _, ok := err.(*exec.Error); ok {
			return string(out), fmt.Errorf("%s is required; install it and authenticate if needed", name)
		}
		return string(out), fmt.Errorf("%s", strings.TrimSpace(string(out)))
	}
	return string(out), nil
}

func devGit(args ...string) (string, error) { return devRun("git", args...) }

func devAskYes(reader *bufio.Reader, prompt string) bool {
	return strings.EqualFold(ask(reader, prompt+" Type yes to continue: "), "yes")
}

func handleDevtools(reader *bufio.Reader) {
	command := os.Args[1]
	sub := ""
	if len(os.Args) > 2 {
		sub = os.Args[2]
	}
	switch command {
	case "pr":
		switch sub {
		case "draft":
			log, _ := devGit("log", "-5", "--oneline")
			status, _ := devGit("status", "--short")
			fmt.Print("Suggested PR title:\nfeat: describe the change\n")
			fmt.Print("## Summary\n- What changed and why\n\n## Testing\n- [ ] Tests/build passed\n\n## Risks\n- Note compatibility risks\n")
			fmt.Println("Recent commits:\n" + log + "\nWorking tree:\n" + status)
		case "create":
			title := strings.TrimSpace(strings.Join(os.Args[3:], " "))
			if title == "" { title = ask(reader, "PR title: ") }
			if title == "" { fmt.Println("PR title is required."); return }
			body := ask(reader, "PR description (optional): ")
			if body == "" { body = "## Summary\n- Describe changes\n\n## Testing\n- [ ] Tests passed" }
			out, err := devRun("gh", "pr", "create", "--title", title, "--body", body)
			fmt.Print(out)
			if err != nil { fmt.Println("Error:", err) }
		case "review":
			out, err := devRun("gh", "pr", "diff")
			fmt.Print(out)
			if err != nil { fmt.Println("Error:", err) }
		case "checks":
			out, err := devRun("gh", "pr", "checks")
			fmt.Print(out)
			if err != nil { fmt.Println("Error:", err) }
		case "merge":
			out, err := devRun("gh", "pr", "view", "--json", "number,title,state,mergeable,statusCheckRollup")
			if err != nil { fmt.Println(out, err); return }
			var pr map[string]any
			if json.Unmarshal([]byte(out), &pr) != nil { fmt.Println("Could not parse GitHub PR status."); return }
			fmt.Printf("PR #%v: %v\nState: %v\nMergeability: %v\n", pr["number"], pr["title"], pr["state"], pr["mergeable"])
			if pr["state"] != "OPEN" { fmt.Println("Only an open PR can be merged."); return }
			if pr["mergeable"] == false || pr["mergeable"] == "CONFLICTING" { fmt.Println("PR has conflicts. Resolve them first."); return }
			if checks, ok := pr["statusCheckRollup"].([]any); ok {
				for _, raw := range checks {
					if c, ok := raw.(map[string]any); ok {
						state := fmt.Sprint(c["conclusion"])
						if state == "" || state == "<nil>" { state = fmt.Sprint(c["state"]) }
						if state == "FAILURE" || state == "ERROR" || state == "CANCELLED" || state == "TIMED_OUT" {
							fmt.Println("PR has failing checks. Fix them before merging."); return
						}
					}
				}
			}
			if !devAskYes(reader, "Merge this PR using squash?") { fmt.Println("Merge cancelled."); return }
			out, err = devRun("gh", "pr", "merge", "--squash", "--delete-branch")
			fmt.Print(out)
			if err != nil { fmt.Println("Error:", err) }
		default:
			fmt.Println("Usage: devpilot pr <draft|create|review|merge|checks>")
		}
	case "issue":
		title := strings.TrimSpace(strings.Join(os.Args[2:], " "))
		if title == "" { title = ask(reader, "Issue title: ") }
		if title == "" { fmt.Println("Issue title is required."); return }
		body := ask(reader, "Details / expected behaviour / reproduction steps: ")
		if body == "" { body = "## Problem\n\n## Expected behaviour\n\n## Steps to reproduce\n" }
		out, err := devRun("gh", "issue", "create", "--title", title, "--body", body)
		fmt.Print(out)
		if err != nil { fmt.Println("Error:", err) }
	case "release":
		if len(os.Args) < 3 { fmt.Println("Usage: devpilot release v1.2.0"); return }
		version := os.Args[2]
		log, _ := devGit("log", "-12", "--pretty=format:%h %s")
		fmt.Println("Release notes draft for " + version + "\n\nChanges:\n" + log)
		if !devAskYes(reader, "Create local annotated Git tag "+version+"?") { fmt.Println("No tag created."); return }
		out, err := devGit("tag", "-a", version, "-m", "Release "+version)
		fmt.Print(out)
		if err != nil { fmt.Println("Error:", err) }
	case "inspect":
		devInspect(reader)
	case "security":
		devScan(true)
	case "impact":
		if len(os.Args) < 3 { fmt.Println("Usage: devpilot impact <file>"); return }
		out, err := devGit("grep", "-n", "-I", "-e", filepath.Base(os.Args[2]), "--", ":!package-lock.json", ":!*.sum")
		if out == "" && err != nil { fmt.Println("No tracked text references found for", filepath.Base(os.Args[2])) } else { fmt.Print(out) }
		fmt.Println("\nAlso check imports, exports, routes, tests, and configuration references.")
	case "deps":
		devDeps()
	case "test":
		devTest()
	case "explain", "fix", "review":
		devAI(reader, command)
	}
}

func devScan(securityOnly bool) {
	var rules []*regexp.Regexp
	var labels []string
	if securityOnly {
		rules = []*regexp.Regexp{
			regexp.MustCompile("-----BEGIN (RSA |EC |OPENSSH )?PRIVATE KEY-----"),
			regexp.MustCompile("\\b(AKIA[0-9A-Z]{16}|gh[pousr]_[A-Za-z0-9_]{20,}|sk-[A-Za-z0-9_-]{20,})\\b"),
            regexp.MustCompile("(?i)(password|secret|api[_-]?key|access[_-]?token)\\s*[:=]\\s*[A-Za-z0-9_/-]{8,}"),
			regexp.MustCompile("(?i)(rejectUnauthorized\\s*:\\s*false|InsecureSkipVerify\\s*:\\s*true)"),
		}
		labels = []string{"Private key material", "Token/key-shaped string", "Possible hard-coded credential", "TLS verification disabled"}
	} else {
		rules = []*regexp.Regexp{
			regexp.MustCompile("\\b(eval|exec)\\s*\\("),
			regexp.MustCompile("\\b(TODO|FIXME|HACK)\\b"),
			regexp.MustCompile("\\bcatch\\s*\\([^)]*\\)\\s*\\{\\s*\\}"),
			regexp.MustCompile("console\\.log\\s*\\("),
		}
		labels = []string{"Review dynamic code execution", "Unfinished-work marker", "Empty catch block hides errors", "Debug logging"}
	}
	count, scanned := 0, 0
	_ = filepath.Walk(".", func(file string, info os.FileInfo, err error) error {
		if err != nil { return nil }
		if info.IsDir() {
			if file != "." && (info.Name() == ".git" || info.Name() == "node_modules" || info.Name() == "dist" || info.Name() == "build" || info.Name() == "vendor" || info.Name() == "coverage") { return filepath.SkipDir }
			return nil
		}
		ext := strings.ToLower(filepath.Ext(file))
		allowed := map[string]bool{".js":true, ".jsx":true, ".ts":true, ".tsx":true, ".mjs":true, ".go":true, ".py":true, ".java":true, ".cs":true, ".php":true, ".rb":true, ".rs":true, ".env":true, ".yml":true, ".yaml":true, ".json":true, ".toml":true, ".sh":true}
		if !allowed[ext] { return nil }
		data, e := os.ReadFile(file); if e != nil { return nil }
		scanned++
		for lineNo, line := range strings.Split(string(data), "\n") {
			for i, re := range rules {
				if re.MatchString(line) { fmt.Printf("[CHECK] %s:%d — %s\n", file, lineNo+1, labels[i]); count++ }
			}
		}
		return nil
	})
	fmt.Printf("\nScanned %d files; %d heuristic finding(s). This is not a full audit.\n", scanned, count)
}

func devDeps() {
	manifests := []struct{ file, command string }{
		{"package.json", "npm audit --omit=dev"}, {"go.mod", "go vet ./..."},
		{"requirements.txt", "python -m pip_audit -r requirements.txt"}, {"pyproject.toml", "python -m pip_audit"},
		{"Cargo.toml", "cargo audit"},
	}
	found := false
	for _, m := range manifests {
		if _, err := os.Stat(m.file); err == nil { fmt.Printf("- %s detected; optional check: %s\n", m.file, m.command); found = true }
	}
	if !found { fmt.Println("No supported dependency manifest detected."); return }
	fmt.Println("No packages were downloaded and no audits were run.")
}

func devTest() {
	var name string
	var args []string
	if data, err := os.ReadFile("package.json"); err == nil {
		var pkg struct { Scripts map[string]string `json:"scripts"` }
		if json.Unmarshal(data, &pkg) == nil {
			if pkg.Scripts["test"] != "" { name, args = "npm", []string{"test"} } else if pkg.Scripts["build"] != "" { name, args = "npm", []string{"run", "build"} }
		}
	} else if _, err := os.Stat("go.mod"); err == nil { name, args = "go", []string{"test", "./..."}
	} else if _, err := os.Stat("Cargo.toml"); err == nil { name, args = "cargo", []string{"test"}
	} else if _, err := os.Stat("pyproject.toml"); err == nil { name, args = "python", []string{"-m", "pytest"}
	} else if _, err := os.Stat("pom.xml"); err == nil { name, args = "mvn", []string{"test"} }
	if name == "" { fmt.Println("No test/build command detected."); return }
	fmt.Println("Running", name, strings.Join(args, " "))
	out, err := devRun(name, args...)
	fmt.Print(out)
	if err != nil { fmt.Println("Test/build failed:", err) }
}

func devAI(reader *bufio.Reader, action string) {
	context := strings.TrimSpace(strings.Join(os.Args[2:], " "))
	if action == "explain" {
		if context == "" {
			context = ask(reader, "Question or file path: ")
		}
		if context == "" {
			fmt.Println("Usage: devpilot explain <question-or-file>")
			return
		}
		if info, err := os.Stat(context); err == nil && !info.IsDir() {
			data, readErr := os.ReadFile(context)
			if readErr != nil {
				fmt.Println("File error:", readErr)
				return
			}
			context = "Explain this file, its flow, edge cases, and risks: " + context + "\n\n" + string(data)
		} else {
			context = "Explain this programming question clearly with a simple example: " + context
		}
	} else if action == "review" {
		unstaged, _ := devGit("diff")
		staged, _ := devGit("diff", "--cached")
		if strings.TrimSpace(unstaged+staged) == "" {
			fmt.Println("No uncommitted tracked changes to review.")
			return
		}
		context = "Review this Git diff for bugs, regressions, security issues, and missing tests. Give actionable findings with file/line references when possible. Do not claim a finding unless the diff supports it.\nUNSTAGED:\n" + unstaged + "\nSTAGED:\n" + staged
	} else {
		if context == "" {
			context = ask(reader, "Paste error and relevant context: ")
		}
		context = "Propose a minimal fix for this error. Explain the cause and show a patch; do not edit files automatically.\n" + context
	}

	var result struct {
		Result string `json:"result"`
		Answer string `json:"answer"`
	}
	apiAction := action
	if action == "fix" {
		apiAction = "debug"
	}
	if err := request("POST", "/ai/assist", map[string]string{"action": apiAction, "context": context}, &result); err != nil {
		fmt.Println("AI request failed:", err)
		return
	}
	answer := strings.TrimSpace(result.Result)
	if answer == "" {
		answer = strings.TrimSpace(result.Answer)
	}
	if answer == "" {
		fmt.Println("AI returned an empty response. Check the backend logs and try again.")
		return
	}
	fmt.Println(answer)
}


var inspectSkipDirs = map[string]bool{
	".git": true, "node_modules": true, "vendor": true, "dist": true,
	"build": true, "target": true, "coverage": true, ".gradle": true,
	".idea": true, ".vscode": true, ".next": true, "out": true,
}

var inspectSourceExts = map[string]bool{
	".java": true, ".kt": true, ".kts": true, ".go": true, ".js": true,
	".jsx": true, ".ts": true, ".tsx": true, ".mjs": true, ".c": true,
	".h": true, ".cpp": true, ".hpp": true, ".cs": true, ".py": true,
	".rs": true, ".php": true, ".rb": true, ".swift": true, ".scala": true,
}

var inspectManifestFiles = []string{
	"README.md", "package.json", "go.mod", "pom.xml", "build.gradle",
	"build.gradle.kts", "settings.gradle", "settings.gradle.kts",
	"pyproject.toml", "Cargo.toml", "composer.json",
}

func devInspect(reader *bufio.Reader) {
	sub := ""
	if len(os.Args) > 2 {
		sub = os.Args[2]
	}
	switch sub {
	case "map":
		devProjectMap()
		return
	case "todo":
		devTodoScan()
		return
	case "hotspots":
		devHotspots()
		return
	case "checkpoint":
		devCheckpoint()
		return
	case "onboard":
		devAIInspect(reader, true)
		return
	case "help", "--help", "-h":
		fmt.Println("Usage: devpilot inspect [map|todo|hotspots|checkpoint|onboard]")
		fmt.Println("  inspect             Project inventory + AI architecture/risk review")
		fmt.Println("  inspect map         Shallow project structure and manifests")
		fmt.Println("  inspect todo        Find TODO/FIXME/HACK/XXX markers")
		fmt.Println("  inspect hotspots    Files changed most often in recent Git history")
		fmt.Println("  inspect checkpoint  Working-tree and recent-work summary")
		fmt.Println("  inspect onboard     AI-generated onboarding guide for this codebase")
		return
	default:
		devScan(false)
		devProjectMap()
		devAIInspect(reader, false)
	}
}

func inspectWalk(root string, visit func(string, os.FileInfo)) {
	_ = filepath.Walk(root, func(file string, info os.FileInfo, err error) error {
		if err != nil {
			return nil
		}
		if info.IsDir() {
			if file != root && inspectSkipDirs[info.Name()] {
				return filepath.SkipDir
			}
			return nil
		}
		visit(file, info)
		return nil
	})
}

func devProjectMap() {
	root, err := os.Getwd()
	if err != nil {
		fmt.Println("Could not determine project directory:", err)
		return
	}
	fmt.Println("PROJECT MAP")
	fmt.Println("-----------")
	fmt.Println("Root:", root)
	manifestFound := false
	for _, name := range inspectManifestFiles {
		if info, err := os.Stat(name); err == nil && !info.IsDir() {
			fmt.Printf("[manifest] %s (%d bytes)\n", name, info.Size())
			manifestFound = true
		}
	}
	if !manifestFound {
		fmt.Println("No common root manifest found.")
	}
	dirs := map[string]bool{}
	counts := map[string]int{}
	total := 0
	inspectWalk(".", func(file string, info os.FileInfo) {
		rel, err := filepath.Rel(".", file)
		if err != nil {
			return
		}
		ext := strings.ToLower(filepath.Ext(file))
		if inspectSourceExts[ext] {
			total++
			counts[ext]++
		}
		dir := filepath.Dir(rel)
		for dir != "." && dir != string(filepath.Separator) {
			depth := strings.Count(filepath.ToSlash(dir), "/") + 1
			if depth <= 3 {
				dirs[filepath.ToSlash(dir)] = true
			}
			parent := filepath.Dir(dir)
			if parent == dir {
				break
			}
			dir = parent
		}
	})
	dirList := make([]string, 0, len(dirs))
	for dir := range dirs {
		dirList = append(dirList, dir)
	}
	sort.Strings(dirList)
	fmt.Println("\nDirectories (up to 3 levels):")
	if len(dirList) == 0 {
		fmt.Println("  (no source directories detected)")
	}
	for _, dir := range dirList {
		fmt.Println("  " + dir + "/")
	}
	exts := make([]string, 0, len(counts))
	for ext := range counts {
		exts = append(exts, ext)
	}
	sort.Strings(exts)
	fmt.Printf("\nSource files: %d\n", total)
	for _, ext := range exts {
		fmt.Printf("  %-8s %d\n", ext, counts[ext])
	}
	fmt.Println("\nMap is a shallow inventory, not a complete dependency graph.")
}

func devTodoScan() {
	fmt.Println("TODO SCAN")
	fmt.Println("---------")
	pattern := regexp.MustCompile(`(?i)\b(TODO|FIXME|HACK|XXX)\b`)
	found, scanned := 0, 0
	inspectWalk(".", func(file string, info os.FileInfo) {
		if found >= 200 || info.Size() > 1_000_000 {
			return
		}
		if !inspectSourceExts[strings.ToLower(filepath.Ext(file))] {
			return
		}
		data, err := os.ReadFile(file)
		if err != nil {
			return
		}
		scanned++
		for lineNo, line := range strings.Split(string(data), "\n") {
			if pattern.MatchString(line) {
				fmt.Printf("%s:%d: %s\n", file, lineNo+1, strings.TrimSpace(line))
				found++
				if found >= 200 {
					fmt.Println("Hit limit of 200 findings.")
					return
				}
			}
		}
	})
	fmt.Printf("\nScanned %d source files; found %d marker(s).\n", scanned, found)
}

func devHotspots() {
	out, err := devGit("log", "-50", "--name-only", "--pretty=format:")
	if err != nil {
		fmt.Println("Git history unavailable:", err)
		return
	}
	counts := map[string]int{}
	for _, line := range strings.Split(out, "\n") {
		file := strings.TrimSpace(line)
		if file != "" {
			counts[file]++
		}
	}
	type item struct { file string; count int }
	items := make([]item, 0, len(counts))
	for file, count := range counts {
		items = append(items, item{file, count})
	}
	sort.Slice(items, func(i, j int) bool {
		if items[i].count == items[j].count {
			return items[i].file < items[j].file
		}
		return items[i].count > items[j].count
	})
	fmt.Println("CHANGE HOTSPOTS")
	fmt.Println("---------------")
	if len(items) == 0 {
		fmt.Println("No file history found yet.")
		return
	}
	limit := len(items)
	if limit > 15 { limit = 15 }
	for i := 0; i < limit; i++ {
		fmt.Printf("%2d. %-50s %d change(s) in last 50 commits\n", i+1, items[i].file, items[i].count)
	}
	fmt.Println("\nFrequently changed files deserve extra regression tests; frequency alone does not prove a bug.")
}

func devCheckpoint() {
	fmt.Println("DEVELOPER CHECKPOINT")
	fmt.Println("--------------------")
	for _, entry := range []struct{ label string; args []string }{
		{"Branch and working tree", []string{"status", "--short", "--branch"}},
		{"Recent commits", []string{"log", "-5", "--oneline", "--decorate"}},
		{"Unstaged diff summary", []string{"diff", "--stat"}},
		{"Staged diff summary", []string{"diff", "--cached", "--stat"}},
		{"Recent stashes", []string{"stash", "list", "-3"}},
	} {
		out, err := devGit(entry.args...)
		fmt.Println("\n" + entry.label + ":")
		if err != nil {
			fmt.Println("  unavailable:", err)
		} else if strings.TrimSpace(out) == "" {
			fmt.Println("  (none)")
		} else {
			fmt.Print(out)
			if !strings.HasSuffix(out, "\n") { fmt.Println() }
		}
	}
}

func devAIInspect(reader *bufio.Reader, onboarding bool) {
	context, files := buildInspectContext()
	if len(files) == 0 {
		fmt.Println("No readable source files or supported manifests found. Run from the project root.")
		return
	}
	fmt.Println("\nSelected context files (bounded to avoid sending the entire repository):")
	for _, file := range files {
		fmt.Println("  " + file)
	}
	fmt.Println("Only these excerpts and basic Git metadata will be sent to the configured DevPilot AI backend.")
	if !devAskYes(reader, "Send the listed context to AI for analysis?") {
		fmt.Println("AI inspection cancelled; no context sent.")
		return
	}
	prompt := "Inspect this software project using only the supplied inventory, manifests, and source excerpts. " +
		"Separate confirmed observations from hypotheses; do not invent files, frameworks, tests, or bugs. " +
		"Prioritize architecture, entry points, important flows, reliability risks, security considerations, and the three highest-value next actions. " +
		"Call out limitations caused by the partial context.\n\n" + context
	action := "summarize"
	if onboarding {
		prompt = "Create a practical onboarding guide for a developer new to this repository. Explain the likely entry points, package/module boundaries, how to build and test based only on supplied evidence, a safe first task, and what remains unknown. Never invent commands or architecture.\n\n" + context
	}
	var result struct {
		Result string `json:"result"`
		Answer string `json:"answer"`
	}
	if err := request("POST", "/ai/assist", map[string]string{"action": action, "context": prompt}, &result); err != nil {
		fmt.Println("AI inspection failed:", err)
		return
	}
	answer := strings.TrimSpace(result.Result)
	if answer == "" { answer = strings.TrimSpace(result.Answer) }
	if answer == "" {
		fmt.Println("AI returned an empty response. Check the backend logs and retry.")
		return
	}
	fmt.Println("\nDEVPILOT INSPECTION")
	fmt.Println("-------------------")
	fmt.Println(answer)
	fmt.Println("\nAI findings are suggestions, not verified diagnostics. Confirm them against source and tests.")
}

func buildInspectContext() (string, []string) {
	var b strings.Builder
	root, _ := os.Getwd()
	b.WriteString("Project root: " + root + "\n")
	if branch, err := devGit("branch", "--show-current"); err == nil {
		b.WriteString("Git branch: " + strings.TrimSpace(branch) + "\n")
	}
	if status, err := devGit("status", "--short"); err == nil {
		b.WriteString("Git status: " + strings.TrimSpace(status) + "\n")
	}
	var files []string
	for _, name := range inspectManifestFiles {
		if info, err := os.Stat(name); err == nil && !info.IsDir() && info.Size() <= 12000 {
			files = append(files, name)
		}
	}
	var sourceFiles []string
	inspectWalk(".", func(file string, info os.FileInfo) {
		if !inspectSourceExts[strings.ToLower(filepath.Ext(file))] || info.Size() > 20000 {
			return
		}
		if strings.Contains(strings.ToLower(file), "secret") || strings.Contains(strings.ToLower(file), "credential") || strings.Contains(strings.ToLower(file), "private") {
			return
		}
		sourceFiles = append(sourceFiles, file)
	})
	sort.Slice(sourceFiles, func(i, j int) bool {
		score := func(name string) int {
			base := strings.ToLower(filepath.Base(name))
			if base == "main.java" || base == "main.go" || base == "main.ts" || base == "main.py" || base == "app.java" || base == "app.ts" { return 0 }
			if strings.Contains(base, "application") || strings.Contains(base, "server") || strings.Contains(base, "index") { return 1 }
			return 2
		}
		if score(sourceFiles[i]) != score(sourceFiles[j]) { return score(sourceFiles[i]) < score(sourceFiles[j]) }
		return sourceFiles[i] < sourceFiles[j]
	})
	if len(sourceFiles) > 8 { sourceFiles = sourceFiles[:8] }
	files = append(files, sourceFiles...)
	seen := map[string]bool{}
	selected := files[:0]
	total := 0
	for _, file := range files {
		if seen[file] { continue }
		seen[file] = true
		data, err := os.ReadFile(file)
		if err != nil { continue }
		limit := len(data)
		if limit > 6000 { limit = 6000 }
		if total+limit > 30000 { break }
		selected = append(selected, file)
		total += limit
		b.WriteString("\n--- " + file + " ---\n")
		b.Write(data[:limit])
		if limit < len(data) { b.WriteString("\n[excerpt truncated]\n") }
		b.WriteString("\n")
	}
	return b.String(), selected
}
