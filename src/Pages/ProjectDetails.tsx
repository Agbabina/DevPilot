import { useEffect, useState } from "react";
import {
  ArrowLeft,
  Plus,
  Trash2,
  Save,
  Sparkles,
} from "lucide-react";
import { useNavigate, useParams } from "react-router-dom";

import {
  projectService,
  type Milestone,
  type Project,
  type Task,

  MilestoneStatus,
} from "../services/projectService";
import MilestoneList from "../Component/MilestonesList";

function ProjectDetails() {
  const navigate = useNavigate();
  const { projectId } = useParams();

  const [project, setProject] = useState<Project | null>(null);
  const [description, setDescription] = useState("");
  const [goals, setGoals] = useState("");
  const [requirements, setRequirements] = useState("");
  const [integrations, setIntegrations] = useState<string[]>([]);
  const [githubUrl, setGithubUrl] = useState("");
  const [aiContext, setAiContext] = useState("");
  const [generatedTasks, setGeneratedTasks] = useState<Record<number, any[]>>({});
  const [milestones, setMilestones] = useState<Milestone[]>([]);
  const [milestoneTasks, setMilestoneTasks] = useState<Record<number, Task[]>>({});
  const [activeTaskCreator, setActiveTaskCreator] = useState<number | null>(null);
  const [taskDrafts, setTaskDrafts] = useState<Record<number, string>>({});
  const [creatingTask, setCreatingTask] = useState<number | null>(null);
  const [justCreatedTask, setJustCreatedTask] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState("");
  const [xpError, setXpError] = useState<string | null>(null);
  const TASK_XP_VALUES = [10, 25, 50, 75, 100];

  const randomTaskXp = () =>
  TASK_XP_VALUES[Math.floor(Math.random() * TASK_XP_VALUES.length)];
  useEffect(() => {
    async function loadProject() {
      if (!projectId) {
        setError("Project id is required.");
        setLoading(false);
        return;
      }

      try {
        const currentProject = await projectService.getOne(Number(projectId));
        const currentMilestones = await projectService.getMilestones(
            Number(projectId),
        );

        setProject(currentProject);
        setDescription(currentProject.description ?? "");
        setGoals(currentProject.goals ?? "");
        setRequirements(currentProject.requirements ?? "");
        setIntegrations(currentProject.integrations ?? []);
        setGithubUrl(currentProject.githubUrl ?? "");
        setMilestones(currentMilestones);
      } catch (loadError) {
        console.error(loadError);
        setError("Failed to load project details.");
      } finally {
        setLoading(false);
      }
    }

    loadProject();
  }, [projectId]);


  // Calculate total XP available vs earned XP
  const allTasksList = Object.values(milestoneTasks).flat();

  const completedTasksXp = allTasksList
      .filter((task) => task.status === "COMPLETED")
      .reduce((sum, task) => sum + (task.xpReward || 0), 0);

  const completedMilestonesXp = milestones
      .filter((m) => m.status === MilestoneStatus.COMPLETED)
      .reduce((sum, m) => sum + (m.xpReward || 0), 0);

  const earnedXp = completedTasksXp + completedMilestonesXp;

  const totalAvailableXp =
      (project?.xpReward || 0) +
      milestones.reduce((sum, m) => sum + (m.xpReward || 0), 0) +
      allTasksList.reduce((sum, t) => sum + (t.xpReward || 0), 0);

  function addMilestone() {
    setMilestones((current) => [
      ...current,
      {
        id: -Date.now(),
        title: "",
        description: "",
        status: MilestoneStatus.TODO,
        progress: 0,
        order: current.length + 1,
        xpReward: 0,
        projectId: Number(projectId),
        createdAt: new Date().toISOString(),
        completedAt: null,
        updatedAt: new Date().toISOString(),
      },
    ]);
  }

  function updateMilestone(id: number, field: "title" | "description", value: string) {
    setMilestones((current) => current.map((m) => (m.id === id ? { ...m, [field]: value } : m)));
  }

  function toggleMilestone(id: number) {
    setMilestones((current) =>
        current.map((m) =>
            m.id === id
                ? { ...m, status: m.status === MilestoneStatus.COMPLETED ? MilestoneStatus.TODO : MilestoneStatus.COMPLETED }
                : m,
        ),
    );
  }

  async function deleteMilestone(id: number) {
    if (id > 0) await projectService.deleteMilestone(id);
    setMilestones((current) => current.filter((m) => m.id !== id));
    setMilestoneTasks((current) => {
      const { [id]: _removed, ...rest } = current;
      return rest;
    });
  }

  async function addTask(milestone: Milestone) {
    const title = taskDrafts[milestone.id]?.trim();
    if (!title) return;
    setCreatingTask(milestone.id);
    try {
      const order = (milestoneTasks[milestone.id]?.length ?? 0) + 1;
      if (milestone.id <= 0) {
        const task = {
          id: -(Date.now()),
          title,
          status: "TODO" as Task["status"],
          priority: "MEDIUM" as Task["priority"],
          order,
          xpReward: 0,
          milestoneId: milestone.id,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        };
        setMilestoneTasks((current) => ({ ...current, [milestone.id]: [...(current[milestone.id] ?? []), task] }));
        setJustCreatedTask(task.id);
      } else {
        const task = await projectService.createTask(milestone.id, { title, order });
        setMilestoneTasks((current) => ({ ...current, [milestone.id]: [...(current[milestone.id] ?? []), task] }));
        setJustCreatedTask(task.id);
      }
      setTaskDrafts((current) => ({ ...current, [milestone.id]: "" }));
    } finally {
      setCreatingTask(null);
    }
  }

  function toggleTask(task: Task) {
    setMilestoneTasks((current) =>
        Object.fromEntries(
            Object.entries(current).map(([key, items]) => [
              key,
              items.map((item) =>
                  item.id === task.id
                      ? { ...item, status: item.status === "COMPLETED" ? "TODO" : "COMPLETED" }
                      : item,
              ),
            ]),
        ),
    );
  }

  const completedMilestones = milestones.filter(
      (milestone) => milestone.status === MilestoneStatus.COMPLETED,
  ).length;

  const progress =
      milestones.length === 0
          ? 0
          : Math.round((completedMilestones / milestones.length) * 100);

  async function generateProjectPlan() {
    if (!project) return;
    try {
      setGenerating(true);
      const result = await projectService.generateProject({
        name: project.name,
        goal: aiContext || description || `Create and complete the ${project!.name} project`,
        priority: project.priority,
      });

      setDescription(result.description ?? description);
      setProject((current) =>
          current ? { ...current, xpReward: Number(result.xpReward ?? current.xpReward ?? 0) } : current,
      );

      const resultMilestones = result.milestones ?? [];

      // Assign each generated milestone a stable, unique temp id up front so
      // that milestones and their tasks can be keyed/looked-up consistently
      // (previously every generated milestone shared id: 0, which caused
      // task lookups in saveProject() to collapse onto the first milestone).
      const tempIds = resultMilestones.map((_: any, index: number) => -(Date.now() + index + 1));

      const usedTaskTitles = new Set<string>();
      const newMilestoneTasks: Record<number, any[]> = {};
      const newGeneratedTasks: Record<number, any[]> = {};

      resultMilestones.forEach((item: any, index: number) => {
        const tempId = tempIds[index];
        const rawTasks = item.tasks ?? [];
        newGeneratedTasks[tempId] = rawTasks;

        const deduped = rawTasks
            .filter((task: any) => {
              const key = String(task.title ?? "")
                  .trim()
                  .toLowerCase()
                  .replace(/[^a-z0-9 ]/g, "");
              const duplicate = [...usedTaskTitles].some(
                  (existing) =>
                      existing === key ||
                      existing.includes(key) ||
                      key.includes(existing) ||
                      key.split(" ").filter((word) => word.length > 3 && existing.includes(word)).length >= 2,
              );
              if (!key || duplicate) return false;
              usedTaskTitles.add(key);
              return true;
            })
            .map((task: any, taskIndex: number) => ({
              ...task,
              id: task.id ?? -(index * 1000 + taskIndex + 1),
              milestoneId: tempId,
              order: task.order ?? taskIndex + 1,
              xpReward: Math.max(1, Number(task.xpReward ?? 0)),
            }));

        newMilestoneTasks[tempId] = deduped;
      });

      setGeneratedTasks(newGeneratedTasks);
      setMilestoneTasks(newMilestoneTasks);

      setMilestones(
          resultMilestones.map((item: { title: string; description: string; xpReward: number }, index: number) => ({
            id: tempIds[index],
            title: item.title,
            description: item.description,
            status: MilestoneStatus.TODO,
            progress: 0,
            order: index + 1,
            xpReward: item.xpReward ?? 0,
            projectId: Number(projectId),
            createdAt: new Date().toISOString(),
            completedAt: null,
            updatedAt: new Date().toISOString(),
          })),
      );
    } catch (generationError) {
      console.error(generationError);
      alert("Could not generate the project plan.");
    } finally {
      setGenerating(false);
    }
  }

  async function deleteProject() {
    const confirmation = window.prompt(`Type "${project!.name}" to delete this project.`);
    if (confirmation !== project!.name) {
      if (confirmation !== null) alert("Project name did not match.");
      return;
    }

    try {
      await projectService.delete(Number(projectId));
      navigate("/projects");
    } catch (deleteError) {
      console.error(deleteError);
      alert("Failed to delete project.");
    }
  }

  async function saveProject() {
    if (!projectId) {
      return;
    }

    try {
      setSaving(true);
      const xpReview = await refreshXpRewards();
      const milestoneXp = new Map((xpReview?.milestones ?? []).map((item) => [item.id, Math.max(1, Number(item.xpReward))]));
      const taskXp = new Map((xpReview?.tasks ?? []).map((item) => [item.id, Math.max(1, Number(item.xpReward))]));
      const projectXp = Math.max(
          1,
          Number(
              xpReview?.projectXp ??
              milestones.reduce((sum, milestone) => sum + Math.max(1, milestone.xpReward), 0) ??
              project?.xpReward ??
              1,
          ),
      );

      await projectService.update(Number(projectId), {
        description,
        goals,
        requirements,
        integrations,
        githubUrl: githubUrl.trim() || undefined,
        xpReward: projectXp,
      });

      const persistedMilestones = await Promise.all(
          milestones.map(async (milestone) => {
            if (milestone.id > 0) {
              return projectService.updateMilestone(milestone.id, {
                title: milestone.title,
                description: milestone.description,
                status: milestone.status,
                order: milestone.order,
                xpReward: milestoneXp.get(milestone.id) ?? Math.max(1, milestone.xpReward),
              });
            }

            const createdMilestone = await projectService.createMilestone(Number(projectId), {
              title: milestone.title,
              description: milestone.description,
              status: milestone.status,
              order: milestone.order,
              xpReward: milestoneXp.get(milestone.id) ?? Math.max(1, milestone.xpReward),
            });

            // Tasks are keyed by the same temp milestone.id used when they were
            // created/generated, so this now correctly resolves per-milestone
            // instead of always falling back to the first milestone's tasks.
            const tasksForMilestone = milestoneTasks[milestone.id] ?? generatedTasks[milestone.id] ?? [];
            await Promise.all(
                tasksForMilestone.map((task, taskIndex) =>
                    projectService.createTask(createdMilestone.id, {
                      title: task.title,
                      description: task.description,
                      priority: task.priority,
                      xpReward: taskXp.get(task.id) ?? Math.max(1, task.xpReward),
                      order: taskIndex + 1,
                    }),
                ),
            );
            return createdMilestone;
          }),
      );

      setMilestones(persistedMilestones);
      const refreshedProject = await projectService.getOne(Number(projectId));
      setProject(refreshedProject);
      setDescription(refreshedProject.description ?? "");
      setGithubUrl(refreshedProject.githubUrl ?? "");
      alert("Project saved!");
    } catch (saveError) {
      console.error(saveError);
      alert("Failed to save project.");
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return (
        <div className="min-h-screen bg-slate-100 dark:bg-slate-800 p-8 text-slate-500 dark:text-slate-400">
          Loading project details...
        </div>
    );
  }

  if (error || !project) {
    return (
        <div className="min-h-screen bg-slate-100 dark:bg-slate-800 p-8 text-red-500">
          {error || "Project not found."}
        </div>
    );
  }

  return (
      <div className="min-h-screen bg-slate-100 dark:bg-slate-800 p-8 text-slate-900 dark:text-white dark:bg-slate-950 dark:text-white">
        <div className="mb-8 flex items-center justify-between">
          <button
              onClick={() => navigate(-1)}
              className="flex items-center gap-2 text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:text-white"
          >
            <ArrowLeft size={20} />
            Back to Projects
          </button>

          <button
              onClick={generateProjectPlan}
              disabled={generating}
              className="mr-3 flex items-center gap-2 rounded-xl border border-cyan-200 bg-cyan-50 px-4 py-2 text-sm font-semibold text-cyan-700 hover:bg-cyan-100 disabled:opacity-60"
          >
            <Sparkles size={17} />
            {generating ? "Generating..." : "Generate with AI"}
          </button>
          <button
              onClick={deleteProject}
              className="mr-3 flex items-center gap-2 rounded-xl border border-red-200 px-4 py-2 text-sm font-semibold text-red-600 hover:bg-red-50"
          >
            <Trash2 size={17} /> Delete
          </button>
          <button
              onClick={saveProject}
              disabled={saving}
              className="flex items-center gap-2 bg-blue-600 px-5 py-2 rounded-xl text-white hover:bg-blue-700 disabled:opacity-60"
          >
            <Save size={18} />
            {saving ? "Saving..." : "Save Project"}
          </button>
        </div>

        <div className="mb-6 rounded-2xl bg-white p-6 dark:bg-slate-900">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-sm font-semibold text-blue-500">PROJECT</p>
              <h1 className="mt-1 text-3xl font-bold">{project.name}</h1>
              <p className="mt-1 text-slate-400 dark:text-slate-500">
                Your developer productivity project
              </p>
            </div>

            {/* Live XP Counter Badge */}
            <div className="text-right">
              <div className="inline-flex items-center gap-1.5 rounded-full bg-amber-50 px-3 py-1 text-amber-700 dark:bg-amber-950/40 dark:text-amber-300 border border-amber-200 dark:border-amber-800">
                <span className="text-base">⚡</span>
                <span className="font-bold">{earnedXp}</span>
                <span className="text-xs text-amber-500">/ {totalAvailableXp} XP</span>
              </div>
              <p className="mt-2 text-2xl font-bold text-blue-600">{progress}%</p>
            </div>
          </div>

          {xpError && (
              <div className="mt-4 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-700 dark:border-amber-800 dark:bg-amber-950/40 dark:text-amber-300">
                {xpError} — using local XP estimates instead.
              </div>
          )}

          <div className="mt-6">
            <div className="h-3 overflow-hidden rounded-full bg-gray-200 dark:bg-slate-800">
              <div
                  className="h-full rounded-full bg-gradient-to-r from-blue-500 to-cyan-400 transition-all duration-500"
                  style={{ width: `${progress}%` }}
              />
            </div>

            <p className="mt-2 text-sm text-slate-400 dark:text-slate-500">
              {completedMilestones} of {milestones.length} milestones completed
            </p>
          </div>
        </div>

        <div className="mb-6 rounded-2xl bg-white dark:bg-slate-900 p-6">
          <div className="mb-4 rounded-xl border border-cyan-100 bg-cyan-50/40 p-4">
            <div className="mb-2 flex items-center gap-2"><Sparkles size={18} className="text-cyan-600" /><h2 className="font-bold">AI context</h2></div>
            <p className="mb-3 text-sm text-slate-500 dark:text-slate-400">Describe your product, users, features, and constraints. AI will generate the description, milestones, tasks, and XP rewards.</p>
            <textarea value={aiContext} onChange={(e) => setAiContext(e.target.value)} placeholder="Example: Build a mobile-first marketplace for small farms..." className="min-h-24 w-full resize-none rounded-lg border border-cyan-100 bg-white dark:bg-slate-900 p-3 text-sm outline-none focus:ring-2 focus:ring-cyan-400" />
          </div>
          <h2 className="mb-2 text-xl font-bold">Project goals</h2>
          <textarea value={goals} onChange={(e) => setGoals(e.target.value)} placeholder="What does success look like?" className="mb-4 min-h-24 w-full resize-none rounded-xl border border-slate-200 bg-white p-4 dark:border-slate-700 dark:bg-slate-800" />
          <h2 className="mb-2 text-xl font-bold">Requirements</h2>
          <textarea value={requirements} onChange={(e) => setRequirements(e.target.value)} placeholder="Functional, technical, and user requirements" className="mb-4 min-h-24 w-full resize-none rounded-xl border border-slate-200 bg-white p-4 dark:border-slate-700 dark:bg-slate-800" />
          <div className="mb-4 flex flex-wrap gap-2">{["Figma", "Excalidraw"].map((tag) => <button type="button" key={tag} onClick={() => setIntegrations((current) => current.includes(tag) ? current.filter((item) => item !== tag) : [...current, tag])} className={`rounded-full border px-3 py-1 text-xs ${integrations.includes(tag) ? "border-cyan-500 bg-cyan-50 text-cyan-700 dark:bg-cyan-950/40 dark:text-cyan-300" : "border-slate-200 text-slate-500 dark:border-slate-700 dark:text-slate-400"}`}>{tag}</button>)}</div>
          <h2 className="mb-2 text-xl font-bold">Description</h2>
          <p className="mb-4 text-sm text-slate-400 dark:text-slate-500">
            Describe what this project is about and what you want to accomplish.
          </p>

          <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Write everything about your project..."
              className="min-h-48 w-full resize-none rounded-xl border border-slate-200 dark:border-slate-700 p-4 outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>

        <div className="rounded-2xl bg-white dark:bg-slate-900 p-6 dark:bg-slate-900">
          <div className="mb-6 flex items-center justify-between">
            <div>
              <h2 className="text-xl font-bold">Milestones</h2>
              <p className="mt-1 text-sm text-slate-400 dark:text-slate-500">
                Break your project into smaller goals.
              </p>
            </div>

            <button
                onClick={addMilestone}
                className="flex items-center gap-2 rounded-xl bg-blue-600 px-4 py-2 text-white hover:bg-blue-700"
            >
              <Plus size={18} />
              Add Milestone
            </button>
          </div>

          {milestones.length === 0 && (
              <div className="rounded-xl border-2 border-dashed border-slate-200 dark:border-slate-700 p-10 text-center">
                <p className="text-slate-400 dark:text-slate-500">
                  You haven't added any milestones yet.
                </p>

                <button
                    onClick={addMilestone}
                    className="mt-2 text-blue-600 hover:underline"
                >
                  Create your first milestone
                </button>
              </div>
          )}

          <MilestoneList milestones={milestones} milestoneTasks={milestoneTasks} activeTaskCreator={activeTaskCreator} taskDrafts={taskDrafts} creatingTask={creatingTask} justCreatedTask={justCreatedTask} setActiveTaskCreator={setActiveTaskCreator} setTaskDrafts={setTaskDrafts} toggleMilestone={toggleMilestone} updateMilestone={updateMilestone} deleteMilestone={deleteMilestone} addTask={addTask} toggleTask={toggleTask} />
        </div>
      </div>
  );
}

export default ProjectDetails;