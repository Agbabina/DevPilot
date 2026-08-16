import MilestoneHeader from "./MilestoneHeader";
import MilestoneTasks from "./MilestoneTasks";

import type { Milestone, Task } from "../services/projectService";

interface MilestoneCardProps {
  milestone: Milestone;
  index: number;
  tasks: Task[];
  activeTaskCreator: number | null;
  taskDraft: string;
  creatingTask: number | null;
  justCreatedTask: number | null;
  setActiveTaskCreator: React.Dispatch<
    React.SetStateAction<number | null>
  >;
  setTaskDrafts: React.Dispatch<
    React.SetStateAction<Record<number, string>>
  >;
  toggleMilestone: (id: number) => void;
  updateMilestone: (
    id: number,
    field: "title" | "description",
    value: string,
  ) => void;
  deleteMilestone: (id: number) => void;
  addTask: (milestone: Milestone) => Promise<void>;
  toggleTask: (task: Task) => void;
}
export default function MilestoneCard({
  milestone,
  index,
  tasks,
  activeTaskCreator,
  taskDraft,
  creatingTask,
  justCreatedTask,
  setActiveTaskCreator,
  setTaskDrafts,
  toggleMilestone,
  updateMilestone,
  deleteMilestone,
  addTask,
  toggleTask,
}: MilestoneCardProps) {
  const completed =
    milestone.status === "COMPLETED";

  return (
    <article
      className={`
        group relative overflow-hidden
        rounded-3xl border
        p-5 sm:p-6

        transition-all duration-500
        ease-out

        hover:-translate-y-1
        hover:shadow-xl

        ${
          completed
            ? `
              border-green-200
              bg-linear-to-br
              from-green-50
              via-white
              to-emerald-50/50
            `
            : `
              border-slate-200 dark:border-slate-700
              bg-white dark:bg-slate-900
              hover:border-cyan-200
            `
        }
      `}
    >
      {/* Ambient glow */}
      <div
        className={`
          pointer-events-none
          absolute -right-16 -top-16
          h-40 w-40
          rounded-full
          blur-3xl
          transition-opacity duration-500

          ${
            completed
              ? "bg-green-200/30 opacity-100"
              : "bg-cyan-200/0 opacity-0 group-hover:bg-cyan-200/30 group-hover:opacity-100"
          }
        `}
      />

      {/* Top accent */}
      <div
        className={`
          absolute left-0 top-0
          h-1 w-full
          origin-left
          transition-transform duration-500
          group-hover:scale-x-100

          ${
            completed
              ? "bg-linear-to-r from-green-400 to-emerald-500"
              : "bg-linear-to-r from-cyan-400 to-blue-500 scale-x-0 group-hover:scale-x-100"
          }
        `}
      />

      <div className="relative flex items-start gap-4">
        <MilestoneHeader
          milestone={milestone}
          index={index}
          toggleMilestone={toggleMilestone}
          updateMilestone={updateMilestone}
          deleteMilestone={deleteMilestone}
        />

        <div className="min-w-0 flex-1">
          <MilestoneTasks
            milestone={milestone}
            tasks={tasks}
            activeTaskCreator={activeTaskCreator}
            taskDraft={taskDraft}
            creatingTask={creatingTask}
            justCreatedTask={justCreatedTask}
            setActiveTaskCreator={setActiveTaskCreator}
            setTaskDrafts={setTaskDrafts}
            addTask={addTask}
            toggleTask={toggleTask}
          />
        </div>
      </div>
    </article>
  );
}