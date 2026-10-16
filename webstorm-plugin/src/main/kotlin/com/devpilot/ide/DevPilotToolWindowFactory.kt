package com.devpilot.ide

import com.google.gson.JsonArray
import com.google.gson.JsonObject
import com.google.gson.JsonParser
import com.intellij.credentialStore.CredentialAttributes
import com.intellij.ide.passwordSafe.PasswordSafe
import com.intellij.ide.util.PropertiesComponent
import com.intellij.openapi.project.Project
import com.intellij.openapi.wm.ToolWindow
import com.intellij.openapi.wm.ToolWindowFactory
import com.intellij.ui.components.JBList
import com.intellij.ui.components.JBScrollPane
import com.intellij.ui.components.JBTextField
import java.awt.BorderLayout
import java.awt.GridLayout
import java.net.URI
import java.net.http.HttpClient
import java.net.http.HttpRequest
import java.net.http.HttpResponse
import java.time.Duration
import javax.swing.DefaultListModel
import javax.swing.JButton
import javax.swing.JComboBox
import javax.swing.JLabel
import javax.swing.JOptionPane
import javax.swing.JPanel
import javax.swing.JPasswordField
import javax.swing.JProgressBar
import javax.swing.SwingWorker
import javax.swing.border.EmptyBorder

private const val DEFAULT_API = "https://devpilot-api-vsh2.onrender.com"
private const val API_KEY = "devpilot.api.url"

class DevPilotToolWindowFactory : ToolWindowFactory {
    override fun createToolWindowContent(project: Project, toolWindow: ToolWindow) {
        toolWindow.component.add(DevPilotPanel(project))
    }
}

private data class ProjectChoice(val id: Int, val title: String) {
    override fun toString() = title
}
private data class MilestoneChoice(val id: Int, val title: String, val raw: JsonObject) {
    override fun toString() = title
}
private data class TaskChoice(val id: Int, val title: String, val status: String) {
    val done get() = status.equals("done", true) || status.equals("completed", true)
    override fun toString() = "${if (done) "✓" else "○"}  $title  ($status)"
}

private class DevPilotPanel(private val project: Project) : JPanel(BorderLayout(0, 8)) {
    private val settings = PropertiesComponent.getInstance(project)
    private val client = HttpClient.newBuilder().connectTimeout(Duration.ofSeconds(8)).build()
    private val apiUrl = JBTextField(settings.getValue(API_KEY, DEFAULT_API), 24)
    private val projects = JComboBox<ProjectChoice>()
    private val milestonesModel = DefaultListModel<MilestoneChoice>()
    private val milestones = JBList(milestonesModel)
    private val tasksModel = DefaultListModel<TaskChoice>()
    private val tasks = JBList(tasksModel)
    private val projectProgress = JProgressBar(0, 100)
    private val taskProgress = JProgressBar(0, 100)
    private val message = JLabel("Sign in to load your projects.")
    private val activity = JLabel("")
    private val signIn = JButton("Sign in")
    private val refresh = JButton("Refresh")

    init {
        border = EmptyBorder(12, 12, 12, 12)
        val top = JPanel(BorderLayout(0, 5))
        val heading = JLabel("DevPilot · Project execution")
        heading.font = heading.font.deriveFont(heading.font.size2D + 4f)
        top.add(heading, BorderLayout.NORTH)
        val buttons = JPanel()
        buttons.add(signIn); buttons.add(refresh)
        top.add(buttons, BorderLayout.SOUTH)
        add(top, BorderLayout.NORTH)

        val left = JPanel(BorderLayout(0, 6))
        left.add(JLabel("PROJECT"), BorderLayout.NORTH)
        val projectTop = JPanel(GridLayout(0, 1, 0, 5))
        projectTop.add(projects); projectTop.add(projectProgress)
        left.add(projectTop, BorderLayout.CENTER)
        left.add(JBScrollPane(milestones), BorderLayout.SOUTH)

        val right = JPanel(BorderLayout(0, 6))
        right.add(JLabel("TASKS"), BorderLayout.NORTH)
        right.add(JBScrollPane(tasks), BorderLayout.CENTER)
        val actions = JPanel(GridLayout(0, 1, 0, 5))
        actions.add(taskProgress)
        actions.add(JButton("Mark selected task complete").apply { addActionListener { completeTask() } })
        actions.add(JButton("Add task").apply { addActionListener { addTask() } })
        right.add(actions, BorderLayout.SOUTH)

        val middle = JPanel(GridLayout(1, 2, 10, 0))
        middle.add(left); middle.add(right)
        add(middle, BorderLayout.CENTER)
        val bottom = JPanel(BorderLayout())
        bottom.add(message, BorderLayout.NORTH); bottom.add(activity, BorderLayout.SOUTH)
        add(bottom, BorderLayout.SOUTH)

        signIn.addActionListener { login() }
        refresh.addActionListener { loadProjects() }
        projects.addActionListener { (projects.selectedItem as? ProjectChoice)?.let { loadMilestones(it) } }
        milestones.addListSelectionListener { if (!it.valueIsAdjusting) milestones.selectedValue?.let { m -> loadTasks(m) } }
        if (!token().isNullOrBlank()) loadProjects()
    }

    private fun credentials() = CredentialAttributes("com.devpilot.webstorm.access-token")
    private fun token() = PasswordSafe.getInstance().getPassword(credentials())

    private fun login() {
        val email = JBTextField(24)
        val password = JPasswordField(24)
        val form = JPanel(GridLayout(0, 1, 0, 4))
        form.add(JLabel("DevPilot email")); form.add(email)
        form.add(JLabel("Password")); form.add(password)
        form.add(JLabel("API URL")); form.add(apiUrl)
        if (JOptionPane.showConfirmDialog(this, form, "Sign in to DevPilot",
                JOptionPane.OK_CANCEL_OPTION) != JOptionPane.OK_OPTION) return
        settings.setValue(API_KEY, apiUrl.text.trim().trimEnd('/'))
        background("Signing in…", {
            val body = JsonObject().apply {
                addProperty("email", email.text.trim())
                addProperty("password", String(password.password))
            }
            val result = call("POST", "/auth/login", body, auth = false).asJsonObject
            val accessToken = result.get("accessToken")?.asString ?: error("Login response did not contain accessToken.")
            PasswordSafe.getInstance().setPassword(credentials(), accessToken)
            "Signed in."
        }) { loadProjects() }
    }

    private fun loadProjects() {
        if (token().isNullOrBlank()) { message.text = "Sign in first."; return }
        background("Loading projects…", {
            val data = array("GET", "/projects")
            val choices = data.mapNotNull { item ->
                if (!item.isJsonObject) return@mapNotNull null
                val o = item.asJsonObject
                val id = o.int("id") ?: return@mapNotNull null
                ProjectChoice(id, o.str("name", "title") ?: "Project $id")
            }
            javax.swing.SwingUtilities.invokeLater {
                projects.removeAllItems()
                choices.forEach(projects::addItem)
                if (choices.isNotEmpty()) projects.selectedIndex = 0
                if (choices.isEmpty()) clearLists()
            }
            "Loaded ${choices.size} project(s)."
        })
    }

    private fun loadMilestones(p: ProjectChoice) {
        background("Loading milestones…", {
            val choices = array("GET", "/projects/${p.id}/milestones").mapNotNull { item ->
                if (!item.isJsonObject) return@mapNotNull null
                val o = item.asJsonObject
                val id = o.int("id") ?: return@mapNotNull null
                MilestoneChoice(id, o.str("name", "title") ?: "Milestone $id", o)
            }
            javax.swing.SwingUtilities.invokeLater {
                milestonesModel.clear(); tasksModel.clear()
                choices.forEach(milestonesModel::addElement)
                val done = choices.count { it.raw.str("status") in listOf("done", "completed") }
                projectProgress.value = if (choices.isEmpty()) 0 else done * 100 / choices.size
                projectProgress.string = "Milestones $done / ${choices.size}"
                projectProgress.isStringPainted = true
                if (choices.isNotEmpty()) milestones.selectedIndex = 0
            }
            "Loaded ${choices.size} milestone(s)."
        })
    }

    private fun loadTasks(m: MilestoneChoice) {
        background("Loading tasks…", {
            val choices = array("GET", "/milestones/${m.id}/tasks").mapNotNull { item ->
                if (!item.isJsonObject) return@mapNotNull null
                val o = item.asJsonObject
                val id = o.int("id") ?: return@mapNotNull null
                TaskChoice(id, o.str("title", "name", "description") ?: "Task $id", o.str("status") ?: "todo")
            }
            javax.swing.SwingUtilities.invokeLater {
                tasksModel.clear(); choices.forEach(tasksModel::addElement)
                val done = choices.count { it.done }
                taskProgress.value = if (choices.isEmpty()) 0 else done * 100 / choices.size
                taskProgress.string = "Tasks $done / ${choices.size} complete"
                taskProgress.isStringPainted = true
            }
            "Loaded ${choices.size} task(s) for ${m.title}."
        })
    }

    private fun completeTask() {
        val task = tasks.selectedValue ?: run { message.text = "Select a task first."; return }
        if (task.done) { message.text = "Task is already complete."; return }
        if (JOptionPane.showConfirmDialog(this, "Mark '${task.title}' complete?", "Complete task",
                JOptionPane.OK_CANCEL_OPTION) != JOptionPane.OK_OPTION) return
        background("Updating task…", {
            call("PATCH", "/tasks/${task.id}", JsonObject().apply { addProperty("status", "completed") })
            "Task updated."
        }) { milestones.selectedValue?.let { loadTasks(it) } }
    }

    private fun addTask() {
        val milestone = milestones.selectedValue ?: run { message.text = "Select a milestone first."; return }
        val title = JOptionPane.showInputDialog(this, "Task title")?.trim().orEmpty()
        if (title.isBlank()) return
        background("Creating task…", {
            call("POST", "/milestones/${milestone.id}/tasks", JsonObject().apply { addProperty("title", title) })
            "Task created."
        }) { loadTasks(milestone) }
    }

    private fun clearLists() {
        milestonesModel.clear(); tasksModel.clear()
        projectProgress.value = 0; taskProgress.value = 0
    }

    private fun background(label: String, work: () -> String, success: (() -> Unit)? = null) {
        activity.text = label
        signIn.isEnabled = false; refresh.isEnabled = false
        object : SwingWorker<String, Void>() {
            override fun doInBackground() = work()
            override fun done() {
                signIn.isEnabled = true; refresh.isEnabled = true; activity.text = ""
                try { message.text = get(); success?.invoke() }
                catch (e: Exception) { message.text = e.cause?.message ?: e.message ?: "Request failed." }
            }
        }.execute()
    }

    private fun array(method: String, path: String): List<JsonElement> {
        val result = call(method, path)
        if (result.isJsonArray) return result.asJsonArray.toList()
        if (result.isJsonObject) {
            val obj = result.asJsonObject
            for (key in listOf("data", "items", "results")) {
                val value = obj.get(key)
                if (value != null && value.isJsonArray) return value.asJsonArray.toList()
            }
        }
        return emptyList()
    }

    private fun call(method: String, path: String, body: JsonObject? = null, auth: Boolean = true): JsonElement {
        val base = apiUrl.text.trim().trimEnd('/').ifBlank { DEFAULT_API }
        val builder = HttpRequest.newBuilder().uri(URI.create(base + path))
            .timeout(Duration.ofSeconds(25)).header("Accept", "application/json")
        if (auth) builder.header("Authorization", "Bearer ${token() ?: error("Sign in first.")}")
        if (body != null) builder.header("Content-Type", "application/json")
        builder.method(method, body?.let { HttpRequest.BodyPublishers.ofString(it.toString()) }
            ?: HttpRequest.BodyPublishers.noBody())
        val response = client.send(builder.build(), HttpResponse.BodyHandlers.ofString())
        if (response.statusCode() !in 200..299) {
            val detail = runCatching { JsonParser.parseString(response.body()).asJsonObject.str("message") }.getOrNull()
            error(detail ?: "DevPilot API returned HTTP ${response.statusCode()}.")
        }
        return response.body().takeIf { it.isNotBlank() }?.let(JsonParser::parseString) ?: JsonObject()
    }

    private fun JsonObject.int(key: String): Int? =
        get(key)?.takeIf { !it.isJsonNull }?.let { runCatching { it.asInt }.getOrNull() }
    private fun JsonObject.str(vararg keys: String): String? = keys.firstNotNullOfOrNull { key ->
        get(key)?.takeIf { !it.isJsonNull && it.isJsonPrimitive }?.asString?.takeIf { it.isNotBlank() }
    }
}
