import { Award, Coins, Sparkles } from "lucide-react";
import { useAuth } from "../auth/AuthContext";
import Header from "../Component/Header";
import Sidebar from "../Component/Sidebar";



export default function Rewards() {
  const { user } = useAuth();
  const rewards = [{ title: "Total XP", value: `${user?.totalXp ?? 0} XP`, note: "Earn XP by completing work" }, { title: "Current level", value: `Level ${user?.level ?? 1}`, note: "Keep completing milestones" }, { title: "Coins", value: `${user?.coins ?? 0}`, note: "Available to spend" }];
  return (
    <div className="min-h-screen bg-slate-50 text-slate-900">
      <Header />
      <div className="flex">
        <Sidebar />
        <main className="min-w-0 flex-1 px-5 py-6 md:px-10 md:py-10">
          <div className="mb-8">
            <p className="text-sm font-semibold uppercase tracking-[0.25em] text-cyan-600">Rewards center</p>
            <h1 className="text-3xl font-bold tracking-tight">Celebrate the wins that keep you moving</h1>
          </div>

          <section className="rounded-3xl border border-cyan-100 bg-cyan-50 p-6 shadow-sm">
            <div className="flex flex-wrap items-center justify-between gap-4">
              <div>
                <div className="flex items-center gap-2 text-cyan-700">
                  <Award size={18} />
                  <span className="text-sm font-semibold uppercase tracking-[0.2em]">Current streak</span>
                </div>
                <h2 className="mt-3 text-3xl font-bold text-slate-900">{user?.currentStreak ?? 0} day streak</h2>
                <p className="mt-2 max-w-2xl text-sm text-slate-600">You are building momentum. Keep the cadence up and unlock your next milestone reward.</p>
              </div>
              <div className="rounded-2xl bg-white px-4 py-3 text-cyan-700 shadow-sm">
                <div className="flex items-center gap-2 font-semibold"><Coins size={16} /> {user?.coins ?? 0} coins</div>
              </div>
            </div>
          </section>

          <div className="mt-6 grid gap-4 md:grid-cols-3">
            {rewards.map((reward) => (
              <section key={reward.title} className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
                <div className="flex items-center gap-2 text-cyan-600">
                  <Sparkles size={16} />
                  <span className="text-sm font-semibold">{reward.title}</span>
                </div>
                <p className="mt-4 text-2xl font-bold">{reward.value}</p>
                <p className="mt-1 text-sm text-slate-500">{reward.note}</p>
              </section>
            ))}
          </div>
        </main>
      </div>
    </div>
  );
}


