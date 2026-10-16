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
| `devpilot inspect` | Combines heuristic checks, a project inventory, and an optional AI architecture/risk review using a bounded selection of files. Prompts before sending excerpts to the configured backend. |
| `devpilot inspect map` | Lists common manifests, source file counts, and a shallow directory map. |
| `devpilot inspect todo` | Finds TODO/FIXME/HACK/XXX markers in supported source files. |
| `devpilot inspect hotspots` | Ranks files changed most often across the last 50 commits; frequency is a testing hint, not proof of a bug. |
| `devpilot inspect checkpoint` | Summarizes branch status, recent commits, staged/unstaged diff stats, and recent stashes. |
| `devpilot inspect onboard` | Builds an AI onboarding guide from a bounded set of manifests and source excerpts, with consent before sending context. |
| `devpilot explain <question-or-file>` | Explains a programming question or reads a local file and explains its flow and risks. |
| `devpilot fix <error>` | Proposes a minimal fix and patch; it does not edit files automatically. |
| `devpilot resume` | Summarizes the current branch, working tree, recent commits, stashes, and changed files. |
| `devpilot daily` | Shows recent commits and uncommitted work for a quick daily briefing. |
| `devpilot pulse` | Shows the current branch, recent commit count, working-tree status, and unstaged files. |
| `devpilot commit` | Helps commit already-staged files; it never stages files automatically. |
| `devpilot coffee`, `devpilot matrix`, `devpilot motivate` | Small terminal Easter eggs. |

## Safety

- `inspect` and `inspect onboard` only send the displayed, bounded context after you type `yes`; they do not upload the whole repository. Excerpts are still code, so review the listed files before consenting.
- `inspect todo` and `inspect hotspots` are heuristic helpers; neither determines correctness by itself.

- Review the file list before confirming `ship`: it stages all non-ignored changes.
- Never commit credentials, private keys, or local environment files. Secret checks are heuristic, not a guarantee.
- Review and security commands are helpers, not a substitute for tests, full security audits, or human review.
- Dependency inspection lists optional checks and does not download packages automatically.
