 function _nullishCoalesce(lhs, rhsFn) { if (lhs != null) { return lhs; } else { return rhsFn(); } }
import axios from 'axios';

const api = axios.create({
  baseURL: _nullishCoalesce(import.meta.env.VITE_API_URL, () => ( 'http://localhost:3000')),
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
} ;
 

export const ProjectStatus = {
NOT_STARTED: 'NOT_STARTED',
IN_PROGRESS: 'IN_PROGRESS',
COMPLETED: 'COMPLETED',
PAUSED: 'PAUSED',
} ;
 














/* =========================
   MILESTONE
========================= */

export const MilestoneStatus = {
TODO: 'TODO',
IN_PROGRESS: 'IN_PROGRESS',
COMPLETED: 'COMPLETED',
} ;
 















/* =========================
   TASK
========================= */

export const TaskStatus = {
TODO: 'TODO',
IN_PROGRESS: 'IN_PROGRESS',
COMPLETED: 'COMPLETED',
} ;
 

export const TaskPriority = {
LOW: 'LOW',
MEDIUM: 'MEDIUM',
HIGH: 'HIGH',
} ;
 



























































/* =========================
   SERVICE
========================= */

export const projectService = {
  async generateProject(data) {
    const response = await api.post('/ai/projects/generate', data);
    return response.data;
  },
  async generateTasks(data) {
    const response = await api.post('/ai/tasks/generate', data);
    return response.data ;
  },
  /* =====================
     PROJECTS
  ===================== */

  async getAll() {
    const response = await api.get('/projects');

    return response.data;
  },

  async getOne(
    id,
  ) {
    const response = await api.get(
      `/projects/${id}`,
    );

    return response.data;
  },

  async create(
    data,
  ) {
    const response = await api.post(
      '/projects',
      data,
    );

    return response.data;
  },

  async update(
    id,
    data,
  ) {
    const response = await api.patch(
      `/projects/${id}`,
      data,
    );

    return response.data;
  },

  async delete(
    id,
  ) {
    await api.delete(
      `/projects/${id}`,
    );
  },

  /* =====================
     MILESTONES
  ===================== */

  async getMilestones(
    projectId,
  ) {
    const response = await api.get(
      `/projects/${projectId}/milestones`,
    );

    return response.data;
  },

  async createMilestone(
    projectId,
    data,
  ) {
    const response = await api.post(
      `/projects/${projectId}/milestones`,
      data,
    );

    return response.data;
  },

  async getMilestone(
    id,
  ) {
    const response = await api.get(
      `/milestones/${id}`,
    );

    return response.data;
  },

  async updateMilestone(
    id,
    data,
  ) {
    const response = await api.patch(
      `/milestones/${id}`,
      data,
    );

    return response.data;
  },

  async deleteMilestone(
    id,
  ) {
    await api.delete(
      `/milestones/${id}`,
    );
  },

  /* =====================
     TASKS
  ===================== */

  async getTasks(
    milestoneId,
  ) {
    const response = await api.get(
      `/milestones/${milestoneId}/tasks`,
    );

    return response.data;
  },

  async createTask(
    milestoneId,
    data,
  ) {
    const response = await api.post(
      `/milestones/${milestoneId}/tasks`,
      data,
    );

    return response.data;
  },

  async getTask(
    id,
  ) {
    const response = await api.get(
      `/tasks/${id}`,
    );

    return response.data;
  },

  async updateTask(
    id,
    data,
  ) {
    const response = await api.patch(
      `/tasks/${id}`,
      data,
    );

    return response.data;
  },

  async deleteTask(
    id,
  ) {
    await api.delete(
      `/tasks/${id}`,
    );
  },
};










