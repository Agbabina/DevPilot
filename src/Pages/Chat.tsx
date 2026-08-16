import { useState } from "react";
import type { SubmitEvent } from "react";
import { Send, Sparkles, Code2, Copy, Check } from "lucide-react";
import api from "../services/api";

type Message = {
  role: "user" | "assistant";
  text: string;
};

export default function Chat() {
  const [message, setMessage] = useState("");
  const [messages, setMessages] = useState<Message[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [mode, setMode] = useState<"chat" | "code">("chat");
  const [codeResult, setCodeResult] = useState<any>(null);
  const [copied, setCopied] = useState(false);

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
      const response = await api.post<{ result: string }>(
        "/ai/assist",
        {
          action,
          context: "DevPilot project management assistant",
        },
      );

      setMessages((current) => [
        ...current,
        {
          role: "assistant",
          text: response.data.result,
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
    <main className="min-h-screen bg-slate-100 p-6 dark:bg-slate-950 md:p-10">
      <div className="mx-auto max-w-4xl">
        <div className="mb-8 flex items-center gap-3">
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

        <div className="mb-4 flex gap-2"><button onClick={() => setMode("chat")} className={`rounded-xl px-4 py-2 text-sm font-bold ${mode === "chat" ? "bg-cyan-500 text-white" : "bg-white text-slate-600"}`}>Assistant</button><button onClick={() => setMode("code")} className={`flex items-center gap-2 rounded-xl px-4 py-2 text-sm font-bold ${mode === "code" ? "bg-cyan-500 text-white" : "bg-white text-slate-600"}`}><Code2 size={16}/> Generate code</button></div>
        <section className="min-h-[55vh] rounded-3xl bg-white p-6 shadow-sm dark:bg-slate-900">
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
                {item.text}
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
      </div>
    </main>
  );
}


