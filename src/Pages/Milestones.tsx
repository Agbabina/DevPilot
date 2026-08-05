import { useState } from "react";
import { ArrowLeft, Sparkles, CheckSquare } from "lucide-react";
import { useNavigate, useParams } from "react-router-dom";
import { projectService } from "../services/projectService";

function Milestones() {
  const navigate = useNavigate();
  const { projectId } = useParams();

  const [context, setContext] = useState("");
  const [result, setResult] = useState<any>(null);
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState("");

  async function generate() {
    if (!projectId || !context.trim()) return;
    try {
      setGenerating(true);
      setError("");
      const current = await projectService.getOne(Number(projectId));
      const generated = await projectService.generateProject({
        name: current.name,
        goal: context.trim(),
        priority: current.priority,
      });
      setResult(generated);
    } catch (generationError) {
      console.error(generationError);
      setError("Could not generate milestones. Please try again.");
    } finally {
      setGenerating(false);
    }
  }

  return (
    <main className="min-h-screen bg-gray-100 p-6 md:p-10">
      <button onClick={() => navigate(-1)} className="mb-8 flex items-center gap-2 text-gray-500 hover:text-gray-900">
        <ArrowLeft size={19} /> Back to project
      </button>
      <div className="mx-auto max-w-4xl">
        <div className="mb-8 flex items-center gap-3">
          <div className="rounded-2xl bg-cyan-100 p-3 text-cyan-700"><Sparkles size={24} /></div>
          <div>
            <p className="text-sm font-semibold uppercase tracking-wider text-cyan-600">AI planning</p>
            <h1 className="text-3xl font-bold text-gray-900">Generate milestones</h1>
            <p className="mt-1 text-gray-500">Describe what you want to build and get milestones with actionable subtasks.</p>
          </div>
        </div>
        <section className="rounded-2xl bg-white p-6 shadow-sm">
          <label className="mb-2 block text-sm font-semibold text-gray-700">Project requirements</label>
          <textarea value={context} onChange={(event) => setContext(event.target.value)} placeholder="Example: Build a mobile marketplace with authentication, product listings, payments, and an admin dashboard..." className="min-h-36 w-full resize-y rounded-xl border border-gray-200 p-4 outline-none focus:border-cyan-500 focus:ring-2 focus:ring-cyan-100" />
          <button onClick={generate} disabled={generating || !context.trim()} className="mt-4 flex items-center gap-2 rounded-xl bg-cyan-600 px-5 py-3 font-semibold text-white hover:bg-cyan-700 disabled:cursor-not-allowed disabled:opacity-50">
            <Sparkles size={18} /> {generating ? "Generating..." : "Generate milestones"}
          </button>
          {error && <p className="mt-3 text-sm text-red-600">{error}</p>}
        </section>
        {result && <section className="mt-6 rounded-2xl bg-white p-6 shadow-sm">
          <h2 className="text-xl font-bold text-gray-900">Generated plan</h2>
          <p className="mt-2 text-gray-600">{result.description}</p>
          <div className="mt-6 space-y-4">
            {(result.milestones ?? []).map((milestone: any, index: number) => <article key={`${milestone.title}-${index}`} className="rounded-xl border border-gray-200 p-5">
              <div className="flex items-start justify-between gap-4"><div><p className="text-xs font-semibold uppercase tracking-wider text-cyan-600">Milestone {index + 1}</p><h3 className="mt-1 text-lg font-bold text-gray-900">{milestone.title}</h3><p className="mt-1 text-sm text-gray-500">{milestone.description}</p></div><span className="whitespace-nowrap text-sm font-semibold text-cyan-700">+{milestone.xpReward ?? 0} XP</span></div>
              <div className="mt-4 space-y-2">{(milestone.tasks ?? []).map((task: any, taskIndex: number) => <div key={`${task.title}-${taskIndex}`} className="flex gap-2 rounded-lg bg-gray-50 p-3 text-sm text-gray-700"><CheckSquare size={17} className="mt-0.5 shrink-0 text-cyan-600" /><span>{task.title}</span></div>)}</div>
            </article>)}
          </div>
        </section>}
      </div>
    </main>
  );
}
export default Milestones;

