import {
  Check,
  Plus,
} from "lucide-react";

import TaskCreator from "./TaskCreator";
import TaskItem from "./TaskItem";

import type { Milestone, Task } from "../services/projectService";

interface MilestoneTasksProps {
  milestone: Milestone;
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

  addTask: (milestone: Milestone) => Promise<void>;
  toggleTask: (task: Task) => void;
}

export default function MilestoneTasks({
  milestone,
  tasks,
  activeTaskCreator,
  taskDraft,
  creatingTask,
  justCreatedTask,
  setActiveTaskCreator,
  setTaskDrafts,
  addTask,
  toggleTask,
}: MilestoneTasksProps) {
  const creatorOpen =
    activeTaskCreator === milestone.id;

  return (
    <section className="mt-6 border-t border-slate-200 dark:border-slate-700 pt-5">
      {/* Header */}
      <div className="mb-3 flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <div
            className="
              flex h-8 w-8
              items-center justify-center
              rounded-xl

              bg-gradient-to-br
              from-cyan-100
              to-blue-100

              text-cyan-600

              shadow-sm

              transition-all duration-300
              group-hover:scale-105
              group-hover:rotate-3
            "
          >
            <Check size={15} strokeWidth={3} />
          </div>

          <div>
            <p className="text-sm font-black text-slate-700 dark:text-slate-200">
              Tasks
            </p>

            <p
              className="
                text-[11px]
                font-medium
                text-slate-400 dark:text-slate-500
              "
            >
              {tasks.length === 0
                ? "Nothing here yet"
                : `${tasks.length} ${
                    tasks.length === 1
                      ? "task"
                      : "tasks"
                  }`}
            </p>
          </div>
        </div>

        {/* Add task */}
        <button
          type="button"
          onClick={() =>
            setActiveTaskCreator(
              creatorOpen ? null : milestone.id,
            )
          }
          className="
            group/add
            flex items-center gap-2
            rounded-xl
            bg-cyan-50
            px-3 py-2

            text-xs
            font-black
            text-cyan-700

            transition-all duration-300

            hover:-translate-y-0.5
            hover:bg-cyan-100
            hover:shadow-md
            hover:shadow-cyan-100

            active:scale-95
          "
        >
          <Plus
            size={15}
            className="
              transition-transform duration-300
              group-hover/add:rotate-90
            "
          />

          {creatorOpen
            ? "Close"
            : "Add Task"}
        </button>
      </div>

      {/* Empty state */}
      {tasks.length === 0 && !creatorOpen && (
        <button
          type="button"
          onClick={() =>
            setActiveTaskCreator(milestone.id)
          }
          className="
            group/empty
            flex w-full
            items-center justify-center

            rounded-2xl
            border-2
            border-dashed
            border-slate-200 dark:border-slate-700

            px-4 py-6

            text-sm
            font-medium
            text-slate-400 dark:text-slate-500

            transition-all duration-300

            hover:border-cyan-300
            hover:bg-cyan-50/50
            hover:text-cyan-600
            hover:shadow-inner

            active:scale-[0.99]
          "
        >
          <span
            className="
              mr-2
              flex h-7 w-7
              items-center justify-center
              rounded-full
              bg-slate-100 dark:bg-slate-800

              transition-all duration-300

              group-hover/empty:rotate-90
              group-hover/empty:bg-cyan-100
            "
          >
            <Plus size={16} />
          </span>

          Break this milestone into tasks
        </button>
      )}

      {/* Creator */}
      <TaskCreator
        milestone={milestone}
        open={creatorOpen}
        draft={taskDraft}
        creating={creatingTask === milestone.id}
        setActiveTaskCreator={setActiveTaskCreator}
        setTaskDrafts={setTaskDrafts}
        addTask={addTask}
      />

      {/* Tasks */}
      {tasks.length > 0 && (
        <div className="mt-3 space-y-2">
          {tasks.map((task, index) => (
            <TaskItem
              key={task.id}
              task={task}
              index={index}
              highlighted={justCreatedTask === task.id}
              onToggle={toggleTask}
            />
          ))}
        </div>
      )}
    </section>
  );
}