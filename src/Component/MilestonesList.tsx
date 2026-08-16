import MilestoneCard from "./MilestoneCard";
import type { Milestone, Task } from "../services/projectService";

interface MilestoneListProps {
  milestones: Milestone[];
  milestoneTasks: Record<number, Task[]>;

  activeTaskCreator: number | null;
  taskDrafts: Record<number, string>;
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

export default function MilestoneList({
  milestones,
  milestoneTasks,
  activeTaskCreator,
  taskDrafts,
  creatingTask,
  justCreatedTask,
  setActiveTaskCreator,
  setTaskDrafts,
  toggleMilestone,
  updateMilestone,
  deleteMilestone,
  addTask,
  toggleTask,
}: MilestoneListProps) {
  return (
    <div className="space-y-5">
      {milestones.map((milestone, index) => {
        const tasks = milestoneTasks[milestone.id] ?? milestoneTasks[milestone.order - 1] ?? [];

        return (
          <MilestoneCard
            key={milestone.id}
            milestone={milestone}
            index={index}
            tasks={tasks}
            activeTaskCreator={activeTaskCreator}
            taskDraft={taskDrafts[milestone.id] ?? ""}
            creatingTask={creatingTask}
            justCreatedTask={justCreatedTask}
            setActiveTaskCreator={setActiveTaskCreator}
            setTaskDrafts={setTaskDrafts}
            toggleMilestone={toggleMilestone}
            updateMilestone={updateMilestone}
            deleteMilestone={deleteMilestone}
            addTask={addTask}
            toggleTask={toggleTask}
          />
        );
      })}
    </div>
  );
}