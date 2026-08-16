
import { Box, ArrowUpRight } from "lucide-react";
import { useNavigate } from "react-router-dom";
import PriotiyTag from "./PriorityTag";

interface ProjectCardProps {
  projectId: number;
  projectName: string;
  projectPriority: string;
  projectProgress: number;
  xpReward: number;
  deadline?: string | null;
  technologies?: string[] | null;
  latestMiletone?: string;
}

function ProjectCard({
  projectId,
  projectName,
  projectPriority,
  projectProgress,
  xpReward,
  deadline,
  technologies,
  latestMiletone,
}: ProjectCardProps) {
  const navigate = useNavigate();

  return (
    <div
      onClick={() => navigate(`/projects/${projectId}`)}
      className="group cursor-pointer rounded-2xl border border-slate-200/80 bg-white p-6 transform-gpu transition-transform duration-300 ease-out hover:transform:perspective(1000px)_rotateX(5deg)_rotateY(-5deg)_scale(1.02)">
      {/* Top */}
      <div className="flex items-start justify-between transition-all group-hover:scale-[1.01]">
        <div className="flex items-center gap-3">
          <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-indigo-50 text-indigo-600">
            <Box size={22} />
          </div>

          <div>
            <h2 className="font-semibold text-gray-900">
              {projectName}
            </h2>

            <p className="text-xs text-gray-400">
              Development project
            </p>
          </div>
        </div>

        <ArrowUpRight
          size={18}
          className="text-gray-300 transition group-hover:text-indigo-500"
        />
      </div>

      {technologies && technologies.length > 0 && <div className="mt-4 flex flex-wrap gap-1.5">{technologies.slice(0, 3).map((technology) => <span key={technology} className="rounded-md bg-slate-100 px-2 py-1 text-[10px] font-semibold text-slate-500">{technology}</span>)}</div>}

      {deadline && <p className="dev-mono mt-3 text-[10px] text-slate-400">due {new Date(deadline).toLocaleDateString()}</p>}

      {/* Milestone */}
      <div className="mt-6">
        <p className="text-xs font-medium uppercase tracking-wide text-gray-400">
          Latest milestone
        </p>

        <p className="mt-1 truncate text-sm font-medium text-gray-700">
          {latestMiletone || "No milestone yet"}
        </p>
      </div>

      {/* Progress */}
      <div className="mt-5">
        <div className="mb-2 flex items-center justify-between">
          <span className="text-xs font-medium text-gray-400">
            Progress
          </span>

          <span className="text-sm font-semibold text-gray-700">
            {projectProgress}%
          </span>
        </div>

        <div className="h-2 overflow-hidden rounded-full bg-gray-100">
          <div
            className="h-full rounded-full bg-gradient-to-r from-indigo-600 to-blue-500 transition-all duration-500"
            style={{
              width: `${projectProgress}%`,
            }}
          />
        </div>
      </div>

      {/* Bottom */}
      <div className="mt-6 flex items-center justify-between border-t border-gray-100 pt-4">
        <PriotiyTag priority={projectPriority} />

        <span className="text-sm font-semibold text-indigo-600">
          +{xpReward} XP
        </span>
      </div>
    </div>
  );
}

export default ProjectCard;







