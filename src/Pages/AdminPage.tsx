import { useEffect, useState } from "react";
import { Activity, Eye, Users, RefreshCw, ShieldCheck, TrendingUp } from "lucide-react";
import api from "../services/api";
import { useAuth } from "../auth/AuthContext";

type DashboardData = {
  totalUsers: number;
  totalUniqueVisitors: number;
  uniqueVisitorsLast7Days: number;
  totalVisits: number;
  visitsToday: number;
  daily: { date: string; visits: number; uniqueVisitors: number }[];
  recentUsers: { id: number; username: string; email: string; createdAt: string }[];
};

const formatNumber = (value: number) => new Intl.NumberFormat().format(value);

export default function AdminPage() {
  const { user } = useAuth();
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  async function load() {
    setLoading(true);
    setError("");
    try {
      const response = await api.get<DashboardData>("/admin/analytics");
      setData(response.data);
    } catch (err: any) {
      setError(err?.response?.status === 403
        ? "This account is not on the server's administrator allowlist."
        : "Could not load admin data. Check the API connection and administrator configuration.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { void load(); }, []);

  if (!user?.isAdmin) {
    return <main className="min-h-screen bg-slate-50 p-8 dark:bg-slate-950"><div className="mx-auto max-w-2xl rounded-2xl border border-amber-200 bg-white p-8 dark:border-amber-900 dark:bg-slate-900"><ShieldCheck className="mb-4 text-amber-500" size={32}/><h1 className="text-2xl font-bold">Admin access required</h1><p className="mt-2 text-slate-600 dark:text-slate-300">This account is not configured as an administrator. Set ADMIN_USER_IDS on the backend to your DevPilot user ID, then sign in again.</p></div></main>;
  }

  const cards = [
    { label: "Unique browsers", value: data?.totalUniqueVisitors ?? 0, note: "All-time anonymous visitors", icon: Eye },
    { label: "Opened today", value: data?.visitsToday ?? 0, note: "Browser visits recorded today", icon: Activity },
    { label: "Last 7 days", value: data?.uniqueVisitorsLast7Days ?? 0, note: "Unique browsers in the last week", icon: TrendingUp },
    { label: "Registered users", value: data?.totalUsers ?? 0, note: "Accounts created", icon: Users },
  ];

  return <main className="min-h-screen flex-1 bg-slate-50 p-5 md:p-9 dark:bg-slate-950">
    <div className="mx-auto max-w-6xl">
      <div className="mb-8 flex flex-wrap items-center justify-between gap-4">
        <div><div className="mb-2 flex items-center gap-2 text-xs font-bold uppercase tracking-[.2em] text-indigo-600"><ShieldCheck size={15}/> Private control center</div><h1 className="text-3xl font-black text-slate-900 dark:text-white">DevPilot Admin</h1><p className="mt-2 text-sm text-slate-500">Welcome, {user?.username}. Anonymous website traffic and account overview.</p></div>
        <button onClick={() => void load()} className="flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100"><RefreshCw size={16}/> Refresh</button>
      </div>
      {error && <div role="alert" className="mb-5 rounded-xl border border-amber-300 bg-amber-50 p-4 text-sm text-amber-900">{error}</div>}
      {loading && <p className="mb-5 text-sm text-slate-500">Loading analytics…</p>}
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {cards.map(({ label, value, note, icon: Icon }) => <section key={label} className="rounded-2xl border border-slate-200 bg-white p-5 dark:border-slate-800 dark:bg-slate-900"><div className="flex items-center justify-between"><span className="text-sm font-medium text-slate-500">{label}</span><Icon className="text-indigo-500" size={20}/></div><div className="mt-4 text-3xl font-black text-slate-900 dark:text-white">{loading ? "—" : formatNumber(value)}</div><p className="mt-1 text-xs text-slate-500">{note}</p></section>)}
      </div>
      <div className="mt-6 grid gap-6 lg:grid-cols-[1.3fr_1fr]">
        <section className="rounded-2xl border border-slate-200 bg-white p-6 dark:border-slate-800 dark:bg-slate-900"><h2 className="flex items-center gap-2 text-lg font-bold"><Activity size={18}/> Traffic · last 7 days</h2><p className="mt-1 text-sm text-slate-500">Visits and unique browsers per UTC day.</p><div className="mt-6 flex h-48 items-end gap-3">{(data?.daily ?? []).map((day) => { const max = Math.max(1, ...(data?.daily ?? []).map((item) => item.visits)); return <div key={day.date} className="flex min-w-0 flex-1 flex-col items-center gap-2"><span className="text-xs text-slate-500">{day.visits}</span><div className="flex w-full items-end justify-center" style={{height: "130px"}}><div title={String(day.visits) + " visits; " + String(day.uniqueVisitors) + " unique browsers"} className="w-full max-w-10 rounded-t-lg bg-indigo-500" style={{height: String(Math.max(4, day.visits / max * 100)) + "%"}}/></div><span className="text-[10px] text-slate-500">{day.date.slice(5)}</span></div>; })}</div>{!loading && !data?.daily.length && <p className="mt-4 text-sm text-slate-500">No visits recorded yet. Open the public site after deployment to start collecting data.</p>}</section>
        <section className="rounded-2xl border border-slate-200 bg-white p-6 dark:border-slate-800 dark:bg-slate-900"><h2 className="text-lg font-bold">Recent accounts</h2><p className="mt-1 text-sm text-slate-500">Latest registrations</p><div className="mt-4 divide-y divide-slate-100 dark:divide-slate-800">{(data?.recentUsers ?? []).map((item) => <div key={item.id} className="flex items-center justify-between gap-3 py-3"><div className="min-w-0"><p className="truncate text-sm font-semibold">{item.username}</p><p className="truncate text-xs text-slate-500">{item.email}</p></div><span className="shrink-0 text-xs text-slate-500">#{item.id}</span></div>)}</div>{!loading && !data?.recentUsers.length && <p className="mt-4 text-sm text-slate-500">No accounts yet.</p>}</section>
      </div>
      <p className="mt-6 text-xs leading-5 text-slate-500">Visitor counts are estimates based on anonymous browser IDs stored in local storage. Clearing browser data or using another browser/device can count as a new visitor. No IP address is stored by this feature.</p>
    </div>
  </main>;
}
