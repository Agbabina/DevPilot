# DevPilot terminal-first CLI

## Git workflows

Run these from a Git repository:

```sh
devpilot git status
devpilot git branch
devpilot git log
devpilot git diff
devpilot git fetch
devpilot git pull --confirm
devpilot git push --confirm
```

Pull and push require the explicit `--confirm` flag to avoid accidental remote changes.

## Stay in the terminal

- `devpilot terminal` opens an interactive DevPilot command loop.
- `devpilot run <program> [args...]` runs a command and streams its output.
- `devpilot open <path-or-url>` opens a local path or URL with the operating system's default handler.
- `devpilot doctor` checks Node, Git, GitHub CLI, GitHub authentication, and DevPilot API configuration.

## Real GitHub authentication

GitHub auth is handled by the official GitHub CLI, not a fake DevPilot token:

```sh
devpilot github login
devpilot github status
devpilot github repo
devpilot github prs
```

Install `gh` from https://cli.github.com/ first. `devpilot github login` runs `gh auth login`, which performs GitHub's real device/browser authentication flow. GitHub credentials remain managed by `gh`; DevPilot does not store a GitHub password or token in its own config.

DevPilot account authentication remains separate:

```sh
devpilot login
devpilot whoami
devpilot logout
```

The local `.devpilot` file stores the DevPilot API URL and JWT. Do not commit it.
