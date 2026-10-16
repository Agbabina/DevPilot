# DevPilot CLI productivity commands

These commands are implemented in the Go CLI and use only the Go standard library.

## Context switching

```sh
devpilot context switch <project-id>
```

Captures the repository path, current branch, Git working-tree status, terminal identity, and the optional `DEVPILOT_TERMINAL_FLAGS` value. It loads the project and milestone/task data from the configured DevPilot API and stores a local snapshot under `~/.devpilot/contexts/`. If a previous context has a different branch, DevPilot checks out that branch only when the working tree is clean. Uncommitted changes are never stashed, reset, or discarded automatically.

Add optional project-specific material in the repository:
- `.devpilot/notes.md` — task notes and decisions.
- `.devpilot/links.txt` — relevant URLs, one per line.

The CLI records the names of common `.env` files only; it never copies their contents into a context snapshot. It also does not attempt to infer arbitrary terminal emulator flags. Set `DEVPILOT_TERMINAL_FLAGS` yourself if you want to preserve a shell-specific flag string.

## Standup

```sh
devpilot standup
```

Builds a Markdown standup in the current repository, combining Git commits from the previous 24 hours with DevPilot tasks marked in progress or completed. The output is printed and saved as `standup-YYYY-MM-DD.md`. If the API is offline, the report still includes Git activity and marks task statuses as unavailable.

## Focus timer

```sh
devpilot focus 25
devpilot focus 50 --task 123
```

Runs a terminal focus timer and saves a session record locally in `~/.devpilot/focus-sessions.json`. The currently active DevPilot project is associated automatically; `--task` optionally associates a task ID. This is a terminal timer, not yet a native OS status-bar integration, and it measures elapsed session time rather than keyboard/mouse activity.

## Offline queue and sync

Mutating project/task/resource API requests are queued in `~/.devpilot/outbox.json` when the backend cannot be reached. The CLI retries queued changes at the start of later commands, or on demand:

```sh
devpilot sync
```

Requests are replayed in order and remain queued after a failed replay. Authentication and AI requests are intentionally never queued. Context snapshots and focus logs remain local files; syncing those records into the web UI requires corresponding backend endpoints and is not included in this CLI-only change.

## PR and message drafts

```sh
devpilot pr draft
devpilot pr create
devpilot message
```

Creates `.devpilot/pr-draft.md` and `.devpilot/message-draft.txt` from the current Git diff/status and recent commit history. `devpilot pr create` generates the same drafts and then invokes GitHub CLI (`gh pr create`) to open a pull request; install `gh` and run `gh auth login` first. Review the generated draft before creating a PR. `devpilot message` writes a suggested message locally and does not publish it automatically.
