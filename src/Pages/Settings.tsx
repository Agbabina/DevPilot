import { Settings as SettingsIcon, ShieldCheck, BellRing } from "lucide-react";
import Header from "../Component/Header";
import Sidebar from "../Component/Sidebar";

export default function Settings() {
  return (
    <div className="min-h-screen bg-slate-50 text-slate-900">
      <Header />
      <div className="flex">
        <Sidebar />
        <main className="min-w-0 flex-1 px-5 py-6 md:px-10 md:py-10">
          <div className="mb-8">
            <p className="text-sm font-semibold uppercase tracking-[0.25em] text-cyan-600">Settings</p>
            <h1 className="text-3xl font-bold tracking-tight">Tune your workspace experience</h1>
          </div>

          <div className="grid gap-4 lg:grid-cols-2">
            <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
              <div className="flex items-center gap-2 text-cyan-600">
                <ShieldCheck size={18} />
                <h2 className="text-lg font-semibold">Security</h2>
              </div>
              <p className="mt-3 text-sm text-slate-600">Two-factor authentication and secure session controls are ready to be configured.</p>
            </section>

            <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
              <div className="flex items-center gap-2 text-cyan-600">
                <BellRing size={18} />
                <h2 className="text-lg font-semibold">Notifications</h2>
              </div>
              <p className="mt-3 text-sm text-slate-600">Choose how DevPilot should alert you about progress, milestones, and rewards.</p>
            </section>
          </div>

          <section className="mt-6 rounded-3xl border border-slate-200 bg-slate-950 p-6 text-white">
            <div className="flex items-center gap-2 text-cyan-300">
              <SettingsIcon size={18} />
              <h2 className="text-lg font-semibold">Workspace preferences</h2>
            </div>
            <p className="mt-3 max-w-2xl text-sm text-slate-300">Switch themes, adjust the dashboard, and personalize the experience from this central place.</p>
          </section>
        </main>
      </div>
    </div>
  );
}
