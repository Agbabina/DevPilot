# DevPilot

**A terminal-first developer toolkit for understanding projects, organizing work, and shipping code with more confidence.**

DevPilot combines project and task workflows with AI-assisted explanations, repository inspection, code review helpers, and GitHub pull-request routines.

## Try it

- **Product:** https://dev-pilot-ashy.vercel.app
- **CLI installer:** https://dev-pilot-ashy.vercel.app/cli
- **Command guide:** https://dev-pilot-ashy.vercel.app/docs
- **Source and feedback:** https://github.com/Agbabina/DevPilot

### Download or install the CLI

**Windows executable:** [Download `devpilot.exe`](https://github.com/Agbabina/DevPilot/releases/latest/download/devpilot.exe). Save it in a folder on your `PATH` to run `devpilot ship` from any project, or use the installer below to set up the command automatically.

### Install the CLI

Windows PowerShell:

```powershell
irm https://raw.githubusercontent.com/Agbabina/DevPilot/feature/devpilot-git-inspection/scripts/install.ps1 | iex
```

macOS / Linux:

```sh
curl -fsSL https://raw.githubusercontent.com/Agbabina/DevPilot/feature/devpilot-git-inspection/scripts/install.sh | bash
```

The Windows installer downloads the release as `devpilot.exe` and adds its folder to your user PATH. macOS/Linux installers use their platform-specific release binaries. If a release binary is unavailable, installers fall back to building from source and require Go 1.25.7 or newer; macOS/Linux source fallback also needs `curl` and `unzip`.

Verify installation:

```sh
devpilot help
devpilot doctor
devpilot inspect map
```

### A better project → milestone → task workflow

DevPilot remembers the project and milestone you're working in, so everyday commands no longer need a chain of IDs.

```powershell
devpilot init
devpilot login
devpilot project create
# Give the project a name, then choose an AI plan, a quick manual plan, or plan later.
devpilot use
devpilot status
devpilot next
devpilot task finish
```

You can also create work inline:

```powershell
devpilot project create "Portfolio rebuild" --desc "Ship my developer portfolio" --priority high --manual
devpilot milestone create "Portfolio foundation"
devpilot task create "Build responsive homepage" --priority high
devpilot task create "Add project cards" -p medium
```

When entering a manual plan, add multiple milestones and tasks one line at a time; submit a blank line to finish the current list. Use `devpilot use` to change the active project or milestone. The `.devpilot` file stores this context alongside the API URL and login token, so keep it out of Git.

### Configure your backend

The CLI defaults to the hosted DevPilot API. To use a different backend, set `DEVPILOT_API_URL` before running the CLI. Sign in with `devpilot login`; your local `.devpilot` file contains the saved token, so do not commit it.

### GitHub commands

Pull-request and issue workflows use the GitHub CLI (`gh`). Install it separately and authenticate with `gh auth login` before running `devpilot pr create`, `devpilot pr checks`, `devpilot pr merge`, or `devpilot issue`.

## Documentation

The [command guide](https://dev-pilot-ashy.vercel.app/docs) explains what each CLI command does, when to use it, examples, and safety notes. It includes project, milestone, task, AI, inspection, code-quality, GitHub, and terminal-extra commands.

## Safety notes

- AI inspection displays its selected context and asks before sending bounded code excerpts to the backend. Review the list before consenting.
- `devpilot ship` asks before staging, committing and pushing; still review the file list and never commit secrets.
- Security scans and AI reviews are helpers, not a full security audit or proof of correctness.
- Review destructive project/task commands and verify IDs before running them.

## Development

Frontend (React, TypeScript, Vite):

```sh
npm install
npm run dev
npm run build
```

CLI (Go):

```sh
cd cli
go test ./...
go build -o devpilot .
```

Tagged releases beginning with `v` trigger the CLI release workflow, which tests the Go CLI and publishes Windows, macOS and Linux binaries with SHA-256 checksums.
