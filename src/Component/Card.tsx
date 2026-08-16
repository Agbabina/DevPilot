
import type { ReactNode } from "react";
import type { LucideIcon } from "lucide-react";

interface CardProps {
  header: string;
  description?: string;
  children?: ReactNode;
  icon: LucideIcon;
}

function Card({
  header,
  description,
  children,
  icon: Icon,
}: CardProps) {
  return (
    <div className="rounded-2xl border border-slate-200/80 bg-white/10 p-5 backdrop-blur-md hover:-translate-y-2 shadow-[0_2px_12px_rgba(15,23,42,0.03)] transition hover:-translate-y-0.5 hover:shadow-lg transition hover:-translate-y-0.5 hover:shadow-md">
      
      {/* Top */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="rounded-xl bg-indigo-50 p-2.5">
            <Icon size={20} className="text-indigo-600" />
          </div>

          <h2 className="dev-mono text-[11px] font-medium uppercase tracking-wider text-slate-500">
            {header}
          </h2>
        </div>
      </div>

      {/* Main value */}
      <div className="mt-5">
        <h1 className="text-3xl font-extrabold tracking-tight text-slate-900">
          {description}
        </h1>
      </div>

      {/* Extra content */}
      {children && (
        <div className="mt-4 border-t border-slate-100 pt-3 text-sm text-indigo-600">
          {children}
        </div>
      )}
    </div>
  );
}

export default Card;



