# DevPilot CLI

DevPilot is a lightweight developer CLI for Git workflows, code inspection, AI explanations, and project momentum. The Go CLI uses the Go standard library for its local workflows; AI commands call the configured DevPilot API.

## Build

From this directory:

```powershell
go build -o devpilot.exe .
.\devpilot.exe help
```

No extra Go modules are required for the CLI itself. Some commands use tools you may already have installed, such as Git, GitHub CLI (`gh`), Node/npm, Go, or your project's test runner.

## Release and productivity workflows

| Command | What it does |
| --- | --- |
| `devpilot ship [message]` | Runs a detected test/build check and Git whitespace checks, shows changed files, asks before staging/committing/pushing, and blocks common secret-file names and private-key headers. |
| `devpilot doctor` | Checks Git state, upstream configuration, common tools, project manifests, and local .env presence. It does not install or change anything. |
| `devpilot review --diff` | Sends staged and unstaged tracked changes to the AI reviewer for actionable feedback. |
| `devpilot explain <question-or-file>` | Explains a programming question or reads a local file and explains its flow and risks. |
| `devpilot fix <error>` | Proposes a minimal fix and patch; it does not edit files automatically. |
| `devpilot resume` | Summarizes the current branch, working tree, recent commits, stashes, and changed files. |
| `devpilot daily` | Shows recent commits and uncommitted work for a quick daily briefing. |
| `devpilot pulse` | Shows branch, last-seven-days commit count, working-tree status, and unstaged files. |
| `devpilot commit` | Helps commit already-staged files; it never stages files automatically. |
| `devpilot coffee` | A tiny caffeine-powered Easter egg. |
| `devpilot matrix` | A terminal Easter egg for the curious. |
| `devpilot motivate` | A short developer pep talk. |

Existing commands include `pr draft/create/review/merge/checks`, `issue`, `release`, `inspect`, `security`, `impact`, `deps`, and `test`.

## Important safety notes

- `ship` can stage all non-ignored changes. Review the displayed status before confirming; keep credentials and private data out of the repository.
- `ship` requires confirmation before staging, committing, and pushing. It may leave files staged if a secret-looking filename or private-key header is detected so you can inspect them.
- `review`, `inspect`, and `security` are helpers, not guarantees or substitutes for tests, a full security audit, or human review.
- `deps` lists optional checks; it does not download packages or automatically audit them.
- AI commands require a reachable DevPilot backend configured through the CLI's existing configuration.
