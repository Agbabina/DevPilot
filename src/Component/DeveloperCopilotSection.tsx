import { ArrowUpRight, Bot, SendHorizonal, Sparkles } from 'lucide-react';

function DeveloperCopilotSection() {
  const suggestions = [
    'Create a project module',
    'Generate a dashboard card',
    'Refactor backend config',
  ];

  return (
    <section className="rounded-3xl bg-white p-5 shadow-2xl shadow-cyan-950/30 ml-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="rounded-2xl bg-cyan-500/15 p-2 text-blue-600">
            <Bot size={18} />
          </div>

          <div>
            <p className="text-[10px] font-semibold uppercase tracking-[0.35em] text-blue-600">
              Developer Copilot
            </p>
            <h2 className="text-lg font-bold">AI coding assistant</h2>
          </div>
        </div>

        <Sparkles size={18} className="text-cyan-300" />
      </div>

      <div className="mt-5 rounded-2xl bg-white p-4 text-black">
        <p className="text-sm text-black">Ask DevPilot to:</p>

        <div className="mt-3 flex flex-wrap gap-2">
          {suggestions.map((item) => (
            <button
              key={item}
              type="button"
              className="rounded-3xl border border-cyan-400/20 bg-cyan-100 px-3 py-1 text-xs  transition hover:bg-cyan-300 text-black"
            >
              {item}
            </button>
          ))}
        </div>

        <div className="mt-4 flex items-center gap-2 rounded-2xl border border-white/10 bg-slate-200 px-3 py-2">
          <input
            type="text"
            placeholder="Describe what you want to build..."
            className="w-full bg-gray-200 text-sm text-black outline-none placeholder:text-grey"
          />

          <button
            type="button"
            className="rounded-xl bg-cyan-500 p-2 text-slate-950 transition hover:bg-cyan-400"
          >
            <SendHorizonal size={16} />
          </button>
        </div>
      </div>

      <div className="mt-4 rounded-2xl bg-white/5 p-4">
        <div className="flex items-center gap-2 text-cyan-300">
          <Bot size={16} />
          <span className="text-sm font-semibold">Assistant</span>
        </div>

        <p className="mt-2 text-sm text-slate-300">
          Ready to generate backend modules, API routes, and polished UI components for your product.
        </p>

        <button
          type="button"
          className="mt-3 inline-flex items-center gap-2 text-sm font-semibold text-cyan-300"
        >
          Open session
          <ArrowUpRight size={14} />
        </button>
      </div>
    </section>
  );
}

export default DeveloperCopilotSection