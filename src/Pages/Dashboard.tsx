import { useEffect, useState } from "react";
import { Calendar, Clipboard, CheckCircle, Bot, Bolt, Coins, ArrowRight, Sparkles, Moon, Sun } from "lucide-react";
import { useNavigate } from "react-router-dom";
import Sidebar from "../Component/Sidebar";
import Card from "../Component/Card";
import Header from "../Component/Header";
import RecentProjects from "../Component/RecentProjects";
import DeveloperCopilotSection from "../Component/DeveloperCopilotSection";
import BackgroundScene from "../Component/BackgroundScene";
import { projectService, type Project } from "../services/projectService";
import { useAuth } from "../auth/AuthContext";
import heroImage from "../assets/hero.png";
import RecentTasks from "../Component/RecentTasks";
export default function Dashboard() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [projects, setProjects] = useState<Project[]>([]);
  const [darkMode, setDarkMode] = useState(() => localStorage.getItem("theme") === "dark");

  function toggleDarkMode() {
    const next = !darkMode;
    setDarkMode(next);
    localStorage.setItem("theme", next ? "dark" : "light");
    document.documentElement.classList.toggle("dark", next);
  }

  useEffect(() => {
    projectService.getAll().then(setProjects).catch(console.error);
  }, []);
  const completed = projects.filter((project) => project.status === "COMPLETED").length;
  const totalXp = projects.reduce((sum, project) => sum + project.xpReward, 0);
  const averageProgress = projects.length
    ? Math.round(projects.reduce((sum, project) => sum + project.progress, 0) / projects.length)
    : 0;

  return (
    <div className="dashboard-shell min-h-screen dev-grid bg-slate-50 text-slate-900 dark:bg-slate-950 dark:text-slate-100">
      <BackgroundScene />
      <Header />
      <div className="relative z-10 flex flex-col lg:flex-row">
        <Sidebar />
        <main className="min-w-0 flex-1 px-5 py-6 md:px-10 md:py-8">
          <div className="mb-4 flex justify-end"><button onClick={toggleDarkMode} className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-600 shadow-sm hover:border-cyan-400 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200" aria-label="Toggle dark mode">{darkMode ? <Sun size={16} /> : <Moon size={16} />} {darkMode ? "Light mode" : "Dark mode"}</button></div>
          <section className="relative isolate overflow-hidden dev-scanline rounded-[2rem] border border-slate-200/80 bg-white/90 p-7 text-slate-900 shadow-[0_20px_50px_rgba(15,23,42,0.18)] backdrop-blur-xl dark:border-cyan-400/20 dark:bg-slate-900/80 dark:text-slate-100 dark:shadow-[0_20px_60px_rgba(0,0,0,0.45)] shadow-[0_20px_50px_rgba(15,23,42,0.18)] md:p-10">
            <div className="absolute -right-16 -top-24 h-72 w-72 rounded-full bg-cyan-400/20 blur-3xl" />
            <div className="absolute inset-y-0 right-0 hidden w-[47%] bg-gradient-to-l from-cyan-400/10 via-cyan-400/[0.03] to-transparent md:block" />
            <div className="relative z-10 max-w-2xl md:pr-[38%]">
              <p className="mb-3 flex items-center gap-2 text-xs font-bold uppercase tracking-[0.25em] text-cyan-600"><Sparkles size={15} /> terminal / overview</p>
              <h1 className="text-3xl font-bold tracking-tight md:text-5xl">Ship the next version.</h1>
              <p className="mt-4 max-w-xl text-sm leading-6 text-slate-500 dark:text-slate-400">A focused workspace for turning ambitious ideas into shipped software.</p>
              <button onClick={() => navigate("/projects")} className="mt-7 inline-flex items-center gap-2 rounded-xl bg-cyan-500 px-5 py-3 text-sm font-bold text-white transition hover:bg-cyan-200">Open project index <ArrowRight size={17} /></button>
            </div>
            <div className="relative z-10 mt-8 flex justify-center md:absolute md:inset-y-0 md:right-5 md:mt-0 md:w-[43%] md:items-center md:justify-end">
              <img src={heroImage} alt="DevPilot workspace illustration" className="h-auto max-h-56 w-full max-w-sm object-contain drop-shadow-[0_22px_30px_rgba(0,0,0,0.38)] md:max-h-64 md:max-w-md" />
            </div>
          </section>

          <div className="mt-7 grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-5">
            <Card header="XP" description={String(user?.totalXp ?? totalXp)} children={`Level ${user?.level ?? 1}`} icon={Bolt} />
            <Card header="Projects" description={String(projects.length)} children="Active workspace" icon={Calendar} />
            <Card header="Progress" description={`${averageProgress}%`} children="Across all projects" icon={Clipboard} />
            <Card header="Completed" description={String(completed)} children="Projects shipped" icon={CheckCircle} />
            <Card header="Coins" description={String(user?.coins ?? 0)} children="Spendable rewards" icon={Coins} />
            <Card header="Milestones" description={String(completed)} children="Completed" icon={Bot} />
          </div>

          <div className="mt-7 grid gap-6 xl:grid-cols-2]">
            <RecentTasks></RecentTasks>
            <RecentProjects />
            <DeveloperCopilotSection />
          </div>
        </main>
      </div>
    </div>
  );
}











