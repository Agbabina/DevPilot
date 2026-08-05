
import { Box, ArrowUpRight } from "lucide-react";
import { useNavigate } from "react-router-dom";
import PriotiyTag from "./PriorityTag";

interface ProjectCardProps {
  projectId: number;
  projectName: string;
  projectPriority: string;
  projectProgress: number;
  xpReward: number;
  latestMiletone?: string;
}

function ProjectCard({
  projectId,
  projectName,
  projectPriority,
  projectProgress,
  xpReward,
  latestMiletone,
}: ProjectCardProps) {
  const navigate = useNavigate();

  return (
    <div
      onClick={() => navigate(`/projects/${projectId}`)}
      className="group cursor-pointer rounded-2xl border border-gray-200 bg-white p-5 shadow-sm transition-all duration-200 hover:-translate-y-1 hover:border-blue-200 hover:shadow-lg"
    >
      {/* Top */}
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-3">
          <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-blue-50 text-blue-600">
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
          className="text-gray-300 transition group-hover:text-blue-500"
        />
      </div>

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
            className="h-full rounded-full bg-blue-600 transition-all duration-500"
            style={{
              width: `${projectProgress}%`,
            }}
          />
        </div>
      </div>

      {/* Bottom */}
      <div className="mt-6 flex items-center justify-between border-t border-gray-100 pt-4">
        <PriotiyTag priority={projectPriority} />

        <span className="text-sm font-semibold text-blue-500">
          +{xpReward} XP
        </span>
      </div>
    </div>
  );
}

export default ProjectCard;

