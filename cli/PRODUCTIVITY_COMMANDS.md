# Productivity commands

DevPilot adds lightweight developer workflows that use the tools already installed on your machine.

## Build the Go CLI

Run from the cli directory:

```powershell
go build -o devpilot.exe .
.\devpilot.exe help
```

The CLI adds no Go module dependencies. Git workflows use Git; GitHub PR and issue commands use the GitHub CLI where needed. AI workflows require a reachable DevPilot backend.

## Commands

| Command | Behaviour |
| --- | --- |
| `devpilot ship [commit message]` | Runs a detected project test/build check and Git whitespace checks, displays changed files, then asks before staging, committing, and pushing. It blocks common secret-file names and private-key headers. |
| `devpilot doctor` | Reports Git status/upstream, common tools, project manifests, and local .env presence. It does not install packages or modify files. |
| `devpilot review --diff` | Sends staged and unstaged tracked changes to the AI reviewer for actionable findings. |
| `devpilot explain <question-or-file>` | Explains a programming question or reads a local file and explains its flow and risks. |
| `devpilot fix <error>` | Proposes a minimal fix and patch; it does not edit files automatically. |
| `devpilot resume` | Summarizes the current branch, working tree, recent commits, stashes, and changed files. |
| `devpilot daily` | Shows recent commits and uncommitted work for a quick daily briefing. |
| `devpilot pulse` | Shows the current branch, recent commit count, working-tree status, and unstaged files. |
| `devpilot commit` | Helps commit already-staged files; it never stages files automatically. |
| `devpilot coffee`, `devpilot matrix`, `devpilot motivate` | Small terminal Easter eggs. |

## Safety

- Review the file list before confirming `ship`: it stages all non-ignored changes.
- Never commit credentials, private keys, or local environment files. Secret checks are heuristic, not a guarantee.
- Review and security commands are helpers, not a substitute for tests, full security audits, or human review.
- Dependency inspection lists optional checks and does not download packages automatically.
