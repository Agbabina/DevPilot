
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
    <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md">
      
      {/* Top */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="rounded-lg bg-blue-100 p-2">
            <Icon size={20} className="text-blue-600" />
          </div>

          <h2 className="text-sm font-medium text-slate-500">
            {header}
          </h2>
        </div>
      </div>

      {/* Main value */}
      <div className="mt-5">
        <h1 className="text-3xl font-bold tracking-tight text-slate-900">
          {description}
        </h1>
      </div>

      {/* Extra content */}
      {children && (
        <div className="mt-4 border-t border-slate-100 pt-3 text-sm text-emerald-600">
          {children}
        </div>
      )}
    </div>
  );
}

export default Card;

