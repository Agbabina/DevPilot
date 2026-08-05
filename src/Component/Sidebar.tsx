import {
  Rocket,
  LayoutDashboard,
  Folder,
  MessageSquare,
  Trophy,
  Settings,
} from "lucide-react";

import SidebarItem from "./SidebarItem";

function Sidebar() {
  return (
    <aside className="flex h-screen w-64 flex-col bg-white shadow">

      {/* Logo */}
      <div className="flex items-center gap-3 px-4 pt-8">
        <Rocket
          size={40}
          className="text-blue-600"
        />

        <h1 className="text-2xl font-bold">
          DevPilot
        </h1>
		
      </div>

      {/* Navigation */}
      <nav className="mt-10 flex flex-col gap-2 px-3">

        <SidebarItem
          icon={LayoutDashboard}
          label="Dashboard"
          to="/"
        />

        <SidebarItem
          icon={Folder}
          label="Projects"
          to="/projects"
        />

        <SidebarItem
          icon={MessageSquare}
          label="AI Chat"
          to="/chat"
          badge="AI"
        />

        <SidebarItem
          icon={Trophy}
          label="Milestones"
          to="/milestones"
        />

      </nav>

      {/* Settings at bottom */}
      <div className="mt-auto px-3 pb-6">
        <SidebarItem
          icon={Settings}
          label="Settings"
          to="/settings"
        />
      </div>

    </aside>
  );
}

export default Sidebar;