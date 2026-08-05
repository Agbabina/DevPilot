import { useEffect, useState } from "react";
import { Calendar, Clipboard, CheckCircle, Bot, Bolt, ArrowRight, Sparkles } from "lucide-react";
import { useNavigate } from "react-router-dom";
import Sidebar from "../Component/Sidebar";
import Card from "../Component/Card";
import Header from "../Component/Header";
import RecentProjects from "../Component/RecentProjects";
import DeveloperCopilotSection from "../Component/DeveloperCopilotSection";
import { projectService, type Project } from "../services/projectService";

export default function Dashboard() {
  const navigate = useNavigate();
  const [projects, setProjects] = useState<Project[]>([]);

  useEffect(() => {
    projectService.getAll().then(setProjects).catch(console.error);
  }, []);

  const completed = projects.filter((project) => project.status === "COMPLETED").length;
  const totalXp = projects.reduce((sum, project) => sum + project.xpReward, 0);
  const level = Math.floor(totalXp / 500) + 1;
  const averageProgress = projects.length
    ? Math.round(projects.reduce((sum, project) => sum + project.progress, 0) / projects.length)
    : 0;

  return (
    <div className="min-h-screen bg-[#f6f8fc] text-slate-900">
      <Header />
      <div className="flex">
        <Sidebar />
        <main className="min-w-0 flex-1 px-5 py-6 md:px-10 md:py-10">
          <section className="relative overflow-hidden rounded-3xl bg-slate-950 p-7 text-white shadow-xl md:p-10">
            <div className="absolute -right-16 -top-24 h-72 w-72 rounded-full bg-cyan-400/20 blur-3xl" />
            <div className="relative max-w-2xl">
              <p className="mb-3 flex items-center gap-2 text-xs font-bold uppercase tracking-[0.25em] text-cyan-300"><Sparkles size={15} /> Your command center</p>
              <h1 className="text-3xl font-bold tracking-tight md:text-5xl">Build something remarkable.</h1>
              <p className="mt-4 max-w-xl text-sm leading-6 text-slate-300">Keep your projects moving, turn milestones into tasks, and let your AI copilot handle the busywork.</p>
              <button onClick={() => navigate("/projects")} className="mt-7 inline-flex items-center gap-2 rounded-xl bg-cyan-400 px-5 py-3 text-sm font-bold text-slate-950 transition hover:bg-cyan-300">View projects <ArrowRight size={17} /></button>
            </div>
          </section>

          <div className="mt-7 grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-5">
            <Card header="XP" description={String(totalXp)} children={`Level ${level}`} icon={Bolt} />
            <Card header="Projects" description={String(projects.length)} children="Active workspace" icon={Calendar} />
            <Card header="Progress" description={`${averageProgress}%`} children="Across all projects" icon={Clipboard} />
            <Card header="Completed" description={String(completed)} children="Projects shipped" icon={CheckCircle} />
            <Card header="Milestones" description={String(completed)} children="Completed" icon={Bot} />
          </div>

          <div className="mt-7 grid gap-6 xl:grid-cols-[1.35fr_0.65fr]">
            <RecentProjects />
            <DeveloperCopilotSection />
          </div>
        </main>
      </div>
    </div>
  );
}

