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

const (
	pColorReset = "\x1b[0m"
	pColorCyan = "\x1b[36m"
	pColorGreen = "\x1b[32m"
	pColorYellow = "\x1b[33m"
	pColorDim = "\x1b[2m"
	pColorBold = "\x1b[1m"
)

func pColor(code, s string) string {
	if os.Getenv("NO_COLOR") != "" || strings.EqualFold(os.Getenv("TERM"), "dumb") { return s }
	return code + s + pColorReset
}
func pCyan(s string) string { return pColor(pColorCyan, s) }
func pGreen(s string) string { return pColor(pColorGreen, s) }
func pYellow(s string) string { return pColor(pColorYellow, s) }
func pDim(s string) string { return pColor(pColorDim, s) }
func pBold(s string) string { return pColor(pColorBold, s) }

func handleProductivity(reader *bufio.Reader, command string, args []string) {
	switch command {
	case "focus":
		minutes := 25
		if len(args) > 0 {
			n, err := strconv.Atoi(args[0])
			if err != nil || n < 1 || n > 180 { fmt.Println("Usage: devpilot focus [1-180 minutes]"); return }
			minutes = n
		}
		fmt.Println(pCyan("╭──────────────────────────────────────────────╮"))
		fmt.Println(pCyan("│              DEVPILOT FOCUS MODE              │"))
		fmt.Println(pCyan("╰──────────────────────────────────────────────╯"))
		fmt.Printf("  %s %d minutes. One task. No tab-hopping.\n", pGreen("▶"), minutes)
		fmt.Println(pDim("  Press Ctrl+C to stop early. Keep this terminal open."))
		end := time.Now().Add(time.Duration(minutes) * time.Minute)
		for {
			left := time.Until(end)
			if left <= 0 { break }
			fmt.Printf("\r  %s %02d:%02d remaining ", pYellow("FOCUS"), int(left.Minutes()), int(left.Seconds())%60)
			time.Sleep(time.Second)
		}
		fmt.Printf("\r  %s Session complete — take a 5 minute break.                 \n", pGreen("✓"))
	case "standup":
		fmt.Println(pBold("DAILY STAND-UP"))
		runProductivityGit("log", "-5", "--date=short", "--pretty=format:  • %h %ad %s")
		fmt.Println()
		runProductivityGit("status", "--short")
		fmt.Println(pDim("  Tip: mention one win, one next step, and one blocker."))
	case "wip":
		fmt.Println(pBold("WORK IN PROGRESS"))
		runProductivityGit("status", "--short", "--branch")
		fmt.Println()
		runProductivityGit("diff", "--stat")
		fmt.Println(pDim("\n  No files changed? Start with devpilot next or devpilot task start."))
	case "checkpoint":
		branch := productGitOutput("branch", "--show-current")
		commit := productGitOutput("log", "-1", "--pretty=%h %s")
		status := productGitOutput("status", "--short --branch")
		note := strings.TrimSpace(strings.Join(args, " "))
		var b strings.Builder
		b.WriteString("# DevPilot Checkpoint\n\n")
		b.WriteString("- Saved: " + time.Now().Format(time.RFC3339) + "\n")
		b.WriteString("- Branch: " + fallback(branch, "(not a Git repository)") + "\n")
		b.WriteString("- Last commit: " + fallback(commit, "(none)") + "\n\n## Git status\n\n")
		b.WriteString("    " + strings.ReplaceAll(fallback(status, "Git status unavailable"), "\n", "\n    ") + "\n")
		if note != "" { b.WriteString("\n## Resume note\n\n" + note + "\n") }
		if err := os.WriteFile(".devpilot-checkpoint.md", []byte(b.String()), 0644); err != nil { fmt.Println("Could not save checkpoint:", err); return }
		fmt.Println(pGreen("✓ Checkpoint saved to .devpilot-checkpoint.md"))
		fmt.Println(pDim("  Add a resume note: devpilot checkpoint finish auth flow"))
	case "todo":
		productivityTodoScan()
	case "map":
		count := 0
		productivityTree(".", 0, 3, &count)
	case "note":
		note := strings.TrimSpace(strings.Join(args, " "))
		if note == "" { fmt.Println("Usage: devpilot note <something to remember>"); return }
		f, err := os.OpenFile(".devpilot-notes.md", os.O_CREATE|os.O_APPEND|os.O_WRONLY, 0644)
		if err != nil { fmt.Println("Could not save note:", err); return }
		defer f.Close()
		if _, err := fmt.Fprintf(f, "- [%s] %s\n", time.Now().Format("2006-01-02 15:04"), note); err != nil { fmt.Println("Could not save note:", err); return }
		fmt.Println(pGreen("✓ Note saved to .devpilot-notes.md"))
	case "notes":
		data, err := os.ReadFile(".devpilot-notes.md")
		if err != nil { fmt.Println("No notes yet. Add one with devpilot note remember this."); return }
		fmt.Print(string(data))
	case "count":
		files, lines := 0, 0
		_ = filepath.WalkDir(".", func(path string, d os.DirEntry, err error) error {
			if err != nil { return nil }
			if d.IsDir() {
				switch d.Name() { case ".git", "node_modules", "vendor", "dist", "build", ".next", "target": return filepath.SkipDir }
				return nil
			}
			if !productivitySource(path) { return nil }
			data, err := os.ReadFile(path); if err != nil { return nil }
			files++; lines += strings.Count(string(data), "\n")
			return nil
		})
		fmt.Println(pCyan("PROJECT SIZE"))
		fmt.Printf("  %s %d source files\n", pGreen("▦"), files)
		fmt.Printf("  %s %d lines (quick estimate)\n", pGreen("≋"), lines)
		fmt.Println(pDim("  Excludes dependencies and generated build folders."))
	case "recent":
		fmt.Println(pBold("RECENT COMMITS"))
		runProductivityGit("log", "-10", "--date=short", "--pretty=format:%C(cyan)%h%C(reset)  %ad  %s")
		fmt.Println()
	default:
		fmt.Println("Unknown productivity command:", command)
	}
}

func runProductivityGit(args ...string) {
	cmd := exec.Command("git", args...)
	cmd.Stdout, cmd.Stderr = os.Stdout, os.Stderr
	if err := cmd.Run(); err != nil {
		if _, lookErr := exec.LookPath("git"); lookErr != nil { fmt.Println("Git is not installed or not on PATH.") } else { fmt.Println(pDim("(Git command unavailable in this folder.)")) }
	}
}
func productGitOutput(args ...string) string {
	out, err := exec.Command("git", args...).Output()
	if err != nil { return "" }
	return strings.TrimSpace(string(out))
}
func fallback(s, def string) string { if strings.TrimSpace(s) == "" { return def }; return strings.TrimSpace(s) }

func productivitySource(path string) bool {
	switch strings.ToLower(filepath.Ext(path)) {
	case ".go", ".js", ".jsx", ".ts", ".tsx", ".py", ".java", ".kt", ".cs", ".cpp", ".c", ".h", ".hpp", ".rs", ".php", ".rb", ".swift", ".sql", ".html", ".css", ".scss", ".sh", ".ps1", ".yaml", ".yml", ".toml":
		return true
	default: return false
	}
}
func productivityTodoScan() {
	type hit struct { path string; line int; text string }
	hits := make([]hit, 0, 64)
	_ = filepath.WalkDir(".", func(path string, d os.DirEntry, err error) error {
		if err != nil { return nil }
		if d.IsDir() {
			switch d.Name() { case ".git", "node_modules", "vendor", "dist", "build", ".next", "target", ".idea": return filepath.SkipDir }
			return nil
		}
		if !productivitySource(path) { return nil }
		f, err := os.Open(path); if err != nil { return nil }; defer f.Close()
		scanner := bufio.NewScanner(f); line := 0
		for scanner.Scan() {
			line++; s := strings.TrimSpace(scanner.Text()); upper := strings.ToUpper(s)
			for _, marker := range []string{"TODO", "FIXME", "HACK", "BUG"} {
				if strings.Contains(upper, marker) { hits = append(hits, hit{path, line, s}); break }
			}
			if len(hits) >= 300 { return filepath.SkipAll }
		}
		return nil
	})
	sort.Slice(hits, func(i,j int) bool { if hits[i].path == hits[j].path { return hits[i].line < hits[j].line }; return hits[i].path < hits[j].path })
	fmt.Println(pBold("CODE TODO RADAR"))
	if len(hits) == 0 { fmt.Println(pGreen("  ✓ No TODO/FIXME/HACK/BUG markers found.")); return }
	for _, h := range hits { fmt.Printf("  %s %s:%d  %s\n", pYellow("•"), h.path, h.line, h.text) }
	if len(hits) >= 300 { fmt.Println(pDim("  Results capped at 300 matches.")) }
	fmt.Printf("\n  %s %d markers found\n", pCyan("↳"), len(hits))
}

func productivityTree(root string, depth, maxDepth int, count *int) {
	if depth == 0 { fmt.Println(pCyan("PROJECT MAP  ./")) }
	if depth > maxDepth || *count >= 100 { return }
	entries, err := os.ReadDir(root); if err != nil { return }
	for _, entry := range entries {
		name := entry.Name()
		if strings.HasPrefix(name, ".") || name == "node_modules" || name == "vendor" || name == "dist" || name == "build" || name == "target" { continue }
		if *count >= 100 { fmt.Println("  … (map capped at 100 entries)"); return }
		*count = *count + 1
		prefix := strings.Repeat("  ", depth+1)
		if entry.IsDir() {
			fmt.Printf("%s%s/\n", prefix, pCyan(name))
			if depth < maxDepth { productivityTree(filepath.Join(root, name), depth+1, maxDepth, count) }
		} else { fmt.Printf("%s%s\n", prefix, name) }
	}
}
