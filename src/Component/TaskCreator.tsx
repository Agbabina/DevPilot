import {
  Plus,
  X,
} from "lucide-react";

import type { Milestone } from "../services/projectService";

interface TaskCreatorProps {
  milestone: Milestone;
  open: boolean;
  draft: string;
  creating: boolean;

  setActiveTaskCreator: React.Dispatch<
    React.SetStateAction<number | null>
  >;

  setTaskDrafts: React.Dispatch<
    React.SetStateAction<Record<number, string>>
  >;

  addTask: (milestone: Milestone) => Promise<void>;
}

export default function TaskCreator({
  milestone,
  open,
  draft,
  creating,
  setActiveTaskCreator,
  setTaskDrafts,
  addTask,
}: TaskCreatorProps) {
  const disabled =
    creating || !draft.trim();

  return (
    <div
      className={`
        grid
        transition-all duration-300
        ease-out

        ${
          open
            ? "mt-3 grid-rows-[1fr] opacity-100"
            : "grid-rows-[0fr] opacity-0"
        }
      `}
    >
      <div className="overflow-hidden">
        <div
          className="
            rounded-2xl
            border
            border-cyan-200

            bg-gradient-to-br
            from-cyan-50
            via-white
            to-blue-50/50

            p-3

            shadow-lg
            shadow-cyan-100/50
          "
        >
          <div className="flex gap-2">
            <input
              autoFocus={open}
              value={draft}
              onChange={(e) =>
                setTaskDrafts((current) => ({
                  ...current,
                  [milestone.id]:
                    e.target.value,
                }))
              }
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();

                  if (!disabled) {
                    void addTask(milestone);
                  }
                }

                if (e.key === "Escape") {
                  setActiveTaskCreator(null);
                }
              }}
              placeholder="What needs to be done?"
              className="
                min-w-0
                flex-1
                rounded-xl

                border
                border-slate-200 dark:border-slate-700

                bg-white dark:bg-slate-900

                px-3
                py-2.5

                text-sm
                font-medium
                text-slate-700 dark:text-slate-200

                outline-none

                transition-all duration-200

                placeholder:text-slate-300 dark:text-slate-600

                focus:border-cyan-400
                focus:ring-4
                focus:ring-cyan-100

                focus:shadow-sm
              "
            />

            <button
              type="button"
              onClick={() =>
                void addTask(milestone)
              }
              disabled={disabled}
              className="
                group
                flex items-center gap-2
                rounded-xl

                bg-gradient-to-r
                from-cyan-500
                to-cyan-600

                px-4 py-2

                text-sm
                font-black
                text-white

                shadow-md
                shadow-cyan-200

                transition-all duration-300

                hover:-translate-y-0.5
                hover:from-cyan-600
                hover:to-blue-600
                hover:shadow-lg
                hover:shadow-cyan-200

                active:scale-95

                disabled:cursor-not-allowed
                disabled:translate-y-0
                disabled:opacity-40
                disabled:shadow-none
              "
            >
              {creating ? (
                <>
                  <span
                    className="
                      h-4 w-4
                      animate-spin
                      rounded-full
                      border-2
                      border-white/30
                      border-t-white
                    "
                  />

                  Adding
                </>
              ) : (
                <>
                  <Plus
                    size={16}
                    className="
                      transition-transform duration-300
                      group-hover:rotate-90
                    "
                  />

                  Add
                </>
              )}
            </button>
          </div>

          <div className="mt-2 flex items-center justify-between">
            <span
              className="
                text-[11px]
                font-medium
                text-slate-400 dark:text-slate-500
              "
            >
              Press{" "}
              <kbd
                className="
                  rounded
                  border
                  border-slate-200 dark:border-slate-700
                  bg-white dark:bg-slate-900
                  px-1.5
                  py-0.5
                  font-mono
                  text-[10px]
                "
              >
                Enter
              </kbd>{" "}
              to create
            </span>

            <button
              type="button"
              onClick={() =>
                setActiveTaskCreator(null)
              }
              className="
                flex items-center gap-1
                rounded-lg
                px-2 py-1

                text-[11px]
                font-bold
                text-slate-400 dark:text-slate-500

                transition-colors

                hover:bg-slate-100 dark:bg-slate-800
                hover:text-gray-600
              "
            >
              <X size={12} />

              Cancel
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}