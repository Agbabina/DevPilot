import { useEffect, useState } from "react";
import {
  ArrowLeft,
  Check,
  Circle,
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

  MilestoneStatus,
} from "../services/projectService";

function ProjectDetails() {
  const navigate = useNavigate();
  const { projectId } = useParams();

  const [project, setProject] = useState<Project | null>(null);
  const [description, setDescription] = useState("");
  const [githubUrl, setGithubUrl] = useState("");
  const [aiContext, setAiContext] = useState("");
  const [generatedTasks, setGeneratedTasks] = useState<Record<number, any[]>>({});
  const [milestones, setMilestones] = useState<Milestone[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState("");

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

  function addMilestone() {
    const newMilestone: Milestone = {
      id: 0,
      title: "",
      description: "",
      status: MilestoneStatus.TODO,
      progress: 0,
      order: milestones.length + 1,
      xpReward: 0,
      projectId: Number(projectId),
      createdAt: new Date().toISOString(),
      completedAt: null,
      updatedAt: new Date().toISOString(),
    };

    setMilestones([...milestones, newMilestone]);
  }

  function updateMilestone(
    id: number,
    field: "title" | "description",
    value: string,
  ) {
    setMilestones(
      milestones.map((milestone) =>
        milestone.id === id
          ? {
              ...milestone,
              [field]: value,
            }
          : milestone,
      ),
    );
  }

  function toggleMilestone(id: number) {
    setMilestones(
      milestones.map((milestone) =>
        milestone.id === id
          ? {
              ...milestone,
              status:
                milestone.status === MilestoneStatus.COMPLETED
                  ? MilestoneStatus.TODO
                  : MilestoneStatus.COMPLETED,
            }
          : milestone,
      ),
    );
  }

  async function deleteMilestone(id: number) {
    const existingRemoteMilestone = milestones.find(
      (milestone) => milestone.id === id,
    );

    if (
      existingRemoteMilestone &&
      existingRemoteMilestone.id !== undefined &&
      existingRemoteMilestone.id > 0
    ) {
      await projectService.deleteMilestone(existingRemoteMilestone.id);
    }

    setMilestones((current) =>
      current.filter((milestone) => milestone.id !== id),
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
      setGeneratedTasks(Object.fromEntries((result.milestones ?? []).map((item: any, index: number) => [index, item.tasks ?? []])));
      setMilestones((result.milestones ?? []).map((item: { title: string; description: string; xpReward: number }, index: number) => ({
        id: 0,
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
      })));
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

      await projectService.update(Number(projectId), {
        description,
        githubUrl: githubUrl.trim() || undefined,
      });

      const persistedMilestones = await Promise.all(
        milestones.map(async (milestone) => {
          if (milestone.id > 0) {
            return projectService.updateMilestone(milestone.id, {
              title: milestone.title,
              description: milestone.description,
              status: milestone.status,
              order: milestone.order,
              xpReward: milestone.xpReward,
            });
          }

          const createdMilestone = await projectService.createMilestone(Number(projectId), {
            title: milestone.title,
            description: milestone.description,
            status: milestone.status,
            order: milestone.order,
            xpReward: milestone.xpReward,
          });
          const tasksForMilestone = generatedTasks[milestone.order - 1] ?? [];
          await Promise.all(tasksForMilestone.map((task, taskIndex) =>
            projectService.createTask(createdMilestone.id, {
              title: task.title,
              description: task.description,
              priority: task.priority,
              xpReward: task.xpReward,
              order: taskIndex + 1,
            }),
          ));
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
      <div className="min-h-screen bg-gray-100 p-8 text-gray-500">
        Loading project details...
      </div>
    );
  }

  if (error || !project) {
    return (
      <div className="min-h-screen bg-gray-100 p-8 text-red-500">
        {error || "Project not found."}
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-100 p-8">
      <div className="mb-8 flex items-center justify-between">
        <button
          onClick={() => navigate(-1)}
          className="flex items-center gap-2 text-gray-500 hover:text-gray-900"
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

      <div className="mb-6 rounded-2xl bg-white p-6">
        <div className="flex items-start justify-between">
          <div>
            <p className="text-sm font-semibold text-blue-500">PROJECT</p>
            <h1 className="mt-1 text-3xl font-bold">{project.name}</h1>
            <p className="mt-1 text-gray-400">
              Your developer productivity project
            </p>
          </div>

          <div className="text-right">
            <p className="text-sm text-gray-400">Progress</p>
            <p className="text-2xl font-bold text-blue-600">{progress}%</p>
          </div>
        </div>

        <div className="mt-6">
          <div className="h-3 overflow-hidden rounded-full bg-gray-200">
            <div
              className="h-full rounded-full bg-blue-600 transition-all"
              style={{
                width: `${progress}%`,
              }}
            />
          </div>

          <p className="mt-2 text-sm text-gray-400">
            {completedMilestones} of {milestones.length} milestones completed
          </p>
        </div>
      </div>

      <div className="mb-6 rounded-2xl bg-white p-6">
        <div className="mb-4 rounded-xl border border-cyan-100 bg-cyan-50/40 p-4">
          <div className="mb-2 flex items-center gap-2"><Sparkles size={18} className="text-cyan-600" /><h2 className="font-bold">AI context</h2></div>
          <p className="mb-3 text-sm text-gray-500">Describe your product, users, features, and constraints. AI will generate the description, milestones, tasks, and XP rewards.</p>
          <textarea value={aiContext} onChange={(e) => setAiContext(e.target.value)} placeholder="Example: Build a mobile-first marketplace for small farms..." className="min-h-24 w-full resize-none rounded-lg border border-cyan-100 bg-white p-3 text-sm outline-none focus:ring-2 focus:ring-cyan-400" />
        </div>
        <h2 className="mb-2 text-xl font-bold">Description</h2>
        <p className="mb-4 text-sm text-gray-400">
          Describe what this project is about and what you want to accomplish.
        </p>

        <textarea
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="Write everything about your project..."
          className="min-h-48 w-full resize-none rounded-xl border border-gray-200 p-4 outline-none focus:ring-2 focus:ring-blue-500"
        />
      </div>

      <div className="rounded-2xl bg-white p-6">
        <div className="mb-6 flex items-center justify-between">
          <div>
            <h2 className="text-xl font-bold">Milestones</h2>
            <p className="mt-1 text-sm text-gray-400">
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
          <div className="rounded-xl border-2 border-dashed border-gray-200 p-10 text-center">
            <p className="text-gray-400">
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

        <div className="space-y-4">
          {milestones.map((milestone, index) => (
            <div
              key={milestone.id}
              className={`rounded-xl border p-5 transition ${milestone.status === MilestoneStatus.COMPLETED ? "border-green-200 bg-green-50" : "border-gray-200"}`}
            >
              <div className="flex items-start gap-4">
                <button
                  onClick={() => toggleMilestone(milestone.id)}
                  className="mt-1"
                >
                  {milestone.status === MilestoneStatus.COMPLETED ? (
                    <div className="rounded-full bg-green-500 p-1 text-white">
                      <Check size={16} />
                    </div>
                  ) : (
                    <Circle size={24} className="text-gray-300" />
                  )}
                </button>

                <div className="flex-1">
                  <p className="mb-1 text-xs text-gray-400">
                    MILESTONE {index + 1}
                  </p>

                  <input
                    type="text"
                    value={milestone.title}
                    onChange={(e) =>
                      updateMilestone(milestone.id, "title", e.target.value)
                    }
                    placeholder="Milestone title..."
                    className={`w-full bg-transparent text-lg font-semibold outline-none ${
                      milestone.status === MilestoneStatus.COMPLETED
                        ? "text-gray-400 line-through"
                        : ""
                    }`}
                  />

                  <textarea
                    value={milestone.description ?? ""}
                    onChange={(e) =>
                      updateMilestone(
                        milestone.id,
                        "description",
                        e.target.value,
                      )
                    }
                    placeholder="Describe what needs to be done..."
                    className="mt-2 min-h-20 w-full resize-none bg-transparent text-gray-500 outline-none"
                  />
                </div>

                <button
                  onClick={() => deleteMilestone(milestone.id)}
                  className="text-gray-300 hover:text-red-500"
                >
                  <Trash2 size={19} />
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

export default ProjectDetails;























