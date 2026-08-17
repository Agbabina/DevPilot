import { useEffect, useState } from "react";
import { ArrowLeft, Save, Trash2 } from "lucide-react";
import { useNavigate, useParams } from "react-router-dom";
import Header from "../Component/Header";
import Sidebar from "../Component/Sidebar";
import { projectService, type Project, type Milestone, type Task } from "../services/projectService";

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

  useEffect(() => {
    if (!projectId) { setError("Project id is required."); setLoading(false); return; }
    (async () => {
      try {
        const id = Number(projectId);
        const current = await projectService.getOne(id);
        const items = await projectService.getMilestones(id);
        const pairs = await Promise.all(items.map(async (milestone) => [milestone.id, await projectService.getTasks(milestone.id)] as const));
        setProject(current); setDescription(current.description ?? ""); setMilestones(items); setTasks(Object.fromEntries(pairs));
      } catch { setError("Failed to load project details."); } finally { setLoading(false); }
    })();
  }, [projectId]);

  async function save() {
    if (!project || !projectId) return;
    setSaving(true);
    try { const updated = await projectService.update(Number(projectId), { description }); setProject(updated); alert("Project saved!"); }
    catch { alert("Failed to save project."); } finally { setSaving(false); }
  }

  async function remove() {
    if (!projectId || !project) return;
    if (!window.confirm(`Delete ${project.name}?`)) return;
    await projectService.delete(Number(projectId)); navigate("/projects");
  }

  if (loading) return <div className="min-h-screen bg-slate-950 p-8 text-slate-400">Loading project...</div>;
  if (error || !project) return <div className="min-h-screen bg-slate-950 p-8 text-red-400">{error || "Project not found."}</div>;

  return <div className="min-h-screen bg-slate-100 text-slate-900 dark:bg-slate-950 dark:text-slate-100"><Header /><div className="flex"><Sidebar /><main className="min-w-0 flex-1 p-5 md:p-10"><div className="mx-auto max-w-6xl"><div className="mb-8 flex flex-wrap items-center justify-between gap-3"><button onClick={() => navigate(-1)} className="inline-flex items-center gap-2 text-sm font-semibold text-slate-500 hover:text-cyan-500"><ArrowLeft size={18} /> Back to projects</button><div className="flex gap-2"><button onClick={save} disabled={saving} className="inline-flex items-center gap-2 rounded-xl bg-cyan-500 px-4 py-2 text-sm font-bold text-white disabled:opacity-60"><Save size={16} /> {saving ? "Saving..." : "Save"}</button><button onClick={remove} className="inline-flex items-center gap-2 rounded-xl border border-red-300 px-4 py-2 text-sm font-bold text-red-600"><Trash2 size={16} /> Delete</button></div></div><section className="rounded-3xl border border-cyan-400/20 bg-white p-6 shadow-sm dark:bg-slate-900"><p className="dev-mono text-xs uppercase tracking-[.25em] text-cyan-500">workspace / project</p><h1 className="mt-2 text-3xl font-black">{project.name}</h1><textarea value={description} onChange={(e) => setDescription(e.target.value)} rows={3} className="mt-5 w-full rounded-xl border border-slate-200 bg-slate-50 p-3 text-sm outline-none focus:border-cyan-400 dark:border-slate-700 dark:bg-slate-800" /></section><div className="mt-6 space-y-4">{milestones.map((milestone) => <section key={milestone.id} className="rounded-3xl border border-slate-200 bg-white p-6 dark:border-slate-800 dark:bg-slate-900"><div className="flex justify-between"><div><h2 className="text-xl font-bold">{milestone.title}</h2><p className="mt-1 text-sm text-slate-500 dark:text-slate-400">{milestone.description}</p></div><span className="text-sm font-bold text-amber-500">+{milestone.xpReward} XP</span></div><ul className="mt-4 space-y-2">{(tasks[milestone.id] ?? []).map((task) => <li key={task.id} className="rounded-xl bg-slate-50 p-3 text-sm dark:bg-slate-800"><span className="font-semibold">{task.title}</span><span className="ml-3 text-xs text-amber-500">+{task.xpReward} XP</span></li>)}</ul></section>)}</div></div></main></div></div>;
}
