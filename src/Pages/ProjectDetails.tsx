import { useEffect, useState } from "react";
import { 
  ArrowLeft, Save, Trash2, CheckCircle2, Circle, 
  Plus, Calendar, Award, CheckSquare, Layers, X 
} from "lucide-react";
import { useNavigate, useParams } from "react-router-dom";
import Header from "../Component/Header";
import Sidebar from "../Component/Sidebar";
import { projectService, type Project, type Milestone, type Task } from "../services/projectService";
import { TaskStatus } from './../services/projectService';

export default function ProjectDetails() {
  const navigate = useNavigate();
  const { projectId } = useParams();

  const [project, setProject] = useState<Project | null>(null);
  const [milestones, setMilestones] = useState<Milestone[]>([]);
  const [tasks, setTasks] = useState<Record<number, Task[]>>({});
  const [description, setDescription] = useState("");
  
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  // Modal / Form state
  const [isAddingMilestone, setIsAddingMilestone] = useState(false);
  const [newMilestoneTitle, setNewMilestoneTitle] = useState("");
  const [newMilestoneReward, setNewMilestoneReward] = useState(100);

  const [activeTaskMilestoneId, setActiveTaskMilestoneId] = useState<number | null>(null);
  const [newTaskTitle, setNewTaskTitle] = useState("");
  const [newTaskReward, setNewTaskReward] = useState(25);

  useEffect(() => {
    if (!projectId) { 
      setError("Project ID is required."); 
      setLoading(false); 
      return; 
    }

    (async () => {
      try {
        const id = Number(projectId);
        const current = await projectService.getOne(id);
        const items = await projectService.getMilestones(id);
        const pairs = await Promise.all(
          items.map(async (m) => [m.id, await projectService.getTasks(m.id)] as const)
        );

        setProject(current); 
        setDescription(current.description ?? ""); 
        setMilestones(items); 
        setTasks(Object.fromEntries(pairs));
      } catch { 
        setError("Failed to load project details."); 
      } finally { 
        setLoading(false); 
      }
    })();
  }, [projectId]);

  // Handle Save
  async function save() {
    if (!project || !projectId) return;
    setSaving(true);
    try { 
      const updated = await projectService.update(Number(projectId), { description }); 
      setProject(updated); 
      alert("Project details saved successfully!"); 
    } catch { 
      alert("Failed to save project."); 
    } finally { 
      setSaving(false); 
    }
  }

  // Handle Delete
  async function remove() {
    if (!projectId || !project) return;
    if (!window.confirm(`Are you sure you want to delete "${project.name}"?`)) return;
    await projectService.delete(Number(projectId)); 
    navigate("/projects");
  }

  // Toggle Task Completion State
  async function toggleTask(milestoneId: number, task: Task) {
    const updatedStatus = !task.completedAt;
    
    // Optimistic UI Updat

    try {
      if (projectService.updateTask) {
        await projectService.updateTask(task.id, { completedAt: updatedStatus ? new Date() : null });
      }
    } catch {
      // Revert if API request fails
      setTasks((prev) => ({
        ...prev,
        [milestoneId]: prev[milestoneId].map((t) =>
          t.id === task.id ? { ...t, completedAt: task.completedAt } : t
        ),
      }));
    }
  }

  // Add New Milestone
  async function handleAddMilestone(e: React.FormEvent) {
    e.preventDefault();
    if (!newMilestoneTitle.trim() || !projectId) return;

    try {
      const created = await projectService.createMilestone?.(Number(projectId), {
        title: newMilestoneTitle,
        xpReward: Number(newMilestoneReward),
      }) || {
        id: Date.now(),
        title: newMilestoneTitle,
        description: "",
        xpReward: Number(newMilestoneReward),
      };

      setMilestones((prev) => [...prev, created]);
      setTasks((prev) => ({ ...prev, [created.id]: [] }));
      setNewMilestoneTitle("");
      setIsAddingMilestone(false);
    } catch {
      alert("Failed to create milestone.");
    }
  }

  // Add New Task
  async function handleAddTask(e: React.FormEvent, milestoneId: number) {
    e.preventDefault();
    if (!newTaskTitle.trim()) return;

    try {
      const created = await projectService.createTask?.(milestoneId, {
        title: newTaskTitle,
        xpReward: Number(newTaskReward),
        status: TaskStatus.TODO,
      }) || {
        id: Date.now(),
        title: newTaskTitle,
        xpReward: Number(newTaskReward),
        status: TaskStatus.TODO,
      };

      setTasks((prev) => ({
        ...prev,
        [milestoneId]: [...(prev[milestoneId] || []), created],
      }));
      setNewTaskTitle("");
      setActiveTaskMilestoneId(null);
    } catch {
      alert("Failed to create task.");
    }
  }

  // Computations
  const allTasks = Object.values(tasks).flat();
  const completedTasks = allTasks.filter((t) => t.completedAt);
  const totalXP = allTasks.reduce((sum, t) => sum + (t.completedAt ? t.xpReward || 0 : 0), 0);
  const progressPercent = allTasks.length > 0 ? Math.round((completedTasks.length / allTasks.length) * 100) : 0;

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-950 text-cyan-400">
        <div className="flex items-center gap-3">
          <div className="h-6 w-6 animate-spin rounded-full border-2 border-cyan-400 border-t-transparent" />
          <span className="font-semibold">Loading project workspace...</span>
        </div>
      </div>
    );
  }

  if (error || !project) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-950 p-8 text-red-400">
        <div className="rounded-2xl border border-red-500/20 bg-slate-900 p-6 text-center">
          <p className="text-lg font-bold">{error || "Project not found."}</p>
          <button onClick={() => navigate("/projects")} className="mt-4 text-sm font-semibold text-slate-400 underline hover:text-white">
            Return to Projects
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 dark:bg-slate-950 dark:text-slate-100">
      <Header />
      <div className="flex">
        <Sidebar />
        <main className="min-w-0 flex-1 p-5 md:p-10">
          <div className="mx-auto max-w-6xl space-y-8">
            
            {/* Navigation & Action Bar */}
            <div className="flex flex-wrap items-center justify-between gap-4">
              <button 
                onClick={() => navigate(-1)} 
                className="inline-flex items-center gap-2 rounded-lg px-3 py-1.5 text-sm font-semibold text-slate-500 hover:bg-slate-200 hover:text-cyan-600 dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-cyan-400"
              >
                <ArrowLeft size={18} /> Back to projects
              </button>
              
              <div className="flex gap-3">
                <button 
                  onClick={save} 
                  disabled={saving} 
                  className="inline-flex items-center gap-2 rounded-xl bg-cyan-500 px-5 py-2.5 text-sm font-bold text-white transition hover:bg-cyan-600 disabled:opacity-60"
                >
                  <Save size={16} /> {saving ? "Saving..." : "Save Project"}
                </button>
                <button 
                  onClick={remove} 
                  className="inline-flex items-center gap-2 rounded-xl border border-red-200 bg-white px-4 py-2.5 text-sm font-bold text-red-600 transition hover:bg-red-50 dark:border-red-900/30 dark:bg-slate-900 dark:hover:bg-red-950/30"
                >
                  <Trash2 size={16} /> Delete
                </button>
              </div>
            </div>

            {/* Main Overview Card */}
            <section className="relative overflow-hidden rounded-3xl border border-cyan-400/20 bg-white p-6 shadow-sm dark:bg-slate-900 md:p-8">
              <div className="flex flex-wrap items-center justify-between gap-4">
                <div>
                  <p className="dev-mono text-xs uppercase tracking-[.25em] text-cyan-500 font-bold">
                    Workspace / Project Details
                  </p>
                  <h1 className="mt-2 text-3xl font-black md:text-4xl">{project.name}</h1>
                </div>
                <div className="flex items-center gap-2 rounded-2xl bg-amber-500/10 px-4 py-2 text-amber-500 border border-amber-500/20">
                  <Award size={20} />
                  <span className="text-sm font-extrabold">{totalXP} XP Earned</span>
                </div>
              </div>

              {/* Progress Bar */}
              <div className="mt-6">
                <div className="flex justify-between text-xs font-bold text-slate-500 dark:text-slate-400 mb-2">
                  <span>OVERALL PROGRESS</span>
                  <span>{progressPercent}%</span>
                </div>
                <div className="h-3 w-full overflow-hidden rounded-full bg-slate-100 dark:bg-slate-800">
                  <div 
                    className="h-full bg-linear-to-r from-cyan-500 to-amber-500 transition-all duration-500 ease-out" 
                    style={{ width: `${progressPercent}%` }} 
                  />
                </div>
              </div>

              {/* Description Input */}
              <div className="mt-6">
                <label className="text-xs font-bold uppercase tracking-wider text-slate-400">
                  Project Description
                </label>
                <textarea 
                  value={description} 
                  onChange={(e) => setDescription(e.target.value)} 
                  rows={3} 
                  placeholder="Describe your project goals..."
                  className="mt-2 w-full rounded-2xl border border-slate-200 bg-slate-50 p-4 text-sm outline-none transition focus:border-cyan-400 focus:bg-white dark:border-slate-800 dark:bg-slate-800/50 dark:focus:border-cyan-500 dark:focus:bg-slate-800" 
                />
              </div>
            </section>

            {/* Quick Stats Grid */}
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
              <div className="flex items-center gap-4 rounded-2xl border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-900">
                <div className="rounded-xl bg-cyan-500/10 p-3 text-cyan-500">
                  <Layers size={24} />
                </div>
                <div>
                  <p className="text-xs font-medium text-slate-400">Milestones</p>
                  <p className="text-xl font-black">{milestones.length}</p>
                </div>
              </div>

              <div className="flex items-center gap-4 rounded-2xl border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-900">
                <div className="rounded-xl bg-emerald-500/10 p-3 text-emerald-500">
                  <CheckSquare size={24} />
                </div>
                <div>
                  <p className="text-xs font-medium text-slate-400">Tasks Completed</p>
                  <p className="text-xl font-black">{completedTasks.length} / {allTasks.length}</p>
                </div>
              </div>

              <div className="flex items-center gap-4 rounded-2xl border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-900">
                <div className="rounded-xl bg-amber-500/10 p-3 text-amber-500">
                  <Award size={24} />
                </div>
                <div>
                  <p className="text-xs font-medium text-slate-400">Total Rewards</p>
                  <p className="text-xl font-black">{totalXP} XP</p>
                </div>
              </div>
            </div>

            {/* Milestones & Tasks Section */}
            <div className="space-y-6">
              <div className="flex items-center justify-between">
                <h2 className="text-2xl font-black">Milestones & Tasks</h2>
                <button 
                  onClick={() => setIsAddingMilestone(!isAddingMilestone)} 
                  className="inline-flex items-center gap-2 rounded-xl bg-slate-900 px-4 py-2 text-xs font-bold text-white dark:bg-slate-800 dark:hover:bg-slate-700"
                >
                  {isAddingMilestone ? <X size={14} /> : <Plus size={14} />} 
                  {isAddingMilestone ? "Cancel" : "Add Milestone"}
                </button>
              </div>

              {/* Form: Add New Milestone */}
              {isAddingMilestone && (
                <form onSubmit={handleAddMilestone} className="rounded-2xl border border-cyan-500/30 bg-cyan-500/5 p-4 dark:bg-slate-900/60">
                  <h3 className="text-sm font-bold text-cyan-500">Create New Milestone</h3>
                  <div className="mt-3 grid gap-3 sm:grid-cols-3">
                    <input 
                      type="text" 
                      placeholder="Milestone title..." 
                      value={newMilestoneTitle} 
                      onChange={(e) => setNewMilestoneTitle(e.target.value)} 
                      className="sm:col-span-2 rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm outline-none dark:border-slate-700 dark:bg-slate-800"
                      required
                    />
                    <input 
                      type="number" 
                      placeholder="XP Reward" 
                      value={newMilestoneReward} 
                      onChange={(e) => setNewMilestoneReward(Number(e.target.value))} 
                      className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm outline-none dark:border-slate-700 dark:bg-slate-800"
                    />
                  </div>
                  <div className="mt-3 flex justify-end">
                    <button type="submit" className="rounded-xl bg-cyan-500 px-4 py-1.5 text-xs font-bold text-white hover:bg-cyan-600">
                      Create Milestone
                    </button>
                  </div>
                </form>
              )}

              {/* Milestone Cards List */}
              {milestones.map((milestone) => {
                const milestoneTasks = tasks[milestone.id] || [];
                const milestoneCompleted = milestoneTasks.length > 0 && milestoneTasks.every((t) => t.completedAt);

                return (
                  <section key={milestone.id} className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm transition dark:border-slate-800 dark:bg-slate-900">
                    <div className="flex flex-wrap items-start justify-between gap-4 border-b border-slate-100 pb-4 dark:border-slate-800">
                      <div>
                        <div className="flex items-center gap-2">
                          <h3 className="text-xl font-bold">{milestone.title}</h3>
                          {milestoneCompleted && (
                            <span className="rounded-full bg-emerald-500/10 px-2.5 py-0.5 text-xs font-bold text-emerald-500">
                              Completed
                            </span>
                          )}
                        </div>
                        {milestone.description && (
                          <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">{milestone.description}</p>
                        )}
                      </div>
                      <div className="flex items-center gap-3">
                        <span className="rounded-xl bg-amber-500/10 px-3 py-1 text-xs font-extrabold text-amber-500 border border-amber-500/20">
                          +{milestone.xpReward} XP
                        </span>
                        <button 
                          onClick={() => setActiveTaskMilestoneId(activeTaskMilestoneId === milestone.id ? null : milestone.id)} 
                          className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-600 dark:hover:bg-slate-800 dark:hover:text-slate-200"
                          title="Add Task"
                        >
                          <Plus size={18} />
                        </button>
                      </div>
                    </div>

                    {/* Form: Add Task to Specific Milestone */}
                    {activeTaskMilestoneId === milestone.id && (
                      <form onSubmit={(e) => handleAddTask(e, milestone.id)} className="mt-4 flex gap-2">
                        <input 
                          type="text" 
                          placeholder="Task title..." 
                          value={newTaskTitle} 
                          onChange={(e) => setNewTaskTitle(e.target.value)} 
                          className="flex-1 rounded-xl border border-slate-200 bg-slate-50 px-3 py-1.5 text-sm outline-none dark:border-slate-700 dark:bg-slate-800"
                          required
                        />
                        <input 
                          type="number" 
                          placeholder="XP" 
                          value={newTaskReward} 
                          onChange={(e) => setNewTaskReward(Number(e.target.value))} 
                          className="w-20 rounded-xl border border-slate-200 bg-slate-50 px-3 py-1.5 text-sm outline-none dark:border-slate-700 dark:bg-slate-800"
                        />
                        <button type="submit" className="rounded-xl bg-cyan-500 px-3 py-1.5 text-xs font-bold text-white">
                          Add
                        </button>
                      </form>
                    )}

                    {/* Task List */}
                    <ul className="mt-4 space-y-2">
                      {milestoneTasks.map((task) => (
                        <li 
                          key={task.id} 
                          onClick={() => toggleTask(milestone.id, task)} 
                          className={`flex cursor-pointer items-center justify-between rounded-2xl border p-3.5 transition ${
                            task.completedAt
                              ? "border-emerald-500/20 bg-emerald-500/5 dark:bg-emerald-950/10" 
                              : "border-slate-100 bg-slate-50 hover:border-slate-200 dark:border-slate-800/60 dark:bg-slate-800/50"
                          }`}
                        >
                          <div className="flex items-center gap-3">
                            <button className="text-slate-400 transition hover:text-cyan-500">
                              {task.completedAt ? (
                                <CheckCircle2 className="text-emerald-500" size={18} />
                              ) : (
                                <Circle size={18} />
                              )}
                            </button>
                            <span className={`text-sm font-semibold ${task.completedAt ? "line-through text-slate-400 dark:text-slate-500" : ""}`}>
                              {task.title}
                            </span>
                          </div>
                          <span className="text-xs font-bold text-amber-500">
                            +{task.xpReward} XP
                          </span>
                        </li>
                      ))}

                      {milestoneTasks.length === 0 && (
                        <li className="py-2 text-center text-xs text-slate-400 italic">
                          No tasks created yet for this milestone.
                        </li>
                      )}3
                    </ul>
                  </section>
                );
              })}
            </div>

          </div>
        </main>
      </div>
    </div>
  );
}