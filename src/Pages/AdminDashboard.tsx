import { useEffect, useState } from 'react';
import { Navigate } from 'react-router-dom';
import { Activity, ArrowUpRight, Eye, ShieldCheck, Users, UserPlus, RefreshCw, AlertCircle } from 'lucide-react';
import api from '../services/api';
import { useAuth } from '../auth/AuthContext';

type Overview = {
  generatedAt: string;
  totals: { registeredUsers: number; newUsersToday: number; pageViews: number; pageViewsToday: number; uniqueVisitors: number; uniqueVisitorsToday: number; uniqueVisitors7d: number };
  daily: { date: string; pageViews: number; uniqueVisitors: number }[];
  topPages: { path: string; views: number }[];
  recentUsers: { id: number; username: string; email: string; createdAt: string }[];
};

const number = (value: number) => new Intl.NumberFormat().format(value || 0);
const dateLabel = (value: string) => new Date(value + 'T00:00:00Z').toLocaleDateString(undefined, { month: 'short', day: 'numeric', timeZone: 'UTC' });

export default function AdminDashboard() {
  const { user } = useAuth();
  const [data, setData] = useState<Overview | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  async function load() {
    setLoading(true);
    setError('');
    try {
      const response = await api.get<Overview>('/analytics/admin/overview');
      setData(response.data);
    } catch (e: any) {
      setError(e?.response?.status === 403 ? 'Your account is not on the server-side ADMIN_EMAILS allowlist.' : e?.response?.status === 401 ? 'Your session expired. Sign in again.' : 'Could not load analytics. Check that the production API is deployed and reachable.');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { if (user?.isAdmin) void load(); }, [user?.isAdmin]);
  if (!user?.isAdmin) return <Navigate to="/app" replace />;

  const totals = data?.totals;
  const maxViews = Math.max(1, ...(data?.daily.map((day) => day.pageViews) || [1]));
  const stats = [
    { label: 'Unique visitors', value: number(totals?.uniqueVisitors || 0), note: number(totals?.uniqueVisitorsToday || 0) + ' today', icon: Users },
    { label: 'Visitors · 7 days', value: number(totals?.uniqueVisitors7d || 0), note: 'Unique browser IDs', icon: Activity },
    { label: 'Page views', value: number(totals?.pageViews || 0), note: number(totals?.pageViewsToday || 0) + ' today', icon: Eye },
    { label: 'Registered users', value: number(totals?.registeredUsers || 0), note: '+' + number(totals?.newUsersToday || 0) + ' today', icon: UserPlus },
  ];

  return <main className="min-h-screen bg-slate-950 px-4 py-6 text-slate-100 sm:px-8 lg:px-12">
    <div className="mx-auto max-w-7xl">
      <header className="mb-8 flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-3"><div className="grid h-12 w-12 place-items-center rounded-2xl border border-cyan-300/25 bg-cyan-300/10 text-cyan-200"><ShieldCheck size={24}/></div><div><p className="text-xs font-bold uppercase tracking-[.24em] text-cyan-300">DevPilot / Control plane</p><h1 className="mt-1 text-3xl font-black tracking-tight">Admin overview</h1><p className="mt-1 text-sm text-slate-400">Traffic, adoption, and account activity.</p></div></div>
        <button onClick={() => void load()} disabled={loading} className="inline-flex items-center gap-2 rounded-xl border border-slate-700 bg-slate-900 px-4 py-2.5 text-sm font-bold hover:border-cyan-300/50 disabled:opacity-50"><RefreshCw size={16} className={loading ? 'animate-spin' : ''}/> Refresh</button>
      </header>
      {error && <div role="alert" className="mb-5 flex items-start gap-3 rounded-2xl border border-rose-400/25 bg-rose-400/10 p-4 text-sm text-rose-200"><AlertCircle size={18} className="mt-0.5 shrink-0"/>{error}</div>}
      {loading && !data ? <div className="rounded-2xl border border-slate-800 bg-slate-900 p-8 text-slate-400">Loading private analytics…</div> : <>
        <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {stats.map((stat) => <article key={stat.label} className="rounded-2xl border border-slate-800 bg-slate-900/80 p-5 shadow-xl shadow-black/10"><div className="flex items-center justify-between text-sm text-slate-400"><span>{stat.label}</span><stat.icon size={18} className="text-cyan-300"/></div><p className="mt-4 text-3xl font-black tracking-tight">{loading ? '—' : stat.value}</p><p className="mt-2 text-xs text-slate-500">{stat.note}</p></article>)}
        </section>
        <section className="mt-6 grid gap-6 xl:grid-cols-[1.5fr_1fr]">
          <article className="rounded-2xl border border-slate-800 bg-slate-900/80 p-5 sm:p-6"><div className="mb-6 flex items-start justify-between gap-3"><div><h2 className="text-lg font-bold">Traffic · 14 days</h2><p className="mt-1 text-sm text-slate-400">Page views by UTC day; unique visitors are counted separately.</p></div><ArrowUpRight size={19} className="text-cyan-300"/></div>
            <div className="flex h-52 items-end gap-2 border-b border-slate-800 pb-2">{(data?.daily || []).map((day) => <div key={day.date} className="flex h-full min-w-0 flex-1 flex-col items-center justify-end gap-2" title={day.date + ': ' + day.pageViews + ' views, ' + day.uniqueVisitors + ' unique visitors'}><span className="text-[10px] text-slate-400">{day.pageViews || ''}</span><div className="w-full max-w-8 rounded-t-md bg-gradient-to-t from-cyan-600 to-cyan-300" style={{ height: Math.max(day.pageViews ? 6 : 2, (day.pageViews / maxViews) * 145) + 'px' }}/><span className="text-[9px] text-slate-500">{dateLabel(day.date)}</span></div>)}</div>
          </article>
          <article className="rounded-2xl border border-slate-800 bg-slate-900/80 p-5 sm:p-6"><h2 className="text-lg font-bold">Top pages</h2><p className="mb-5 mt-1 text-sm text-slate-400">Most viewed paths in the last 14 days.</p>{data?.topPages.length ? <div className="space-y-3">{data.topPages.map((page) => <div key={page.path} className="flex items-center justify-between gap-4 rounded-xl bg-slate-950/70 px-3 py-3"><span className="min-w-0 truncate font-mono text-sm text-slate-300">{page.path}</span><span className="shrink-0 text-sm font-bold text-cyan-200">{number(page.views)}</span></div>)}</div> : <p className="text-sm text-slate-500">No page visits recorded yet.</p>}</article>
        </section>
        <section className="mt-6 rounded-2xl border border-slate-800 bg-slate-900/80 p-5 sm:p-6"><div className="mb-5"><h2 className="text-lg font-bold">Recently registered</h2><p className="mt-1 text-sm text-slate-400">New accounts on DevPilot.</p></div><div className="overflow-x-auto"><table className="w-full min-w-[520px] text-left text-sm"><thead><tr className="border-b border-slate-800 text-xs uppercase tracking-wider text-slate-500"><th className="pb-3 pr-4">User</th><th className="pb-3 pr-4">Email</th><th className="pb-3">Joined</th></tr></thead><tbody>{data?.recentUsers.map((item) => <tr key={item.id} className="border-b border-slate-800/70 last:border-0"><td className="py-3 pr-4 font-semibold text-slate-200">{item.username}</td><td className="py-3 pr-4 text-slate-400">{item.email}</td><td className="py-3 text-slate-400">{new Date(item.createdAt).toLocaleDateString()}</td></tr>)}</tbody></table>{!data?.recentUsers.length && <p className="py-5 text-sm text-slate-500">No registered users yet.</p>}</div></section>
        <p className="mt-5 text-xs text-slate-600">Visitor counts are approximate unique browsers, not verified people. Analytics stores a hash of a random browser ID and page paths, not names, emails, or IP addresses. {data?.generatedAt ? 'Updated ' + new Date(data.generatedAt).toLocaleString() + '.' : ''}</p>
      </>}
    </div>
  </main>;
}
