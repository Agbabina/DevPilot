package main

import (
	"bufio"
	"encoding/json"
	"fmt"
	"os"
	"os/exec"
	"path/filepath"
	"regexp"
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
			fmt.Println("Suggested PR title:\nfeat: describe the change\n")
			fmt.Println("## Summary\n- What changed and why\n\n## Testing\n- [ ] Tests/build passed\n\n## Risks\n- Note compatibility risks\n")
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
		devScan(false)
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
		if len(os.Args) < 3 { fmt.Println("Usage: devpilot explain <file>"); return }
		data, err := os.ReadFile(os.Args[2]); if err != nil { fmt.Println("File error:", err); return }
		context = "Explain this file, its flow, edge cases, and risks: " + os.Args[2] + "

" + string(data)
	} else if action == "review" {
		unstaged, _ := devGit("diff")
		staged, _ := devGit("diff", "--cached")
		if strings.TrimSpace(unstaged+staged) == "" { fmt.Println("No uncommitted tracked changes to review."); return }
		context = "Review these changes for bugs, regressions, and security. Give actionable findings.
UNSTAGED:
" + unstaged + "
STAGED:
" + staged
	} else {
		if context == "" { context = ask(reader, "Paste error and relevant context: ") }
		context = "Propose a minimal fix for this error. Explain the cause and show a patch; do not edit files automatically.
" + context
	}
	var result struct { Result string `json:"result"` }
	apiAction := action
	if action == "fix" { apiAction = "debug" }
	if err := request("POST", "/ai/assist", map[string]string{"action": apiAction, "context": context}, &result); err != nil { fmt.Println("AI request failed:", err); return }
	fmt.Println(result.Result)
}
