import {
  Check,
  Circle,
  Trash2,
} from "lucide-react";

import { MilestoneStatus } from "../services/projectService";

import type { Milestone } from "../services/projectService";

interface MilestoneHeaderProps {
  milestone: Milestone;
  index: number;

  toggleMilestone: (id: number) => void;

  updateMilestone: (
    id: number,
    field: "title" | "description",
    value: string,
  ) => void;

  deleteMilestone: (id: number) => void;
}

export default function MilestoneHeader({
  milestone,
  index,
  toggleMilestone,
  updateMilestone,
  deleteMilestone,
}: MilestoneHeaderProps) {
  const completed =
    milestone.status === MilestoneStatus.COMPLETED;

  return (
    <>
      {/* Completion button */}
      <button
        type="button"
        onClick={() => toggleMilestone(milestone.id)}
        aria-label={
          completed
            ? "Mark milestone incomplete"
            : "Mark milestone complete"
        }
        className="
          group/check
          relative mt-1 shrink-0
          rounded-full

          transition-all
          duration-300

          hover:scale-110
          active:scale-90
        "
      >
        {/* Pulse ring */}
        <span
          className={`
            absolute inset-0
            rounded-full
            transition-all duration-500

            ${
              completed
                ? "scale-150 bg-green-400/20"
                : "scale-100 bg-transparent group-hover/check:scale-150 group-hover/check:bg-cyan-400/10"
            }
          `}
        />

        <span
          className={`
            relative flex items-center justify-center
            rounded-full
            transition-all duration-300

            ${
              completed
                ? `
                  bg-gradient-to-br
                  from-green-400
                  to-emerald-500
                  p-1.5
                  text-white
                  shadow-lg
                  shadow-green-200
                `
                : `
                  text-slate-300 dark:text-slate-600
                  group-hover/check:text-cyan-400
                `
            }
          `}
        >
          {completed ? (
            <Check
              size={17}
              strokeWidth={3}
              className="animate-[scale-in_200ms_ease-out]"
            />
          ) : (
            <Circle size={26} strokeWidth={1.8} />
          )}
        </span>
      </button>

      <div className="min-w-0 flex-1">
        {/* Label */}
        <div className="mb-1 flex items-center gap-2">
          <span
            className={`
              text-[10px]
              font-black
              tracking-[0.16em]
              transition-colors

              ${
                completed
                  ? "text-green-500"
                  : "text-slate-400 dark:text-slate-500 group-hover:text-cyan-500"
              }
            `}
          >
            MILESTONE {index + 1}
          </span>

          {completed && (
            <span
              className="
                animate-in fade-in zoom-in
                rounded-full
                bg-green-100
                px-2 py-0.5
                text-[9px]
                font-black
                uppercase
                tracking-wider
                text-green-600
              "
            >
              Complete
            </span>
          )}
        </div>

        {/* Title */}
        <input
          type="text"
          value={milestone.title}
          onChange={(e) =>
            updateMilestone(
              milestone.id,
              "title",
              e.target.value,
            )
          }
          placeholder="Milestone title..."
          className={`
            w-full
            bg-transparent
            text-lg
            font-bold
            tracking-tight
            outline-none

            placeholder:text-slate-300 dark:text-slate-600

            transition-all duration-300

            focus:placeholder:text-cyan-200

            ${
              completed
                ? "text-slate-400 dark:text-slate-500 line-through decoration-green-400 decoration-2"
                : "text-slate-900 dark:text-white group-hover:text-slate-900 dark:text-white"
            }
          `}
        />

        {/* Description */}
        <textarea
          value={milestone.description ?? ""}
          onChange={(e) =>
            updateMilestone(
              milestone.id,
              "description",
              e.target.value,
            )
          }
          placeholder="Describe what needs to be done..."
          className="
            mt-2
            min-h-20
            w-full
            resize-none
            bg-transparent
            text-sm
            leading-6
            text-slate-500 dark:text-slate-400
            outline-none

            placeholder:text-slate-300 dark:text-slate-600

            focus:text-slate-700 dark:text-slate-200
          "
        />

        {/* Delete */}
        <button
          type="button"
          onClick={() => deleteMilestone(milestone.id)}
          aria-label="Delete milestone"
          className="
            absolute right-0 top-0
            rounded-xl
            p-2

            text-slate-300 dark:text-slate-600

            transition-all duration-200

            hover:scale-110
            hover:bg-red-50
            hover:text-red-500

            active:scale-90
          "
        >
          <Trash2 size={18} />
        </button>
      </div>
    </>
  );
}