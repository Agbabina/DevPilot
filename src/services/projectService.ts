
import axios from 'axios';

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL ?? 'http://localhost:3000',
  headers: {
    'Content-Type': 'application/json',
  },
});

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
  githubUrl?: string | null;
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
  status: TaskStatus;
  priority: TaskPriority;
  order: number;
  xpReward: number;
  milestoneId: number;
  completedAt?: string | null;
  createdAt: string;
  updatedAt: string;
}

/* =========================
   CREATE TYPES
========================= */

export interface CreateProjectData {
  githubUrl?: string;
  name: string;
  description?: string;
  priority?: ProjectPriority;
  status?: ProjectStatus;
  progress?: number;
  xpReward?: number;
}

export interface CreateMilestoneData {
  title: string;
  description?: string;
  status?: MilestoneStatus;
  order?: number;
  xpReward?: number;
}

export interface CreateTaskData {
  title: string;
  description?: string;
  status?: TaskStatus;
  priority?: TaskPriority;
  order?: number;
  xpReward?: number;
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

/* =========================
   SERVICE
========================= */

export const projectService = {
  async generateProject(data: { name: string; goal: string; priority: string }) {
    const response = await api.post('/ai/projects/generate', data);
    return response.data;
  },
  async generateTasks(data: { milestoneTitle: string; milestoneDescription?: string; projectName?: string; projectDescription?: string }) {
    const response = await api.post('/ai/tasks/generate', data);
    return response.data as { tasks: Array<{ title: string; description: string; priority: TaskPriority; xpReward: number }> };
  },
  /* =====================
     PROJECTS
  ===================== */

  async getAll(): Promise<Project[]> {
    const response = await api.get('/projects');

    return response.data;
  },

  async getOne(
    id: number,
  ): Promise<Project> {
    const response = await api.get(
      `/projects/${id}`,
    );

    return response.data;
  },

  async create(
    data: CreateProjectData,
  ): Promise<Project> {
    const response = await api.post(
      '/projects',
      data,
    );

    return response.data;
  },

  async update(
    id: number,
    data: UpdateProjectData,
  ): Promise<Project> {
    const response = await api.patch(
      `/projects/${id}`,
      data,
    );

    return response.data;
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
  ): Promise<Milestone> {
    const response = await api.get(
      `/milestones/${id}`,
    );

    return response.data;
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










