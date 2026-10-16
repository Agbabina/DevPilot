package main

import (
	"bufio"
	"encoding/json"
	"fmt"
	"os"
	"os/exec"
	"path/filepath"
	"runtime"
	"strings"
	"time"
)

func premiumRun(name string, args ...string) (string, error) {
	cmd := exec.Command(name, args...)
	out, err := cmd.CombinedOutput()
	output := strings.TrimSpace(string(out))
	if err != nil {
		if _, ok := err.(*exec.Error); ok {
			return output, fmt.Errorf("%s is not installed or not on PATH", name)
		}
		if output == "" {
			return output, err
		}
		return output, fmt.Errorf("%s", output)
	}
	return output, nil
}

func premiumGit(args ...string) (string, error) { return premiumRun("git", args...) }

func premiumConfirm(reader *bufio.Reader, prompt string) bool {
	return strings.EqualFold(ask(reader, prompt+" Type yes to continue: "), "yes")
}

func handlePremiumCommand(reader *bufio.Reader, command string) {
	switch command {
	case "ship":
		premiumShip(reader)
	case "doctor":
		premiumDoctor()
	case "resume":
		premiumResume()
	case "daily":
		premiumDaily()
	case "pulse":
		premiumPulse()
	case "commit":
		premiumCommit(reader)
	case "coffee":
		fmt.Println("Coffee acquired. Bugs fear a developer with caffeine.")
	case "matrix":
		fmt.Println("Wake up, developer...")
		fmt.Println("  01000100 01100101 01110110 01010000 01101001 01101100 01101111 01110100")
		fmt.Println("  Follow the diff. Trust the tests. Question every green check.")
	case "motivate":
		lines := []string{
			"Small commits. Clear diffs. Shipped software.",
			"Every expert was once confused by a compiler error.",
			"Make it work. Make it clear. Then make it fast.",
			"One tested improvement beats ten unfinished rewrites.",
		}
		fmt.Println(lines[time.Now().Unix()%int64(len(lines))])
	default:
		fmt.Println("Unknown DevPilot command:", command)
	}
}

func premiumShip(reader *bufio.Reader) {
	if _, err := premiumGit("rev-parse", "--is-inside-work-tree"); err != nil {
		fmt.Println("Ship must be run inside a Git repository.")
		return
	}
	status, err := premiumGit("status", "--short")
	if err != nil {
		fmt.Println("Git status failed:", err)
		return
	}
	if status == "" {
		fmt.Println("Working tree is clean. Nothing to ship.")
		return
	}
	fmt.Println("SHIP CHECKLIST")
	fmt.Println("--------------")
	fmt.Println(status)

	if out, err := premiumGit("diff", "--check"); err != nil {
		fmt.Println("Whitespace check failed:", out)
		return
	}
	if out, err := premiumGit("diff", "--cached", "--check"); err != nil {
		fmt.Println("Staged whitespace check failed:", out)
		return
	}
	fmt.Println("[ok] Git whitespace checks")

	checkName, checkArgs, found := premiumProjectCheck()
	if found {
		fmt.Printf("Running verification: %s %s\n", checkName, strings.Join(checkArgs, " "))
		out, err := premiumRun(checkName, checkArgs...)
		if out != "" { fmt.Println(out) }
		if err != nil {
			fmt.Println("Verification failed. Fix it before shipping.")
			return
		}
		fmt.Println("[ok] Verification passed")
	} else {
		fmt.Println("[warn] No recognizable test/build script found.")
		if !premiumConfirm(reader, "Continue without automated verification?") {
			fmt.Println("Ship cancelled.")
			return
		}
	}
	fmt.Println("\nReview the files above before staging. This workflow stages all non-ignored changes.")
	if !premiumConfirm(reader, "Stage changes and inspect the staged patch?") {
		fmt.Println("Ship cancelled.")
		return
	}
	if out, err := premiumGit("add", "-A"); err != nil {
		fmt.Println(out, err)
		return
	}
	names, err := premiumGit("diff", "--cached", "--name-only")
	if err != nil {
		fmt.Println("Could not inspect staged files:", err)
		return
	}
	for _, name := range strings.Split(names, "\n") {
		lower := strings.ToLower(strings.TrimSpace(name))
		base := strings.ToLower(filepath.Base(lower))
		if base == ".env" || (strings.HasPrefix(base, ".env.") && base != ".env.example") || strings.HasSuffix(lower, ".pem") || strings.Contains(base, "id_rsa") || strings.Contains(base, "private_key") {
			fmt.Printf("Potential secret file staged: %s\n", name)
			fmt.Println("Nothing was committed or pushed. Inspect and unstage sensitive files, then retry.")
			return
		}
	}
	patch, _ := premiumGit("diff", "--cached")
	if strings.Contains(patch, "-----BEGIN PRIVATE KEY-----") || strings.Contains(patch, "-----BEGIN RSA PRIVATE KEY-----") {
		fmt.Println("Potential private key detected in staged diff. Nothing was committed or pushed.")
		return
	}
	fmt.Println("\nStaged files:")
	fmt.Println(names)
	message := strings.TrimSpace(strings.Join(os.Args[2:], " "))
	if message == "" { message = ask(reader, "Commit message (e.g. feat: improve release workflow): ") }
	if message == "" {
		fmt.Println("A commit message is required. Changes remain staged.")
		return
	}
	if !premiumConfirm(reader, "Create commit '"+message+"'?") {
		fmt.Println("Commit cancelled. Changes remain staged.")
		return
	}
	out, err := premiumGit("commit", "-m", message)
	if out != "" { fmt.Println(out) }
	if err != nil {
		fmt.Println("Commit failed:", err)
		return
	}
	if !premiumConfirm(reader, "Push this commit to the current upstream branch?") {
		fmt.Println("Committed locally. Push skipped.")
		return
	}
	out, err = premiumGit("push")
	if out != "" { fmt.Println(out) }
	if err != nil {
		fmt.Println("Push failed. Your commit is saved locally:", err)
		return
	}
	fmt.Println("Shipped successfully.")
}

func premiumProjectCheck() (string, []string, bool) {
	if data, err := os.ReadFile("package.json"); err == nil {
		var pkg struct { Scripts map[string]string `json:"scripts"` }
		if json.Unmarshal(data, &pkg) == nil {
			if strings.TrimSpace(pkg.Scripts["test"]) != "" { return "npm", []string{"test"}, true }
			if strings.TrimSpace(pkg.Scripts["build"]) != "" { return "npm", []string{"run", "build"}, true }
		}
	}
	if _, err := os.Stat("go.mod"); err == nil { return "go", []string{"test", "./..."}, true }
	if _, err := os.Stat("Cargo.toml"); err == nil { return "cargo", []string{"test"}, true }
	if _, err := os.Stat("pyproject.toml"); err == nil { return "python", []string{"-m", "pytest"}, true }
	if _, err := os.Stat("pom.xml"); err == nil { return "mvn", []string{"test"}, true }
	if _, err := os.Stat("build.gradle"); err == nil { return "gradle", []string{"test"}, true }
	if _, err := os.Stat("build.gradle.kts"); err == nil { return "gradle", []string{"test"}, true }
	return "", nil, false
}

func premiumDoctor() {
	fmt.Println("DEVPILOT DOCTOR")
	fmt.Println("--------------")
	fmt.Printf("OS: %s/%s\n", runtime.GOOS, runtime.GOARCH)
	fmt.Printf("Go: %s\n", runtime.Version())
	if root, err := premiumGit("rev-parse", "--show-toplevel"); err == nil {
		fmt.Println("[ok] Git repository:", root)
		if branch, e := premiumGit("branch", "--show-current"); e == nil { fmt.Println("[ok] Branch:", branch) }
		if status, e := premiumGit("status", "--short"); e == nil {
			if status == "" { fmt.Println("[ok] Working tree clean") } else { fmt.Println("[warn] Uncommitted changes:\n" + status) }
		}
		if _, e := premiumGit("rev-parse", "--abbrev-ref", "@{upstream}"); e != nil { fmt.Println("[warn] Current branch has no configured upstream.") }
	} else { fmt.Println("[warn] Not inside a Git repository.") }
	for _, tool := range []string{"git", "gh", "go", "node", "npm", "python", "cargo", "mvn", "gradle"} {
		if path, err := exec.LookPath(tool); err == nil { fmt.Printf("[ok] %-7s %s\n", tool, path) } else { fmt.Printf("[--] %-7s not installed (optional unless your project needs it)\n", tool) }
	}
	manifests := []string{"package.json", "go.mod", "pyproject.toml", "requirements.txt", "Cargo.toml", "pom.xml", "build.gradle", "build.gradle.kts"}
	found := false
	for _, file := range manifests { if _, err := os.Stat(file); err == nil { fmt.Println("[ok] Project manifest:", file); found = true } }
	if !found { fmt.Println("[--] No common project manifest in the current directory.") }
	if _, err := os.Stat("node_modules"); err == nil { fmt.Println("[ok] node_modules present") }
	if _, err := os.Stat(".env"); err == nil { fmt.Println("[warn] .env exists locally. Ensure it is ignored by Git and never committed.") }
	fmt.Println("\nDoctor reports environment signals only; it does not install packages or change files.")
}

func premiumResume() {
	branch, err := premiumGit("branch", "--show-current")
	if err != nil { fmt.Println("Not inside a Git repository."); return }
	fmt.Println("RESUME SESSION")
	fmt.Println("--------------")
	fmt.Println("Branch:", branch)
	if status, e := premiumGit("status", "--short --branch"); e == nil { fmt.Println("\nWorking tree:\n" + status) }
	if log, e := premiumGit("log", "-5", "--date=relative", "--pretty=format:%h  %s (%ar)"); e == nil { fmt.Println("\nRecent commits:\n" + log) }
	if stash, e := premiumGit("stash", "list", "-5"); e == nil && stash != "" { fmt.Println("\nStashes:\n" + stash) }
	if files, e := premiumGit("diff", "--name-only"); e == nil && files != "" { fmt.Println("\nChanged files:\n" + files) }
	fmt.Println("\nNext: run devpilot review --diff, devpilot test, or devpilot ship.")
}

func premiumDaily() {
	fmt.Println("DAILY DEVELOPER BRIEF")
	fmt.Println("---------------------")
	if log, err := premiumGit("log", "--since=24 hours ago", "--date=short", "--pretty=format:%h %ad %s"); err == nil {
		if log == "" { fmt.Println("No commits in the last 24 hours.") } else { fmt.Println("Commits in the last 24 hours:\n" + log) }
	} else { fmt.Println("Git log unavailable:", err) }
	if status, err := premiumGit("status", "--short"); err == nil {
		if status == "" { fmt.Println("\nWorking tree: clean") } else { fmt.Println("\nUncommitted work:\n" + status) }
	}
	if branch, err := premiumGit("branch", "--show-current"); err == nil { fmt.Println("\nCurrent branch:", branch) }
	fmt.Println("\nSuggested next step: review your diff, run tests, and commit one focused change.")
}

func premiumPulse() {
	branch, err := premiumGit("branch", "--show-current")
	if err != nil || branch == "" { fmt.Println("Run this inside a Git repository."); return }
	status, _ := premiumGit("status", "--short")
	commits, _ := premiumGit("rev-list", "--count", "--since=7 days ago", "HEAD")
	files, _ := premiumGit("diff", "--name-only")
	fmt.Println("PROJECT PULSE")
	fmt.Println("-------------")
	fmt.Println("Branch:", branch)
	fmt.Println("Commits (last 7 days):", commits)
	if status == "" { fmt.Println("Working tree: clean") } else { fmt.Printf("Working tree: %d status line(s)\n", len(strings.Split(status, "\n"))) }
	if files == "" { fmt.Println("Unstaged changed files: none") } else { fmt.Println("Unstaged changed files:\n" + files) }
}

func premiumCommit(reader *bufio.Reader) {
	staged, err := premiumGit("diff", "--cached", "--stat")
	if err != nil { fmt.Println("Git error:", err); return }
	if staged == "" {
		fmt.Println("Nothing is staged. Stage only the files you want with git add <file>, then retry.")
		return
	}
	fmt.Println("Staged changes:\n" + staged)
	suggestion := "feat: update project"
	if strings.Contains(strings.ToLower(staged), "test") { suggestion = "test: update tests" } else if strings.Contains(strings.ToLower(staged), "readme") || strings.Contains(strings.ToLower(staged), ".md") { suggestion = "docs: update documentation" }
	message := ask(reader, "Commit message ["+suggestion+"]: ")
	if message == "" { message = suggestion }
	if !premiumConfirm(reader, "Commit staged changes as '"+message+"'?") { fmt.Println("Commit cancelled."); return }
	out, err := premiumGit("commit", "-m", message)
	if out != "" { fmt.Println(out) }
	if err != nil { fmt.Println("Commit failed:", err) }
}
