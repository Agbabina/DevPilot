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
            ? "bg-blue-600 text-white shadow-lg"
            : "text-gray-400 hover:bg-gray-800 hover:text-white"
        }`
      }
    >
      <div className="flex items-center gap-3">
        <Icon size={20} />
        <span className="font-medium">{label}</span>
      </div>

      {badge && (
        <span className="rounded-full bg-blue-500 px-2 py-1 text-xs font-semibold">
          {badge}
        </span>
      )}
    </NavLink>
  );
}