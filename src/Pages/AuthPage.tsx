import { useEffect, useState } from "react";
import type { SubmitEvent } from "react";
import { Moon, Sun, Zap } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { register } from "../services/user";
import { useAuth } from "../auth/AuthContext";
import Hero from "../Component/Hero";
import BackgroundScene from "../Component/BackgroundScene";

export default function AuthPage() {
  const navigate = useNavigate();
  const { login } = useAuth();

  const [mode, setMode] = useState<"login" | "register">("login");
  const [theme, setTheme] = useState<"light" | "dark">(
    () => (localStorage.getItem("theme") as "light" | "dark") || "light",
  );
  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    document.documentElement.classList.toggle("dark", theme === "dark");
    localStorage.setItem("theme", theme);
  }, [theme]);

  async function submit(event: SubmitEvent<HTMLFormElement>) {
    event.preventDefault();

    if (loading) return;

    setError("");
    setLoading(true);

    try {
      if (mode === "register") {
        await register(username, email, password);
      }

      await login(email, password);
      navigate("/", { replace: true });
    } catch (error: any) {
      setError(
        error.response?.data?.message ?? "Authentication failed",
      );
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="auth-shell min-h-screen bg-slate-100 px-4 py-8 text-slate-900 transition-colors bg-white dark:bg-slate-950 dark:text-white">
      <BackgroundScene />
      <div className="relative z-10 mx-auto flex max-w-6xl justify-end">
        <button
          type="button"
          onClick={() =>
            setTheme(theme === "light" ? "dark" : "light")
          }
          className="rounded-xl border border-slate-200 bg-white/90 p-3 text-slate-700 shadow-sm backdrop-blur transition hover:scale-105 dark:border-slate-800 dark:bg-slate-900/80 dark:text-slate-200"
          aria-label="Toggle theme"
        >
          {theme === "light" ? <Moon size={18} /> : <Sun size={18} />}
        </button>
      </div>

      <section className="relative z-10 mx-auto grid min-h-[80vh] max-w-6xl items-center gap-12 lg:grid-cols-[1.1fr_0.9fr]">
        <div className="hidden lg:block">
          <div className="mb-6 flex items-center gap-3">
            <div className="rounded-2xl bg-cyan-400 p-3 text-slate-950 shadow-lg shadow-cyan-400/30">
              <Zap size={24} />
            </div>
            <span className="text-xl font-black tracking-tight">
              Devpilot
            </span>
          </div>
          <Hero />
        </div>

        <div className="mx-auto w-full max-w-md rounded-[2rem] border border-slate-200/80 bg-white/90 p-8 shadow-2xl shadow-cyan-950/10 backdrop-blur-xl dark:border-slate-800 dark:bg-slate-900/80">
          <div className="mb-8">
            <p className="mb-2 text-sm font-bold uppercase tracking-widest text-cyan-500">
              {mode === "login" ? "Welcome back" : "Get started"}
            </p>

            <h2 className="text-3xl font-black">
              {mode === "login" ? "Sign in" : "Create your account"}
            </h2>

            <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">
              {mode === "login"
                ? "Continue building something remarkable."
                : "Your developer progression starts here."}
            </p>
          </div>

          <form onSubmit={submit} className="space-y-4">
            {mode === "register" && (
              <input
                className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 outline-none transition focus:border-cyan-400 focus:ring-4 focus:ring-cyan-400/10 dark:border-slate-700 dark:bg-slate-800"
                placeholder="Username"
                value={username}
                onChange={(event) => setUsername(event.target.value)}
                required
              />
            )}

            <input
              className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 outline-none transition focus:border-cyan-400 focus:ring-4 focus:ring-cyan-400/10 dark:border-slate-700 dark:bg-slate-800"
              type="email"
              placeholder="Email address"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              required
            />

            <input
              className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 outline-none transition focus:border-cyan-400 focus:ring-4 focus:ring-cyan-400/10 dark:border-slate-700 dark:bg-slate-800"
              type="password"
              placeholder="Password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              minLength={8}
              required
            />

            {error && (
              <p className="rounded-xl bg-red-50 p-3 text-sm text-red-600 dark:bg-red-950/40 dark:text-red-400">
                {error}
              </p>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full rounded-xl bg-cyan-400 px-4 py-3 font-bold text-slate-950 transition hover:bg-cyan-300 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {loading
                ? "Please wait..."
                : mode === "login"
                  ? "Sign in"
                  : "Create account"}
            </button>
          </form>

          <button
            type="button"
            disabled={loading}
            onClick={() =>
              setMode(mode === "login" ? "register" : "login")
            }
            className="mt-6 w-full text-sm font-semibold text-cyan-500 hover:text-cyan-400 disabled:opacity-50"
          >
            {mode === "login"
              ? "Need an account? Create one"
              : "Already have an account? Sign in"}
          </button>
        </div>
      </section>
    </main>
  );
}
