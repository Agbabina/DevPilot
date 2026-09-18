import api from './api';

/* =========================
   PROJECT
========================= */

export const ProjectPriority = {
  LOW: 'LOW',
  MEDIUM: 'MEDIUM',
  HIGH: 'HIGH',

} as const;
export type ProjectPriority = (typeof ProjectPriority)[keyof typeof ProjectPriority];

export const ProjectStatus = {
  NOT_STARTED: 'NOT_STARTED',
  IN_PROGRESS: 'IN_PROGRESS',
  COMPLETED: 'COMPLETED',
  PAUSED: 'PAUSED',

} as const;
export type ProjectStatus = (typeof ProjectStatus)[keyof typeof ProjectStatus];

export interface Project {
  id: number;
  name: string;
  description?: string;
  goals?: string;
  requirements?: string;
  githubUrl?: string | null;
  deadline?: string | null;
  technologies: string[]
  priority: ProjectPriority;
  status: ProjectStatus;
  progress: number;
  xpReward: number;
  createdAt: string;
  updatedAt: string;
}

/* =========================
   MILESTONE
========================= */

export const MilestoneStatus = {
  TODO: 'TODO',
  IN_PROGRESS: 'IN_PROGRESS',
  COMPLETED: 'COMPLETED',

} as const;
export type MilestoneStatus = (typeof MilestoneStatus)[keyof typeof MilestoneStatus];

export interface Milestone {
  id: number;
  title: string;
  description?: string;
  goals?: string;
  requirements?: string;
  integrations?: string[];
  status: MilestoneStatus;
  progress: number;
  order: number;
  xpReward: number;
  projectId: number;
  completedAt?: string | null;
  createdAt: string;
  updatedAt: string;
}

/* =========================
   TASK
========================= */

export const TaskStatus = {
  TODO: 'TODO',
  IN_PROGRESS: 'IN_PROGRESS',
  COMPLETED: 'COMPLETED',

} as const;
export type TaskStatus = (typeof TaskStatus)[keyof typeof TaskStatus];

export const TaskPriority = {
  LOW: 'LOW',
  MEDIUM: 'MEDIUM',
  HIGH: 'HIGH',

} as const;
export type TaskPriority = (typeof TaskPriority)[keyof typeof TaskPriority];

export interface Task {
  id: number;
  title: string;
  description?: string;
  goals?: string;
  requirements?: string;
  integrations?: string[];
  status: TaskStatus;
  priority: TaskPriority;
  order: number;
  xpReward: number;
  milestoneId: number;
  category?: string | null;
  dueDate?: string | null;
  completedAt?: string | null;
  createdAt: string;
  updatedAt: string;
}

/* =========================
   CREATE TYPES
========================= */

export interface CreateProjectData {
  githubUrl?: string;
  deadline?: string;
  technologies?: string[];
  name: string;
  description?: string;
  goals?: string;
  requirements?: string;
  integrations?: string[];
  priority?: ProjectPriority;
  status?: ProjectStatus;
  progress?: number;
  xpReward?: number;
}

export interface CreateMilestoneData {
  title: string;
  description?: string;
  goals?: string;
  requirements?: string;
  integrations?: string[];
  status?: MilestoneStatus;
  order?: number;
  xpReward?: number;
  completedAt?: string | null;
}

export interface CreateTaskData {
  title: string;
  description?: string;
  goals?: string;
  requirements?: string;
  integrations?: string[];
  status?: TaskStatus;
  priority?: TaskPriority;
  order?: number;
  xpReward?: number;
  dueDate?: string | null;
  completedAt?: string | null;
}

/* =========================
   UPDATE TYPES
========================= */

export type UpdateProjectData =
    Partial<CreateProjectData>;

export type UpdateMilestoneData =
    Partial<CreateMilestoneData>;

export type UpdateTaskData =
    Partial<CreateTaskData>;

function normalizeTechnologies(value: unknown): string[] {
  if (Array.isArray(value)) {
    return value
      .filter((technology): technology is string => typeof technology === "string")
      .map((technology) => technology.trim())
      .filter(Boolean);
  }

  if (typeof value !== "string") return [];

  try {
    const parsed = JSON.parse(value);
    if (Array.isArray(parsed)) return normalizeTechnologies(parsed);
  } catch {
    // Some older records store technologies as a comma-separated string.
  }

  return value.split(",").map((technology) => technology.trim()).filter(Boolean);
}

function normalizeProject(value: unknown): Project {
  const project = value as Omit<Project, "technologies"> & { technologies?: unknown };
  return {
    ...project,
    technologies: normalizeTechnologies(project.technologies),
  };
}

/* =========================
   SERVICE
========================= */

export const projectService = {
  async generateProject(data: { name: string; goal: string; priority: string }) {
    try {
      const response = await api.post('/ai/projects/generate', data);
      return response.data;
    } catch {
      return {
        description: `A practical starter plan for ${data.name}.`,
        xpReward: 500,
        technologies: [],
        milestones: [
          { title: "Foundation", description: "Set up the project foundation.", xpReward: 150, tasks: [{ title: "Define the scope", description: "Document the requirements and success criteria.", priority: "HIGH", xpReward: 50 }, { title: "Create the project structure", description: "Set up the initial folders and configuration.", priority: "MEDIUM", xpReward: 40 }] },
          { title: "Core implementation", description: "Build the main experience.", xpReward: 200, tasks: [{ title: "Implement the main workflow", description: "Build the primary user flow.", priority: "HIGH", xpReward: 75 }, { title: "Add validation", description: "Handle invalid input and common errors.", priority: "MEDIUM", xpReward: 40 }] },
          { title: "Testing and launch", description: "Prepare the project for delivery.", xpReward: 150, tasks: [{ title: "Test the main flows", description: "Verify the important user journeys.", priority: "HIGH", xpReward: 50 }, { title: "Prepare release notes", description: "Document the completed work and launch steps.", priority: "LOW", xpReward: 25 }] },
        ],
      };
    }
  },
  async generateTasks(data: { milestoneTitle: string; milestoneDescription?: string; projectName?: string; projectDescription?: string; previousTasks?: string[]; followUpPrompt?: string }) {
    const response = await api.post('/ai/tasks/generate', data);
    return response.data as { tasks: Array<{ title: string; description: string; priority: TaskPriority }> };
  },
  /* =====================
     PROJECTS
  ===================== */

  async getAll(): Promise<Project[]> {
    const response = await api.get('/projects');

    return Array.isArray(response.data) ? response.data.map(normalizeProject) : [];
  },

  async getOne(
      id: number,
  ): Promise<Project> {
    const response = await api.get(
        `/projects/${id}`,
    );

    return normalizeProject(response.data);
  },

  async create(
      data: CreateProjectData,
  ): Promise<Project> {
    const response = await api.post(
        '/projects',
        data,
    );

    return normalizeProject(response.data);
  },

  async update(
      id: number,
      data: UpdateProjectData,
  ): Promise<Project> {
    const response = await api.patch(
        `/projects/${id}`,
        data,
    );

    return normalizeProject(response.data);
  },

  async delete(
      id: number,
  ): Promise<void> {
    await api.delete(
        `/projects/${id}`,
    );
  },

  /* =====================
     MILESTONES
  ===================== */

  async getMilestones(
      projectId: number,
  ): Promise<Milestone[]> {
    const response = await api.get(
        `/projects/${projectId}/milestones`,
    );

    return response.data;
  },

  async createMilestone(
      projectId: number,
      data: CreateMilestoneData,
  ): Promise<Milestone> {
    const response = await api.post(
        `/projects/${projectId}/milestones`,
        data,
    );

    return response.data;
  },

  async getMilestone(
      id: number,
  ): Promise<Milestone | null> {
    try {
      const response = await api.get(
          `/milestones/${id}`,
      );

      return response.data;
    } catch (err: any) {
      // If the milestone is not found, return null instead of throwing so callers can handle it gracefully.
      if (err?.response?.status === 404) {
        return null;
      }

      throw err;
    }
  },

  async updateMilestone(
      id: number,
      data: UpdateMilestoneData,
  ): Promise<Milestone> {
    const response = await api.patch(
        `/milestones/${id}`,
        data,
    );

    return response.data;
  },

  async deleteMilestone(
      id: number,
  ): Promise<void> {
    await api.delete(
        `/milestones/${id}`,
    );
  },

  /* =====================
     TASKS
  ===================== */

  async getTasks(
      milestoneId: number,
  ): Promise<Task[]> {
    const response = await api.get(
        `/milestones/${milestoneId}/tasks`,
    );

    return response.data;
  },

  async createTask(
      milestoneId: number,
      data: CreateTaskData,
  ): Promise<Task> {
    const response = await api.post(
        `/milestones/${milestoneId}/tasks`,
        data,
    );

    return response.data;
  },

  async getTask(
      id: number,
  ): Promise<Task> {
    const response = await api.get(
        `/tasks/${id}`,
    );

    return response.data;
  },

  async updateTask(
      id: number,
      data: UpdateTaskData,
  ): Promise<Task> {
    const response = await api.patch(
        `/tasks/${id}`,
        data,
    );

    return response.data;
  },

  async deleteTask(
      id: number,
  ): Promise<void> {
    await api.delete(
        `/tasks/${id}`,
    );
  },
};
