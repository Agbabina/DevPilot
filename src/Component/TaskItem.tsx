import type { Task } from "../services/projectService";

interface TaskItemProps {
  task: Task;
  index: number;
  highlighted: boolean;
  onToggle: (task: Task) => void;
}

export default function TaskItem({
  task,
  index,
  highlighted,
  onToggle,
}: TaskItemProps) {
  return (
    <div
      style={{
        animationDelay: `${index * 45}ms`,
      }}
      className={`
        group/task
        flex items-center gap-3

        rounded-2xl
        border

        px-3 py-3

        transition-all duration-300

        animate-in
        fade-in
        slide-in-from-bottom-2

        ${
          highlighted
            ? `
              border-cyan-300
              bg-gradient-to-r
              from-cyan-50
              to-blue-50
              shadow-lg
              shadow-cyan-100

              scale-[1.01]
            `
            : `
              border-slate-200 dark:border-slate-700
              bg-slate-50/70 dark:bg-slate-800/70

              hover:-translate-y-0.5
              hover:border-cyan-200
              hover:bg-white dark:hover:bg-slate-700 dark:bg-slate-900
              hover:shadow-md
            `
        }
      `}
    >
      {/* Number */}
      <div
        className="
          flex h-7 w-7
          shrink-0
          items-center justify-center

          rounded-lg

          bg-white dark:bg-slate-900

          text-xs
          font-black
          text-slate-400 dark:text-slate-500

          shadow-sm

          transition-all duration-300

          group-hover/task:bg-cyan-100
          group-hover/task:text-cyan-600
          group-hover/task:scale-105
          group-hover/task:rotate-3
        "
      >
        {index + 1}
      </div>

      {/* Status */}
      <button
        type="button"
        onClick={() => onToggle(task)}
        aria-label={`Complete task: ${task.title}`}
        className="
          group/status
          flex h-6 w-6
          shrink-0
          items-center justify-center

          rounded-full
          border-2
          border-slate-200 dark:border-slate-700

          transition-all duration-300

          hover:border-cyan-400
          hover:bg-cyan-50
          hover:scale-110

          active:scale-90
        "
      >
        <span
          className="
            h-2 w-2
            rounded-full
            bg-gray-300

            transition-all duration-300

            group-hover/status:bg-cyan-500
            group-hover/status:scale-125
          "
        />
      </button>

      {/* Content */}
      <div className="min-w-0 flex-1">
        <p
          className="
            truncate
            text-sm
            font-bold
            text-slate-700 dark:text-slate-200

            transition-colors

            group-hover/task:text-slate-900 dark:text-white
          "
        >
          {task.title}
        </p>

        {task.description && (
          <p
            className="
              mt-0.5
              truncate

              text-xs
              font-medium
              text-slate-400 dark:text-slate-500

              transition-colors

              group-hover/task:text-slate-500 dark:text-slate-400
            "
          >
            {task.description}
          </p>
        )}
      </div>

      {/* XP */}
      {task.xpReward !== undefined && (
        <div
          className="
            shrink-0
            rounded-full

            bg-gradient-to-r
            from-amber-50
            to-yellow-50

            px-2.5
            py-1

            text-[10px]
            font-black
            text-amber-600

            shadow-sm

            transition-all duration-300

            group-hover/task:scale-105
            group-hover/task:shadow-md
          "
        >
          +{task.xpReward} XP
        </div>
      )}
    </div>
  );
}