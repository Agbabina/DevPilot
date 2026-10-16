package main

import (
	"bufio"
	"fmt"
	"os"
	"os/exec"
	"runtime"
	"strings"
)

// Git commands run in the current repository and stream output directly to the terminal.
func handleGit(reader *bufio.Reader) {
	if len(os.Args) < 3 {
		fmt.Println("Usage: devpilot git <status|branch|log|diff|fetch|pull|push>")
		return
	}
	commands := map[string][]string{
		"status": {"status", "--short", "--branch"},
		"branch": {"branch", "--all"},
		"log":    {"log", "--oneline", "--decorate", "-15"},
		"diff":   {"diff", "--"},
		"fetch":  {"fetch", "--all", "--prune"},
		"pull":   {"pull", "--ff-only"},
		"push":   {"push"},
	}
	args, ok := commands[os.Args[2]]
	if !ok {
		fmt.Println("Unknown git command. Choose status, branch, log, diff, fetch, pull, or push.")
		return
	}
	if os.Args[2] == "pull" || os.Args[2] == "push" {
		if ask(reader, "Run git "+os.Args[2]+"? Type yes to confirm: ") != "yes" {
			fmt.Println("Cancelled.")
			return
		}
	}
	runAndStream("git", args...)
}

// handleTerminal is a small interactive loop so common DevPilot actions stay in one terminal.
func handleTerminal(reader *bufio.Reader) {
	fmt.Println("DevPilot terminal — type help for commands, exit to quit.")
	for {
		line := ask(reader, "devpilot> ")
		fields := strings.Fields(line)
		if len(fields) == 0 {
			continue
		}
		switch strings.ToLower(fields[0]) {
		case "exit", "quit":
			return
		case "help":
			fmt.Println("Commands: status, projects, tasks, git status|branch|log|diff|fetch|pull|push, github status|login|repo|prs, doctor, exit")
		case "status":
			status()
		case "projects":
			listProjects()
		case "tasks":
			nextTask(reader)
		case "doctor":
			handleDoctor()
		case "git":
			if len(fields) < 2 {
				fmt.Println("Usage: git <status|branch|log|diff|fetch|pull|push>")
				continue
			}
			oldArgs := os.Args
			os.Args = append([]string{oldArgs[0], "git"}, fields[1:]...)
			handleGit(reader)
			os.Args = oldArgs
		case "github":
			if len(fields) < 2 {
				fmt.Println("Usage: github <status|login|repo|prs>")
				continue
			}
			oldArgs := os.Args
			os.Args = append([]string{oldArgs[0], "github"}, fields[1:]...)
			handleGitHub(reader)
			os.Args = oldArgs
		default:
			fmt.Println("Unknown terminal command. Type help.")
		}
	}
}

// handleRun intentionally executes the user's explicit command; it does not interpret remote input.
func handleRun() {
	if len(os.Args) < 3 {
		fmt.Println("Usage: devpilot run <program> [args...]")
		return
	}
	runAndStream(os.Args[2], os.Args[3:]...)
}

func handleOpen() {
	if len(os.Args) < 3 {
		fmt.Println("Usage: devpilot open <path-or-url>")
		return
	}
	target := os.Args[2]
	var cmd *exec.Cmd
	switch runtime.GOOS {
	case "windows":
		cmd = exec.Command("rundll32", "url.dll,FileProtocolHandler", target)
	case "darwin":
		cmd = exec.Command("open", target)
	default:
		cmd = exec.Command("xdg-open", target)
	}
	if err := cmd.Start(); err != nil {
		fmt.Println("Could not open target:", err)
		return
	}
	fmt.Println("Opened:", target)
}

func handleDoctor() {
	fmt.Println("DevPilot environment check")
	checkTool("git", "--version")
	checkTool("go", "version")
	checkTool("gh", "--version")
	if _, err := exec.LookPath("gh"); err == nil {
		checkTool("gh", "auth", "status")
	} else {
		fmt.Println("GitHub auth: GitHub CLI (gh) not installed; install it to authenticate GitHub.")
	}
	if config.Token == "" {
		fmt.Println("DevPilot API auth: no token found; run devpilot login.")
	} else {
		fmt.Println("DevPilot API auth: token configured (not displayed).")
	}
}

func handleGitHub(reader *bufio.Reader) {
	if len(os.Args) < 3 {
		fmt.Println("Usage: devpilot github <status|login|repo|prs>")
		return
	}
	if _, err := exec.LookPath("gh"); err != nil {
		fmt.Println("GitHub CLI (gh) is required for real GitHub authentication. Install it from https://cli.github.com/")
		return
	}
	switch os.Args[2] {
	case "login":
		runAndStream("gh", "auth", "login")
	case "status":
		runAndStream("gh", "auth", "status")
	case "repo":
		runAndStream("gh", "repo", "view")
	case "prs":
		runAndStream("gh", "pr", "list")
	default:
		fmt.Println("Usage: devpilot github <status|login|repo|prs>")
	}
}

func checkTool(name string, args ...string) {
	if _, err := exec.LookPath(name); err != nil {
		fmt.Printf("%s: not installed\n", name)
		return
	}
	fmt.Printf("%s: ", name)
	runAndStream(name, args...)
}

func runAndStream(program string, args ...string) {
	cmd := exec.Command(program, args...)
	cmd.Stdin = os.Stdin
	cmd.Stdout = os.Stdout
	cmd.Stderr = os.Stderr
	if err := cmd.Run(); err != nil {
		fmt.Printf("\nCommand failed: %v\n", err)
	}
}
