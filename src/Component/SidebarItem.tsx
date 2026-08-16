import { NavLink } from "react-router-dom";
import type { LucideIcon } from "lucide-react";

interface SidebarItemProps {
  icon: LucideIcon;
  label: string;
  to: string;
  badge?: string | number;
}

export default function SidebarItem({
  icon: Icon,
  label,
  to,
  badge,
}: SidebarItemProps) {
  return (
    <NavLink
      to={to}
      className={({ isActive }) =>
        `flex items-center justify-between rounded-xl px-4 py-3 transition-all duration-200
        ${
          isActive
            ? "bg-indigo-50 text-indigo-700 shadow-none"
            : "text-slate-500 hover:bg-slate-50 hover:text-slate-900"
        }`
      }
    >
      <div className="flex items-center gap-3">
        <Icon size={20} />
        <span className="font-medium tracking-tight">{label}</span>
      </div>

      {badge && (
        <span className="rounded-full bg-indigo-100 text-indigo-700 px-2 py-1 text-xs font-semibold">
          {badge}
        </span>
      )}
    </NavLink>
  );
}

