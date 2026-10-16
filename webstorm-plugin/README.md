# DevPilot for WebStorm

A task- and milestone-focused WebStorm plugin. Project execution is the primary experience; AI is an optional helper inside the workflow.

## MVP
- Sign in with an existing DevPilot account.
- Store the access token in the IDE Password Safe.
- Load projects and browse their milestones.
- View tasks within a milestone and basic completion progress.
- Add a task to a milestone.
- Mark a selected task complete after confirmation.
- Configure the API URL.

## Build
Requires JDK 21 and network access for the first Gradle dependency download. Open this directory in WebStorm or IntelliJ IDEA and run Gradle task `runIde` to launch a sandbox IDE.

Build tasks:
```powershell
.gradlew.bat verifyPlugin
.gradlew.bat buildPlugin
```

A Gradle wrapper is not committed yet. If Gradle is installed locally, generate it from this directory with `gradle wrapper --gradle-version 8.13`.

## API endpoints
- `POST /auth/login`
- `GET /projects`
- `GET /projects/:projectId/milestones`
- `GET /milestones/:milestoneId/tasks`
- `POST /milestones/:milestoneId/tasks`
- `PATCH /tasks/:id`

AI and Git automation are deliberately deferred until the task/milestone loop is solid.

## Security
Passwords are sent to the configured API and are not persisted. Access tokens are stored with the IDE Password Safe. Review authorization on task and milestone API endpoints before treating the API as suitable for untrusted clients.
