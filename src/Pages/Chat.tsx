import { useEffect, useState } from "react";
import type { SubmitEvent } from "react";
import { Send, Sparkles, Code2, Copy, Check, Database, Lightbulb, RotateCcw } from "lucide-react";
import { projectService } from "../services/projectService";
import ReactMarkdown from "react-markdown";
import { codeToHtml } from "shiki";

type Message = {
  role: "user" | "assistant";
  text: string;
  tasks?: Array<{ title: string; description?: string; priority?: string }>;
};

function MarkdownMessage({ content }: { content: string }) {
  return (
    <ReactMarkdown
      components={{
        code({ className, children, ...props }) {
          const language = /language-(\w+)/.exec(className ?? "")?.[1];
          const isBlock = Boolean(language) || String(children).includes("\n");

          if (!isBlock) return <code {...props}>{children}</code>;

          return <ShikiCode language={language || "text"} code={String(children).replace(/\n$/, "")} />;
        },
      }}
    >
      {content}
    </ReactMarkdown>
  );
}

function ShikiCode({ language, code }: { language: string; code: string }) {
  const [html, setHtml] = useState("");

  useEffect(() => {
    const aliases: Record<string, string> = {
      js: "javascript",
      jsx: "jsx",
      ts: "typescript",
      tsx: "tsx",
      html: "html",
      htm: "html",
      css: "css",
      py: "python",
      python: "python",
      sh: "bash",
    };
    void codeToHtml(code, { lang: aliases[language] || language, theme: "github-dark" }).then(setHtml);
  }, [code, language]);

  return html ? (
    <div className="my-4 overflow-auto rounded-xl text-sm" dangerouslySetInnerHTML={{ __html: html }} />
  ) : (
    <pre className="my-4 overflow-auto rounded-xl bg-slate-950 p-4 text-sm text-slate-100"><code>{code}</code></pre>
  );
}

export default function Chat() {
  const [message, setMessage] = useState("");
  const [messages, setMessages] = useState<Message[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [mode, setMode] = useState<"chat" | "code">("chat");
  const [codeResult, setCodeResult] = useState<any>(null);
  const [copied, setCopied] = useState(false);
  const [context, setContext] = useState<{ projects: unknown[] } | null>(null);
  const [contextLoading, setContextLoading] = useState(true);

  useEffect(() => {
    projectService.getAiContext().then(setContext).catch(() => setContext({ projects: [] })).finally(() => setContextLoading(false));
  }, []);

  const suggestions = mode === "code"
    ? ["Create a reusable project card component", "Add form validation to my current flow", "Generate a typed API client"]
    : ["What should I work on next?", "Summarize my project progress", "Find blockers in my tasks"];

  async function send(event: SubmitEvent<HTMLFormElement>) {
    event.preventDefault();

    const action = message.trim();

    if (!action || loading) return;

    setMessages((current) => [
      ...current,
      { role: "user", text: action },
    ]);

    setMessage("");
    setError("");
    setLoading(true);

    try {
      const response = mode === "code"
        ? await projectService.generateCode({
            prompt: action,
            context: { product: "DevPilot workspace", workspace: context },
          })
        : await projectService.assist({
            action,
            context: { product: "DevPilot project management assistant", workspace: context },
          });

      if (mode === "code") {
        const raw = response as any;
        const generated = (raw?.code ? raw : raw?.result?.code ? raw.result : raw?.data?.code ? raw.data : raw) as {
          code?: string; explanation?: string; filename?: string; language?: string;
        };
        setCodeResult(generated);
        setMessages((current) => [...current, {
          role: "assistant",
          text: generated.code
            ? `${generated.explanation || `Generated ${generated.filename || "code"}.`}\n\n\`\`\`${generated.language || "text"}\n${generated.code}\n\`\`\``
            : "The AI returned no code. Try describing the file or component you want more specifically.",
        }]);
        return;
      }

      const assistantResponse = response as {
        answer?: string;
        result?: string;
        tasks?: Array<{ title: string; description?: string; priority?: string }>;
      };
      setMessages((current) => [
        ...current,
        {
          role: "assistant",
          text: assistantResponse.answer ?? assistantResponse.result ?? "",
          tasks: assistantResponse.tasks ?? [],
        },
      ]);
    } catch (error: any) {
      setError(
        error.response?.data?.message ??
          "The AI assistant is unavailable.",
      );
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="min-h-screen bg-slate-100 p-4 dark:bg-slate-950 md:p-8">
      <div className="mx-auto max-w-6xl">
        <div className="mb-6 flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
          <div className="flex items-center gap-3">
          <Sparkles className="text-cyan-500" />

          <div>
            <p className="text-sm font-bold uppercase tracking-widest text-cyan-500">
              DevPilot AI
            </p>

            <h1 className="text-3xl font-black">
              Developer copilot
            </h1>
          </div>
          </div>
          <div className="flex items-center gap-2 rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1.5 text-xs font-bold text-emerald-700 dark:border-emerald-900 dark:bg-emerald-950/40 dark:text-emerald-300"><span className="h-2 w-2 rounded-full bg-emerald-500" /> {contextLoading ? "Syncing workspace" : `${context?.projects.length ?? 0} projects in context`}</div>
        </div>

        <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_250px]">
        <section className="min-h-[68vh] rounded-3xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900 md:p-7">
          <div className="mb-5 flex flex-wrap gap-2"><button onClick={() => setMode("chat")} className={`rounded-xl px-4 py-2 text-sm font-bold ${mode === "chat" ? "bg-cyan-500 text-white" : "bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300"}`}>Assistant</button><button onClick={() => setMode("code")} className={`flex items-center gap-2 rounded-xl px-4 py-2 text-sm font-bold ${mode === "code" ? "bg-cyan-500 text-white" : "bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300"}`}><Code2 size={16}/> Generate code</button><button onClick={() => { setMessages([]); setCodeResult(null); }} className="ml-auto rounded-xl p-2 text-slate-400 hover:text-cyan-500" title="Clear conversation"><RotateCcw size={17}/></button></div>
          {messages.length === 0 && <div className="flex min-h-[38vh] flex-col items-center justify-center text-center"><div className="mb-4 rounded-2xl bg-cyan-50 p-4 text-cyan-600 dark:bg-cyan-950/40"><Sparkles size={28}/></div><h2 className="text-2xl font-black">What are you building?</h2><p className="mt-2 max-w-md text-sm leading-6 text-slate-500">Ask about your workspace, get unstuck, or turn an idea into production-ready code.</p><div className="mt-6 flex flex-wrap justify-center gap-2">{suggestions.map((item) => <button key={item} onClick={() => setMessage(item)} className="rounded-full border border-slate-200 px-3 py-2 text-xs font-semibold text-slate-600 hover:border-cyan-400 dark:border-slate-700 dark:text-slate-300">{item}</button>)}</div></div>}
          {mode === "code" && codeResult && <div className="mb-6 overflow-hidden rounded-2xl bg-slate-950 text-slate-100"><div className="flex items-center justify-between border-b border-slate-800 px-4 py-3 text-sm"><span>{codeResult.filename ?? "generated-code"}</span><button onClick={() => { navigator.clipboard.writeText(codeResult.code); setCopied(true); setTimeout(() => setCopied(false), 1200); }} className="flex items-center gap-1 text-cyan-300">{copied ? <Check size={15}/> : <Copy size={15}/>} {copied ? "Copied" : "Copy"}</button></div><pre className="max-h-[50vh] overflow-auto p-4 text-xs leading-6"><code>{codeResult.code}</code></pre></div>}
          <div className="space-y-4">
            {messages.map((item, index) => (
              <div
                key={index}
                className={`max-w-2xl rounded-2xl p-4 ${
                  item.role === "user"
                    ? "ml-auto bg-cyan-500 text-slate-950"
                    : "bg-slate-100 dark:bg-slate-800"
                }`}
              >
                {item.role === "assistant" ? (
                  <>
                    <MarkdownMessage content={item.text} />
                    {item.tasks && item.tasks.length > 0 && (
                      <div className="mt-4 space-y-2 border-t border-slate-300 pt-3 dark:border-slate-700">
                        <p className="text-xs font-bold uppercase tracking-wider text-cyan-600">Suggested tasks</p>
                        {item.tasks.map((task, taskIndex) => (
                          <div key={`${task.title}-${taskIndex}`} className="rounded-xl bg-white p-3 shadow-sm dark:bg-slate-900">
                            <div className="flex items-center justify-between gap-3">
                              <p className="font-semibold">{task.title}</p>
                              {task.priority && <span className="text-[10px] font-bold uppercase text-cyan-600">{task.priority}</span>}
                            </div>
                            {task.description && <p className="mt-1 text-sm text-slate-500">{task.description}</p>}
                          </div>
                        ))}
                      </div>
                    )}
                  </>
                ) : item.text}
              </div>
            ))}

            {loading && (
              <p className="text-sm text-slate-500">
                DevPilot is thinking...
              </p>
            )}
          </div>

          {error && (
            <p className="mt-4 text-sm text-red-500">
              {error}
            </p>
          )}

          <form
            onSubmit={send}
            className="mt-8 flex gap-3"
          >
            <input
              value={message}
              onChange={(event) =>
                setMessage(event.target.value)
              }
              placeholder={mode === "code" ? "Describe the code you want generated..." : "Ask about your project..."}
              className="min-w-0 flex-1 rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 outline-none focus:border-cyan-400 dark:border-slate-700 dark:bg-slate-800"
            />

            <button
              type="submit"
              disabled={loading || !message.trim()}
              className="rounded-xl bg-cyan-500 px-5 text-slate-950 disabled:opacity-50"
            >
              <Send size={18} />
            </button>
          </form>
        </section>
        <aside className="hidden rounded-3xl border border-slate-200 bg-white p-5 dark:border-slate-800 dark:bg-slate-900 lg:block"><div className="flex items-center gap-2 text-sm font-bold"><Database size={16} className="text-cyan-500"/> Workspace context</div><p className="mt-2 text-xs leading-5 text-slate-500">The assistant can use your live project data to give specific answers.</p><div className="mt-5 space-y-2 text-xs text-slate-500"><div className="flex justify-between"><span>Projects</span><strong className="text-slate-900 dark:text-slate-100">{context?.projects.length ?? 0}</strong></div><div className="flex justify-between"><span>Source</span><strong className="text-emerald-500">Live workspace</strong></div></div><div className="mt-8 rounded-2xl bg-slate-50 p-3 text-xs leading-5 text-slate-500 dark:bg-slate-800"><Lightbulb size={15} className="mb-2 text-amber-500"/> Try asking for a next step, a progress summary, or a risk review.</div></aside>
        </div>
      </div>
    </main>
  );
}


