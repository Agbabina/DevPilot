 function _optionalChain(ops) { let lastAccessLHS = undefined; let value = ops[0]; let i = 1; while (i < ops.length) { const op = ops[i]; const fn = ops[i + 1]; i += 2; if ((op === 'optionalAccess' || op === 'optionalCall') && value == null) { return undefined; } if (op === 'access' || op === 'optionalAccess') { lastAccessLHS = value; value = fn(value); } else if (op === 'call' || op === 'optionalCall') { value = fn((...args) => value.call(lastAccessLHS, ...args)); lastAccessLHS = undefined; } } return value; }
import api from './api';

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
    try {
      const response = await api.post('/ai/projects/generate', data);
      return response.data;
    } catch (e) {
      return {
        description: `A practical starter plan for ${data.name}.`,
        xpReward: 500,
        milestones: [
          { title: "Foundation", description: "Set up the project foundation.", xpReward: 150, tasks: [{ title: "Define the scope", description: "Document the requirements and success criteria.", priority: "HIGH", xpReward: 50 }, { title: "Create the project structure", description: "Set up the initial folders and configuration.", priority: "MEDIUM", xpReward: 40 }] },
          { title: "Core implementation", description: "Build the main experience.", xpReward: 200, tasks: [{ title: "Implement the main workflow", description: "Build the primary user flow.", priority: "HIGH", xpReward: 75 }, { title: "Add validation", description: "Handle invalid input and common errors.", priority: "MEDIUM", xpReward: 40 }] },
          { title: "Testing and launch", description: "Prepare the project for delivery.", xpReward: 150, tasks: [{ title: "Test the main flows", description: "Verify the important user journeys.", priority: "HIGH", xpReward: 50 }, { title: "Prepare release notes", description: "Document the completed work and launch steps.", priority: "LOW", xpReward: 25 }] },
        ],
      };
    }
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
    try {
      const response = await api.get(
        `/milestones/${id}`,
      );

      return response.data;
    } catch (err) {
      // If the milestone is not found, return null instead of throwing so callers can handle it gracefully.
      if (_optionalChain([err, 'optionalAccess', _ => _.response, 'optionalAccess', _2 => _2.status]) === 404) {
        return null;
      }

      throw err;
    }
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













