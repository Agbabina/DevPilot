import { getTechIcon } from "../Component/TechIcons.ts";

interface TechTagProps {
    technology: string;
}

function TechTag({ technology }: TechTagProps) {
    const info = getTechIcon(technology);
    const Icon = info?.icon;

    return (
        <span className="inline-flex items-center gap-1 rounded-md bg-slate-100 px-2 py-1 text-[10px] font-semibold text-slate-600">
      {Icon ? (
          <Icon size={11} color={info!.color} />
      ) : (
          <span className="h-1.5 w-1.5 rounded-full bg-slate-400" />
      )}
            {info?.label ?? technology}
    </span>
    );
}

export default TechTag;