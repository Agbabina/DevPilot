import { useEffect, useMemo, useState } from 'react';
import {
  ArrowLeft,
  Award,
  CheckCircle2,
  CheckSquare,
  Circle,
  Layers,
  Plus,
  Save,
  Trash2,
  X,
  Sparkles,
  Target,
  ListTodo,
  ChevronRight,
  MessageCircle,
} from 'lucide-react';
import Header, { USER_UPDATED_EVENT } from "../Component/Header";
import { useNavigate, useParams } from 'react-router-dom';

import Sidebar from '../Component/Sidebar';
import TechTag from '../Component/TechTag.tsx';

import {
  projectService,
  type Project,
  type Milestone,
  type Task,
  TaskStatus,
} from '../services/projectService';

export default function ProjectDetails() {
  const navigate = useNavigate();
  const { projectId } = useParams();

  const [project, setProject] = useState<Project | null>(null);
  const [milestones, setMilestones] = useState<Milestone[]>([]);
  const [tasks, setTasks] = useState<Record<number, Task[]>>({});

  const [description, setDescription] = useState('');

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState('');

  // Milestone form
  const [isAddingMilestone, setIsAddingMilestone] = useState(false);
  const [newMilestoneTitle, setNewMilestoneTitle] = useState('');
  const [newMilestoneReward, setNewMilestoneReward] = useState(100);
  const [creatingMilestone, setCreatingMilestone] = useState(false);

  // Task form
  const [activeTaskMilestoneId, setActiveTaskMilestoneId] = useState<
    number | null
  >(null);
  const [newTaskTitle, setNewTaskTitle] = useState('');
  const [newTaskReward, setNewTaskReward] = useState(25);
  const [creatingTask, setCreatingTask] = useState(false);

  // Feedback
  const [saveMessage, setSaveMessage] = useState('');
  const [showContextBubble, setShowContextBubble] = useState(false);
  const [generatingPlan, setGeneratingPlan] = useState(false);
  const [generationMessage, setGenerationMessage] = useState('');

  /*
   * --------------------------------------------------------------------------
   * Load project
   * --------------------------------------------------------------------------
   */

  async function loadProjectData() {
    if (!projectId) {
      setError('Project ID is required.');
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError('');

      const id = Number(projectId);

      if (Number.isNaN(id)) {
        throw new Error('Invalid project ID.');
      }

      const [currentProject, projectMilestones] = await Promise.all([
        projectService.getOne(id),
        projectService.getMilestones(id),
      ]);

      const taskPairs = await Promise.all(
        projectMilestones.map(async (milestone) => {
          const milestoneTasks = await projectService.getTasks(milestone.id);

          return [milestone.id, milestoneTasks] as const;
        }),
      );

      setProject(currentProject);
      setDescription(currentProject.description ?? '');
      setMilestones(projectMilestones);
      setTasks(Object.fromEntries(taskPairs));
    } catch (err) {
      console.error(err);
      setError('Failed to load project details.');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void loadProjectData();
  }, [projectId]);

  /*
   * --------------------------------------------------------------------------
   * Computed project data
   * --------------------------------------------------------------------------
   */

  const allTasks = useMemo(() => {
    return Object.values(tasks).flat();
  }, [tasks]);

  const completedTasks = useMemo(() => {
    return allTasks.filter(
      (task) => task.status === TaskStatus.COMPLETED || task.completedAt,
    );
  }, [allTasks]);

  const totalXP = useMemo(() => {
    return completedTasks.reduce(
      (sum, task) => sum + (task.xpReward || 0),
      0,
    );
  }, [completedTasks]);

  const possibleXP = useMemo(() => {
    return allTasks.reduce((sum, task) => sum + (task.xpReward || 0), 0);
  }, [allTasks]);

  const progressPercent = useMemo(() => {
    if (allTasks.length === 0) return 0;

    return Math.round((completedTasks.length / allTasks.length) * 100);
  }, [allTasks.length, completedTasks.length]);

  const completedMilestones = useMemo(() => {
    return milestones.filter((milestone) => {
      const milestoneTasks = tasks[milestone.id] || [];

      return (
        milestoneTasks.length > 0 &&
        milestoneTasks.every(
          (task) =>
            task.status === TaskStatus.COMPLETED || Boolean(task.completedAt),
        )
      );
    }).length;
  }, [milestones, tasks]);

  /*
   * --------------------------------------------------------------------------
   * Save project
   * --------------------------------------------------------------------------
   */

  async function save() {
    if (!project || !projectId) return;

    try {
      setSaving(true);
      setSaveMessage('');

      const updated = await projectService.update(Number(projectId), {
        description,
      });

      setProject(updated);
      setSaveMessage('Changes saved');

      window.setTimeout(() => {
        setSaveMessage('');
      }, 2500);
    } catch (err) {
      console.error(err);
      setSaveMessage('Failed to save changes');
    } finally {
      setSaving(false);
    }
  }

  async function generateProjectPlan() {
    if (!project || !projectId || generatingPlan) return;

    try {
      setGeneratingPlan(true);
      setGenerationMessage('Creating your project plan...');
      const plan = await projectService.generateProject({
        name: project.name,
        goal: project.goals || description || `Build ${project.name}`,
        priority: project.priority,
      });

      if (plan.description) {
        setDescription(plan.description);
        await projectService.update(Number(projectId), {
          description: plan.description,
        });
      }

      for (const milestone of plan.milestones || []) {
        const createdMilestone = await projectService.createMilestone(
          Number(projectId),
          {
            title: milestone.title,
            description: milestone.description,
            xpReward: Number(milestone.xpReward || 100),
          },
        );

        for (const task of milestone.tasks || []) {
          await projectService.createTask(createdMilestone.id, {
            title: task.title,
            description: task.description,
            priority: task.priority || 'MEDIUM',
            xpReward: Number(task.xpReward || 25),
            status: TaskStatus.TODO,
          });
        }
      }

      await loadProjectData();
      setGenerationMessage('Plan generated and added to your workspace.');
    } catch (err) {
      console.error(err);
      setGenerationMessage('Could not generate a plan. Please try again.');
    } finally {
      setGeneratingPlan(false);
    }
  }

  /*
   * --------------------------------------------------------------------------
   * Delete project
   * --------------------------------------------------------------------------
   */

  async function remove() {
    if (!projectId || !project || deleting) return;

    const confirmed = window.confirm(
      `Are you sure you want to delete "${project.name}"? This action cannot be undone.`,
    );

    if (!confirmed) return;

    try {
      setDeleting(true);

      await projectService.delete(Number(projectId));

      navigate('/projects');
    } catch (err) {
      console.error(err);
      window.alert('Failed to delete project.');
      setDeleting(false);
    }
  }

  /*
   * --------------------------------------------------------------------------
   * Toggle task
   * --------------------------------------------------------------------------
   */

  const toggleTask = async (task: Task) => {
    const isCompleting = task.status !== TaskStatus.COMPLETED;

    const newStatus = isCompleting
      ? TaskStatus.COMPLETED
      : TaskStatus.TODO;

    const newCompletedAt = isCompleting
      ? new Date().toISOString()
      : null;

    setTasks((currentTasks) => {
      const nextTasks: Record<number, Task[]> = {};

      Object.entries(currentTasks).forEach(([milestoneId, milestoneTasks]) => {
        nextTasks[Number(milestoneId)] = milestoneTasks.map((item) =>
          item.id === task.id
            ? {
                ...item,
                status: newStatus,
                completedAt: newCompletedAt,
              }
            : item,
        );
      });

      return nextTasks;
    });

    try {
      await projectService.updateTask(task.id, {
        status: newStatus,
      });

      window.dispatchEvent(new Event(USER_UPDATED_EVENT));
    } catch (error) {
      console.error('Failed to update task:', error);
      await loadProjectData();
    }
  };
  /*
   * --------------------------------------------------------------------------
   * Add milestone
   * --------------------------------------------------------------------------
   */

  async function handleAddMilestone(e: React.FormEvent) {
    e.preventDefault();

    if (!newMilestoneTitle.trim() || !projectId || creatingMilestone) {
      return;
    }

    try {
      setCreatingMilestone(true);

      const created = await projectService.createMilestone?.(
        Number(projectId),
        {
          title: newMilestoneTitle.trim(),
          xpReward: Number(newMilestoneReward),
        },
      );

      if (!created) {
        throw new Error('Milestone creation is not available.');
      }

      setMilestones((previous) => [...previous, created]);

      setTasks((previous) => ({
        ...previous,
        [created.id]: [],
      }));

      setNewMilestoneTitle('');
      setNewMilestoneReward(100);
      setIsAddingMilestone(false);
    } catch (err) {
      console.error(err);
      window.alert('Failed to create milestone.');
    } finally {
      setCreatingMilestone(false);
    }
  }

  /*
   * --------------------------------------------------------------------------
   * Add task
   * --------------------------------------------------------------------------
   */

  async function handleAddTask(
    e: React.FormEvent,
    milestoneId: number,
  ) {
    e.preventDefault();

    if (!newTaskTitle.trim() || creatingTask) {
      return;
    }

    try {
      setCreatingTask(true);

      const created = await projectService.createTask?.(milestoneId, {
        title: newTaskTitle.trim(),
        xpReward: Number(newTaskReward),
        status: TaskStatus.TODO,
      });

      if (!created) {
        throw new Error('Task creation is not available.');
      }

      setTasks((previous) => ({
        ...previous,
        [milestoneId]: [
          ...(previous[milestoneId] || []),
          created,
        ],
      }));

      setNewTaskTitle('');
      setNewTaskReward(25);
      setActiveTaskMilestoneId(null);
    } catch (err) {
      console.error(err);
      window.alert('Failed to create task.');
    } finally {
      setCreatingTask(false);
    }
  }

  /*
   * --------------------------------------------------------------------------
   * Loading screen
   * --------------------------------------------------------------------------
   */

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-950 text-slate-100">
        <div className="flex flex-col items-center gap-4">
          <div className="relative">
            <div className="h-12 w-12 animate-spin rounded-full border-2 border-slate-800 border-t-cyan-400" />

            <Sparkles
              size={16}
              className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 text-cyan-400"
            />
          </div>

          <div className="text-center">
            <p className="font-bold">Opening workspace</p>
            <p className="mt-1 text-xs text-slate-500">
              Loading project data...
            </p>
          </div>
        </div>
      </div>
    );
  }

  /*
   * --------------------------------------------------------------------------
   * Error screen
   * --------------------------------------------------------------------------
   */

  if (error || !project) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-950 p-6 text-slate-100">
        <div className="w-full max-w-md rounded-3xl border border-slate-800 bg-slate-900 p-8 text-center shadow-2xl">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-red-500/10 text-red-400">
            <X size={26} />
          </div>

          <h1 className="mt-5 text-xl font-black">
            Workspace unavailable
          </h1>

          <p className="mt-2 text-sm leading-6 text-slate-400">
            {error || 'Project not found.'}
          </p>

          <button
            onClick={() => navigate('/projects')}
            className="mt-6 inline-flex items-center gap-2 rounded-xl bg-slate-100 px-4 py-2.5 text-sm font-bold text-slate-900 transition hover:bg-white"
          >
            <ArrowLeft size={16} />
            Return to projects
          </button>
        </div>
      </div>
    );
  }

  /*
   * --------------------------------------------------------------------------
   * Main UI
   * --------------------------------------------------------------------------
   */

  return (
    <div className="min-h-screen bg-[#f8fafc] text-slate-950 dark:bg-[#070b14] dark:text-slate-100">
      <Header />

      <div className="flex">
        <Sidebar />

        <main className="min-w-0 flex-1">
          <div className="mx-auto max-w-7xl px-5 py-6 md:px-8 md:py-8">
            {/* ---------------------------------------------------------------- */}
            {/* Workspace top bar */}
            {/* ---------------------------------------------------------------- */}

            <div className="mb-8 flex flex-wrap items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={() => navigate(-1)}
                  className="group flex h-10 w-10 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-500 shadow-sm transition hover:border-cyan-300 hover:text-cyan-500 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-400 dark:hover:border-cyan-500/40"
                  title="Back"
                >
                  <ArrowLeft
                    size={18}
                    className="transition-transform group-hover:-translate-x-0.5"
                  />
                </button>

                <div>
                  <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-[0.16em] text-slate-400">
                    <span className="text-cyan-500">Dev Workspace</span>
                    <ChevronRight size={13} />
                    <span>Projects</span>
                  </div>

                  <p className="mt-1 text-sm font-semibold text-slate-600 dark:text-slate-300">
                    {project.name}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2">
                {saveMessage && (
                  <span
                    className={`mr-2 text-xs font-bold ${
                      saveMessage === 'Changes saved'
                        ? 'text-emerald-500'
                        : 'text-red-400'
                    }`}
                  >
                    {saveMessage}
                  </span>
                )}

                <button
                  type="button"
                  onClick={remove}
                  disabled={deleting}
                  className="inline-flex items-center gap-2 rounded-xl border border-red-200 bg-white px-3.5 py-2.5 text-xs font-bold text-red-500 transition hover:border-red-300 hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-50 dark:border-red-900/40 dark:bg-slate-900 dark:hover:bg-red-950/20"
                >
                  <Trash2 size={15} />
                  {deleting ? 'Deleting...' : 'Delete'}
                </button>

                <button
                  type="button"
                  onClick={save}
                  disabled={saving}
                  className="inline-flex items-center gap-2 rounded-xl bg-slate-950 px-4 py-2.5 text-xs font-bold text-white shadow-lg shadow-slate-950/10 transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60 dark:bg-cyan-500 dark:text-slate-950 dark:hover:bg-cyan-400"
                >
                  <Save size={15} />
                  {saving ? 'Saving...' : 'Save changes'}
                </button>
              </div>
            </div>

            {/* ---------------------------------------------------------------- */}
            {/* Project hero */}
            {/* ---------------------------------------------------------------- */}

            <section className="relative overflow-hidden rounded-[28px] border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900">
              {/* Decorative workspace glow */}
              <div className="pointer-events-none absolute -right-24 -top-24 h-72 w-72 rounded-full bg-cyan-500/10 blur-3xl" />

              <div className="relative p-6 md:p-8">
                <div className="flex flex-col gap-7 lg:flex-row lg:items-start lg:justify-between">
                  <div className="min-w-0">
                    <div className="mb-4 flex items-center gap-2">
                      <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-cyan-500/10 text-cyan-500">
                        <Sparkles size={15} />
                      </div>

                      <span className="text-[11px] font-black uppercase tracking-[0.2em] text-cyan-500">
                        Development workspace
                      </span>
                    </div>

                    <h1 className="max-w-4xl break-words text-3xl font-black tracking-tight md:text-5xl">
                      {project.name}
                    </h1>

                    <p className="mt-3 max-w-2xl text-sm leading-6 text-slate-500 dark:text-slate-400">
                      {description.trim()
                        ? description
                        : 'No project description yet. Add one below to define what you are building.'}
                    </p>

                    {project.technologies?.length > 0 && (
                      <div className="mt-5 flex flex-wrap gap-2">
                        {project.technologies.map((technology) => (
                          <TechTag
                            key={technology}
                            technology={technology}
                          />
                        ))}
                      </div>
                    )}
                  </div>

                  {/* XP badge */}
                  <div className="shrink-0">
                    <div className="rounded-2xl border border-amber-500/20 bg-amber-500/5 px-5 py-4">
                      <div className="flex items-center gap-3">
                        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-amber-500/10 text-amber-500">
                          <Award size={20} />
                        </div>

                        <div>
                          <p className="text-[10px] font-black uppercase tracking-wider text-slate-400">
                            Earned
                          </p>

                          <p className="mt-0.5 text-xl font-black text-amber-500">
                            {totalXP} XP
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Progress */}
                <div className="mt-8 border-t border-slate-100 pt-6 dark:border-slate-800">
                  <div className="flex items-end justify-between gap-4">
                    <div>
                      <p className="text-xs font-black uppercase tracking-widest text-slate-400">
                        Project progress
                      </p>

                      <div className="mt-1 flex items-baseline gap-2">
                        <span className="text-3xl font-black">
                          {progressPercent}%
                        </span>

                        <span className="text-xs font-medium text-slate-400">
                          {completedTasks.length} of {allTasks.length} tasks
                        </span>
                      </div>
                    </div>

                    <Target
                      size={20}
                      className={
                        progressPercent === 100
                          ? 'text-emerald-500'
                          : 'text-cyan-500'
                      }
                    />
                  </div>

                  <div className="mt-4 h-2.5 overflow-hidden rounded-full bg-slate-100 dark:bg-slate-800">
                    <div
                      className="h-full rounded-full bg-gradient-to-r from-cyan-500 via-cyan-400 to-emerald-400 transition-all duration-700 ease-out"
                      style={{
                        width: `${progressPercent}%`,
                      }}
                    />
                  </div>

                  <div className="mt-2 flex justify-between text-[11px] font-medium text-slate-400">
                    <span>Keep building.</span>
                    <span>{possibleXP} XP available</span>
                  </div>
                </div>

                {/* Description editor */}
                <div className="mt-7">
                  <label
                    htmlFor="project-description"
                    className="mb-2 block text-xs font-black uppercase tracking-wider text-slate-400"
                  >
                    Project description
                  </label>

                  <textarea
                    id="project-description"
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    rows={4}
                    placeholder="What are you building? What problem does it solve?"
                    className="w-full resize-y rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3.5 text-sm leading-6 outline-none transition placeholder:text-slate-400 focus:border-cyan-400 focus:bg-white focus:ring-4 focus:ring-cyan-500/5 dark:border-slate-800 dark:bg-slate-950/50 dark:focus:border-cyan-500 dark:focus:bg-slate-950"
                  />
                </div>
              </div>
            </section>

            {/* AI context bubble */}
            <div className="fixed bottom-6 right-6 z-30 flex flex-col items-end gap-3">
              {showContextBubble && (
                <div className="w-[min(360px,calc(100vw-3rem))] rounded-3xl border border-cyan-500/20 bg-white p-5 shadow-2xl shadow-cyan-950/10 dark:border-slate-700 dark:bg-slate-900">
                  <div className="flex items-start gap-3">
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-cyan-500/10 text-cyan-500">
                      <Sparkles size={18} />
                    </div>
                    <div>
                      <h3 className="text-sm font-black">Build this project with AI</h3>
                      <p className="mt-1 text-xs leading-5 text-slate-500 dark:text-slate-400">
                        Generate a useful description, milestones, and actionable tasks from this project’s context.
                      </p>
                    </div>
                  </div>
                  {generationMessage && (
                    <p className="mt-3 text-xs font-bold text-cyan-500">{generationMessage}</p>
                  )}
                  <button
                    type="button"
                    onClick={generateProjectPlan}
                    disabled={generatingPlan}
                    className="mt-4 w-full rounded-xl bg-cyan-500 px-4 py-3 text-xs font-black text-white transition hover:bg-cyan-600 disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    {generatingPlan ? 'Generating plan...' : 'Generate description, milestones & tasks'}
                  </button>
                </div>
              )}
              <button
                type="button"
                onClick={() => setShowContextBubble((open) => !open)}
                aria-label="Open AI project planner"
                className="flex h-14 w-14 items-center justify-center rounded-full bg-cyan-500 text-white shadow-xl shadow-cyan-500/30 transition hover:scale-105 hover:bg-cyan-600"
              >
                {showContextBubble ? <X size={22} /> : <MessageCircle size={22} />}
              </button>
            </div>

            {/* ---------------------------------------------------------------- */}
            {/* Stats */}
            {/* ---------------------------------------------------------------- */}

            <div className="mt-5 grid grid-cols-1 gap-3 sm:grid-cols-3">
              <StatCard
                icon={<Layers size={19} />}
                label="Milestones"
                value={milestones.length}
                detail={
                  milestones.length === 0
                    ? 'No milestones'
                    : `${completedMilestones} completed`
                }
                iconClass="bg-cyan-500/10 text-cyan-500"
              />

              <StatCard
                icon={<ListTodo size={19} />}
                label="Tasks"
                value={allTasks.length}
                detail={
                  allTasks.length === 0
                    ? 'Ready to plan'
                    : `${completedTasks.length} completed`
                }
                iconClass="bg-emerald-500/10 text-emerald-500"
              />

              <StatCard
                icon={<Award size={19} />}
                label="XP earned"
                value={totalXP}
                detail={`${possibleXP} XP available`}
                iconClass="bg-amber-500/10 text-amber-500"
              />
            </div>

            {/* ---------------------------------------------------------------- */}
            {/* Milestones */}
            {/* ---------------------------------------------------------------- */}

            <section className="mt-10">
              <div className="mb-5 flex flex-wrap items-end justify-between gap-4">
                <div>
                  <p className="text-[11px] font-black uppercase tracking-[0.2em] text-cyan-500">
                    Build plan
                  </p>

                  <h2 className="mt-1 text-2xl font-black tracking-tight">
                    Milestones & tasks
                  </h2>

                  <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
                    Break the project into small, finishable pieces.
                  </p>
                </div>

                <button
                  type="button"
                  onClick={() =>
                    setIsAddingMilestone((current) => !current)
                  }
                  className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-xs font-black text-slate-700 shadow-sm transition hover:border-cyan-300 hover:text-cyan-500 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-200 dark:hover:border-cyan-500/40"
                >
                  {isAddingMilestone ? (
                    <X size={15} />
                  ) : (
                    <Plus size={15} />
                  )}

                  {isAddingMilestone
                    ? 'Cancel'
                    : 'New milestone'}
                </button>
              </div>

              {/* Add milestone */}
              {isAddingMilestone && (
                <form
                  onSubmit={handleAddMilestone}
                  className="mb-5 rounded-2xl border border-cyan-500/20 bg-cyan-500/[0.03] p-4 dark:bg-cyan-500/[0.04]"
                >
                  <div className="flex items-center gap-2">
                    <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-cyan-500/10 text-cyan-500">
                      <Plus size={15} />
                    </div>

                    <div>
                      <h3 className="text-sm font-black">
                        Create milestone
                      </h3>

                      <p className="text-xs text-slate-400">
                        Add a major step in your development plan.
                      </p>
                    </div>
                  </div>

                  <div className="mt-4 grid gap-3 md:grid-cols-[1fr_140px_auto]">
                    <input
                      type="text"
                      value={newMilestoneTitle}
                      onChange={(e) =>
                        setNewMilestoneTitle(e.target.value)
                      }
                      placeholder="e.g. Authentication system"
                      className="rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-sm outline-none transition focus:border-cyan-400 dark:border-slate-800 dark:bg-slate-950"
                      required
                    />

                    <input
                      type="number"
                      min="0"
                      value={newMilestoneReward}
                      onChange={(e) =>
                        setNewMilestoneReward(
                          Math.max(0, Number(e.target.value)),
                        )
                      }
                      className="rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-sm outline-none transition focus:border-cyan-400 dark:border-slate-800 dark:bg-slate-950"
                      placeholder="XP"
                    />

                    <button
                      type="submit"
                      disabled={creatingMilestone}
                      className="rounded-xl bg-cyan-500 px-5 py-2.5 text-xs font-black text-white transition hover:bg-cyan-600 disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      {creatingMilestone
                        ? 'Creating...'
                        : 'Create'}
                    </button>
                  </div>
                </form>
              )}

              {/* Empty milestones */}
              {milestones.length === 0 && (
                <div className="rounded-3xl border border-dashed border-slate-300 bg-white px-6 py-14 text-center dark:border-slate-700 dark:bg-slate-900">
                  <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-cyan-500/10 text-cyan-500">
                    <Layers size={24} />
                  </div>

                  <h3 className="mt-4 text-lg font-black">
                    Your build plan is empty
                  </h3>

                  <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-slate-400">
                    Create your first milestone and start turning this
                    project into a series of achievable tasks.
                  </p>

                  <button
                    type="button"
                    onClick={() => setIsAddingMilestone(true)}
                    className="mt-5 inline-flex items-center gap-2 rounded-xl bg-cyan-500 px-4 py-2.5 text-xs font-black text-white transition hover:bg-cyan-600"
                  >
                    <Plus size={15} />
                    Create first milestone
                  </button>
                </div>
              )}

              {/* Milestone cards */}
              <div className="space-y-4">
                {milestones.map((milestone, index) => {
                  const milestoneTasks =
                    tasks[milestone.id] || [];

                  const milestoneCompleted =
                    milestoneTasks.length > 0 &&
                    milestoneTasks.every(
                      (task) =>
                        task.status === TaskStatus.COMPLETED ||
                        Boolean(task.completedAt),
                    );

                  const milestoneCompletedTasks =
                    milestoneTasks.filter(
                      (task) =>
                        task.status === TaskStatus.COMPLETED ||
                        Boolean(task.completedAt),
                    ).length;

                  const milestoneProgress =
                    milestoneTasks.length > 0
                      ? Math.round(
                          (milestoneCompletedTasks /
                            milestoneTasks.length) *
                            100,
                        )
                      : 0;

                  const isAddingTask =
                    activeTaskMilestoneId === milestone.id;

                  return (
                    <article
                      key={milestone.id}
                      className={`overflow-hidden rounded-3xl border bg-white transition dark:bg-slate-900 ${
                        milestoneCompleted
                          ? 'border-emerald-500/20'
                          : 'border-slate-200 dark:border-slate-800'
                      }`}
                    >
                      {/* Milestone header */}
                      <div className="p-5 md:p-6">
                        <div className="flex items-start gap-4">
                          <div
                            className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl text-sm font-black ${
                              milestoneCompleted
                                ? 'bg-emerald-500/10 text-emerald-500'
                                : 'bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-300'
                            }`}
                          >
                            {milestoneCompleted ? (
                              <CheckCircle2 size={19} />
                            ) : (
                              String(index + 1).padStart(2, '0')
                            )}
                          </div>

                          <div className="min-w-0 flex-1">
                            <div className="flex flex-wrap items-start justify-between gap-3">
                              <div>
                                <div className="flex flex-wrap items-center gap-2">
                                  <h3 className="text-lg font-black">
                                    {milestone.title}
                                  </h3>

                                  {milestoneCompleted && (
                                    <span className="rounded-full bg-emerald-500/10 px-2 py-1 text-[10px] font-black uppercase tracking-wider text-emerald-500">
                                      Complete
                                    </span>
                                  )}
                                </div>

                                {milestone.description && (
                                  <p className="mt-1 text-sm leading-6 text-slate-500 dark:text-slate-400">
                                    {milestone.description}
                                  </p>
                                )}
                              </div>

                              <div className="flex shrink-0 items-center gap-2">
                                <span className="rounded-lg border border-amber-500/20 bg-amber-500/5 px-2.5 py-1.5 text-[11px] font-black text-amber-500">
                                  +{milestone.xpReward || 0} XP
                                </span>

                                <button
                                  type="button"
                                  onClick={() =>
                                    setActiveTaskMilestoneId(
                                      isAddingTask
                                        ? null
                                        : milestone.id,
                                    )
                                  }
                                  className={`flex h-8 w-8 items-center justify-center rounded-lg transition ${
                                    isAddingTask
                                      ? 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-200'
                                      : 'bg-cyan-500/10 text-cyan-500 hover:bg-cyan-500/20'
                                  }`}
                                  title="Add task"
                                >
                                  {isAddingTask ? (
                                    <X size={16} />
                                  ) : (
                                    <Plus size={16} />
                                  )}
                                </button>
                              </div>
                            </div>

                            {/* Milestone progress */}
                            {milestoneTasks.length > 0 && (
                              <div className="mt-5">
                                <div className="mb-2 flex justify-between text-[10px] font-black uppercase tracking-wider text-slate-400">
                                  <span>
                                    {milestoneCompletedTasks}/
                                    {milestoneTasks.length} tasks
                                  </span>

                                  <span>
                                    {milestoneProgress}%
                                  </span>
                                </div>

                                <div className="h-1.5 overflow-hidden rounded-full bg-slate-100 dark:bg-slate-800">
                                  <div
                                    className={`h-full rounded-full transition-all duration-500 ${
                                      milestoneCompleted
                                        ? 'bg-emerald-500'
                                        : 'bg-cyan-500'
                                    }`}
                                    style={{
                                      width: `${milestoneProgress}%`,
                                    }}
                                  />
                                </div>
                              </div>
                            )}
                          </div>
                        </div>

                        {/* Add task form */}
                        {isAddingTask && (
                          <form
                            onSubmit={(e) =>
                              handleAddTask(
                                e,
                                milestone.id,
                              )
                            }
                            className="mt-5 rounded-2xl border border-slate-200 bg-slate-50 p-3 dark:border-slate-800 dark:bg-slate-950/60"
                          >
                            <div className="flex flex-col gap-2 sm:flex-row">
                              <input
                                type="text"
                                value={newTaskTitle}
                                onChange={(e) =>
                                  setNewTaskTitle(
                                    e.target.value,
                                  )
                                }
                                placeholder="What needs to be done?"
                                className="min-w-0 flex-1 rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-sm outline-none transition focus:border-cyan-400 dark:border-slate-800 dark:bg-slate-900"
                                required
                                autoFocus
                              />

                              <input
                                type="number"
                                min="0"
                                value={newTaskReward}
                                onChange={(e) =>
                                  setNewTaskReward(
                                    Math.max(
                                      0,
                                      Number(
                                        e.target.value,
                                      ),
                                    ),
                                  )
                                }
                                className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm outline-none transition focus:border-cyan-400 sm:w-24 dark:border-slate-800 dark:bg-slate-900"
                                placeholder="XP"
                              />

                              <button
                                type="submit"
                                disabled={creatingTask}
                                className="rounded-xl bg-cyan-500 px-4 py-2.5 text-xs font-black text-white transition hover:bg-cyan-600 disabled:cursor-not-allowed disabled:opacity-50"
                              >
                                {creatingTask
                                  ? 'Adding...'
                                  : 'Add task'}
                              </button>
                            </div>
                          </form>
                        )}

                        {/* Tasks */}
                        <div className="mt-5">
                          {milestoneTasks.length > 0 ? (
                            <div className="divide-y divide-slate-100 overflow-hidden rounded-2xl border border-slate-100 dark:divide-slate-800 dark:border-slate-800">
                              {milestoneTasks.map((task) => {
                                const completed =
                                  task.status ===
                                    TaskStatus.COMPLETED ||
                                  Boolean(task.completedAt);

                                return (
                                  <button
                                    key={task.id}
                                    type="button"
                                    onClick={() =>
                                      toggleTask(task)
                                    }
                                    className={`group flex w-full items-center justify-between gap-4 px-4 py-3.5 text-left transition ${
                                      completed
                                        ? 'bg-emerald-500/[0.035] hover:bg-emerald-500/[0.07]'
                                        : 'bg-white hover:bg-slate-50 dark:bg-slate-900 dark:hover:bg-slate-800/70'
                                    }`}
                                  >
                                    <div className="flex min-w-0 items-center gap-3">
                                      <span
                                        className={`shrink-0 transition ${
                                          completed
                                            ? 'text-emerald-500'
                                            : 'text-slate-300 group-hover:text-cyan-500 dark:text-slate-600'
                                        }`}
                                      >
                                        {completed ? (
                                          <CheckCircle2
                                            size={19}
                                          />
                                        ) : (
                                          <Circle
                                            size={19}
                                          />
                                        )}
                                      </span>

                                      <span
                                        className={`min-w-0 truncate text-sm font-semibold ${
                                          completed
                                            ? 'text-slate-400 line-through dark:text-slate-500'
                                            : 'text-slate-700 dark:text-slate-200'
                                        }`}
                                      >
                                        {task.title}
                                      </span>
                                    </div>

                                    <span
                                      className={`shrink-0 text-[10px] font-black ${
                                        completed
                                          ? 'text-slate-400'
                                          : 'text-amber-500'
                                      }`}
                                    >
                                      +{task.xpReward || 0} XP
                                    </span>
                                  </button>
                                );
                              })}
                            </div>
                          ) : (
                            <div className="rounded-2xl border border-dashed border-slate-200 px-5 py-8 text-center dark:border-slate-800">
                              <CheckSquare
                                size={20}
                                className="mx-auto text-slate-300 dark:text-slate-600"
                              />

                              <p className="mt-2 text-xs font-semibold text-slate-400">
                                No tasks yet
                              </p>

                              <button
                                type="button"
                                onClick={() =>
                                  setActiveTaskMilestoneId(
                                    milestone.id,
                                  )
                                }
                                className="mt-2 text-xs font-black text-cyan-500 hover:text-cyan-600"
                              >
                                Add the first task
                              </button>
                            </div>
                          )}
                        </div>
                      </div>
                    </article>
                  );
                })}
              </div>
            </section>

            {/* ---------------------------------------------------------------- */}
            {/* Workspace footer */}
            {/* ---------------------------------------------------------------- */}

            <div className="mt-10 flex flex-col items-center justify-between gap-3 border-t border-slate-200 py-6 text-xs text-slate-400 sm:flex-row dark:border-slate-800">
              <div className="flex items-center gap-2">
                <Sparkles size={13} className="text-cyan-500" />
                <span className="font-semibold">
                  DevPilot Development Workspace
                </span>
              </div>

              <span>
                {completedTasks.length}/{allTasks.length} tasks complete
              </span>
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}

/*
 * =============================================================================
 * Small reusable UI component
 * =============================================================================
 */

type StatCardProps = {
  icon: React.ReactNode;
  label: string;
  value: string | number;
  detail: string;
  iconClass: string;
};

function StatCard({
  icon,
  label,
  value,
  detail,
  iconClass,
}: StatCardProps) {
  return (
    <div className="flex items-center gap-4 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900">
      <div
        className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${iconClass}`}
      >
        {icon}
      </div>

      <div className="min-w-0">
        <p className="text-[10px] font-black uppercase tracking-wider text-slate-400">
          {label}
        </p>

        <div className="mt-0.5 flex items-baseline gap-2">
          <p className="text-xl font-black">{value}</p>

          <p className="truncate text-[10px] font-semibold text-slate-400">
            {detail}
          </p>
        </div>
      </div>
    </div>
  );
}
