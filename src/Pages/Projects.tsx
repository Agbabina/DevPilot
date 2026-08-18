
import { Search, Plus, SlidersHorizontal, X } from "lucide-react";
import { useEffect, useState } from "react";
import ProjectCard from "../Component/ProjectCard";
import {
  projectService,
  ProjectPriority,
  ProjectStatus,
  type Project,
} from "../services/projectService";

function Projects() {
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState("All");

  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [showModal, setShowModal] = useState(false);
  const [creating, setCreating] = useState(false);

  const [form, setForm] = useState({
    name: "",
    description: "",
    goals: "",
    requirements: "",
    integrations: "",
    githubUrl: "",
    deadline: "",
    technologies: "",
    priority: ProjectPriority.MEDIUM,
    status: ProjectStatus.NOT_STARTED,
    progress: 0,
  });

  // Fetch projects
  useEffect(() => {
    async function fetchProjects() {
      try {
        const data = await projectService.getAll();
        setProjects(data);
      } catch (error) {
        console.error(error);
        setError("Unable to reach the projects service. Please try again.");
      } finally {
        setLoading(false);
      }
    }

    fetchProjects();
  }, []);

  // Form input handler
  function handleChange(
    e: React.ChangeEvent<
      HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement
    >,
  ) {
    const { name, value } = e.target;

    setForm((previous) => ({
      ...previous,
      [name]:
        name === "progress" || name === "xpReward"
          ? Number(value)
          : value,
    }));
  }

  // Create project
  async function handleCreateProject(
    e: React.FormEvent,
  ) {
    e.preventDefault();

    if (!form.name.trim()) {
      return;
    }

    try {
      setCreating(true);

      const newProject = await projectService.create({
        name: form.name.trim(),
        description: form.description.trim() || undefined,
        goals: form.goals.trim() || undefined,
        requirements: form.requirements.trim() || undefined,
        integrations: form.integrations.split(",").map((item) => item.trim()).filter(Boolean),
        githubUrl: form.githubUrl.trim() || undefined,
        deadline: form.deadline || undefined,
        technologies: form.technologies.split(",").map((item) => item.trim()).filter(Boolean),
        priority: form.priority,
        status: form.status,
        progress: form.progress,
      });

      setProjects((previous) => [
        newProject,
        ...previous,
      ]);

      // Reset form
      setForm({
        name: "",
        description: "",
    goals: "",
    requirements: "",
    integrations: "",
    githubUrl: "",
    deadline: "",
    technologies: "",
    priority: ProjectPriority.MEDIUM,
        status: ProjectStatus.NOT_STARTED,
        progress: 0,
      });

      setShowModal(false);
    } catch (error) {
      console.error(error);
      alert("Failed to create project.");
    } finally {
      setCreating(false);
    }
  }

  // Search + priority filter
  const filteredProjects = projects.filter((project) => {
    const matchesSearch = project.name
      .toLowerCase()
      .includes(search.toLowerCase());

    const matchesFilter =
      filter === "All" ||
      project.priority.toLowerCase() === filter.toLowerCase();

    return matchesSearch && matchesFilter;
  });

  // Loading
  if (loading) {
    return (
      <main className="min-h-screen bg-gray-50 px-6 py-8 md:px-10">
        <h1 className="text-3xl font-bold tracking-tight text-gray-900">
          Projects
        </h1>

        <p className="mt-4 text-sm text-gray-500">
          Loading projects...
        </p>
      </main>
    );
  }

  // Error
  if (error) {
    return (
      <main className="min-h-screen bg-gray-50 px-6 py-8 md:px-10">
        <h1 className="text-3xl font-bold tracking-tight text-gray-900">
          Projects
        </h1>

        <p className="mt-4 text-sm text-red-500">
          {error}
        </p>
      </main>
    );
  }

  return (
    <main className="relative min-h-screen bg-gray-50 px-6 py-8 md:px-10">

      {/* Header */}
      <div className="flex flex-col gap-5 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-gray-900">
            Projects
          </h1>

          <p className="mt-1 text-sm text-gray-500">
            Build, track, and level up your development projects.
          </p>
        </div>

        <button
          onClick={() => setShowModal(true)}
          className="flex items-center justify-center gap-2 rounded-xl bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-blue-700 hover:scale-110 active:scale-90 active: border-e-blue-700"
        >
          <Plus size={18} />
          New Project
        </button>
      </div>

      {/* Toolbar */}
      <div className="mt-8 flex flex-col gap-3 md:flex-row">

        {/* Search */}
        <div className="relative flex-1">
          <Search
            size={18}
            className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
          />

          <input
            type="text"
            placeholder="Search projects..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full rounded-xl border border-gray-200 bg-white py-3 pl-10 pr-4 text-sm outline-none transition placeholder:text-gray-400 focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
          />
        </div>

        {/* Priority filter */}
        <div className="flex items-center gap-2 rounded-xl border border-gray-200 bg-white p-1">
          {["All", "High", "Medium", "Low"].map((item) => (
            <button
              key={item}
              onClick={() => setFilter(item)}
              className={`rounded-lg px-4 py-2 text-sm font-medium transition ${
                filter === item
                  ? "bg-gray-900 text-white"
                  : "text-gray-500 hover:bg-gray-100"
              }`}
            >
              {item}
            </button>
          ))}
        </div>

        <button className="flex items-center justify-center gap-2 rounded-xl border border-gray-200 bg-white px-4 py-2.5 text-sm font-medium text-gray-600 hover:bg-gray-50">
          <SlidersHorizontal size={17} />
          Filters
        </button>
      </div>

      {/* Results */}
      <div className="mt-8">
        <div className="mb-4 flex items-center justify-between">
          <p className="text-sm font-medium text-gray-500">
            {filteredProjects.length}{" "}
            {filteredProjects.length === 1
              ? "project"
              : "projects"}
          </p>
        </div>

        {filteredProjects.length > 0 ? (
          <section className="grid grid-cols-1 gap-5 md:grid-cols-2 xl:grid-cols-3">
            {filteredProjects.map((project) => (
              <ProjectCard
                key={project.id}
                projectId={project.id}
                projectName={project.name}
                projectPriority={project.priority}
                projectProgress={project.progress}
                xpReward={project.xpReward}
                deadline={project.deadline}
                technologies={project.technologies}
              />
            ))}
          </section>
        ) : (
          <div className="flex min-h-60 flex-col items-center justify-center rounded-2xl border border-dashed border-gray-300 bg-white">
            <Search size={32} className="text-gray-300" />

            <h2 className="mt-3 font-semibold text-gray-700">
              No projects found
            </h2>

            <p className="mt-1 text-sm text-gray-400">
              Try changing your search or filter.
            </p>
          </div>
        )}
      </div>

      {/* Create Project Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4">
          <div className="w-full max-w-lg rounded-2xl bg-white shadow-2xl">

            {/* Modal header */}
            <div className="flex items-center justify-between border-b border-gray-100 px-6 py-5">
              <div>
                <h2 className="text-xl font-bold text-gray-900">
                  Create Project
                </h2>

                <p className="mt-1 text-sm text-gray-500">
                  Add a new project to DevPilot.
                </p>
              </div>

              <button
                onClick={() => setShowModal(false)}
                className="rounded-lg p-2 text-gray-400 hover:bg-gray-100 hover:text-gray-600"
              >
                <X size={20} />
              </button>
            </div>

            {/* Form */}
            <form
              onSubmit={handleCreateProject}
              className="space-y-5 px-6 py-6"
            >

              {/* Name */}
              <div>
                <label className="mb-2 block text-sm font-medium text-gray-700">
                  Project name
                </label>

                <input
                  name="name"
                  value={form.name}
                  onChange={handleChange}
                  placeholder="e.g. DevPilot"
                  required
                  className="w-full rounded-xl border border-gray-200 px-4 py-3 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                />
              </div>

              {/* Description */}
              <div>
                <label className="mb-2 block text-sm font-medium text-gray-700">
                  Description
                </label>

                <textarea
                  name="description"
                  value={form.description}
                  onChange={handleChange}
                  placeholder="What are you building?"
                  rows={3}
                  className="w-full resize-none rounded-xl border border-gray-200 px-4 py-3 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                />
              </div>

              <div>
                <label className="mb-2 block text-sm font-medium text-gray-700">GitHub repository <span className="font-normal text-gray-400">(optional)</span></label>
                <input name="githubUrl" type="url" value={form.githubUrl} onChange={handleChange} placeholder="https://github.com/owner/repository" className="w-full rounded-xl border border-gray-200 px-4 py-3 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100" />
              </div>
              <div className="grid gap-4 sm:grid-cols-2">
                <div><label className="mb-2 block text-sm font-medium text-gray-700">Deadline</label><input name="deadline" type="date" value={form.deadline} onChange={handleChange} className="w-full rounded-xl border border-gray-200 px-4 py-3 text-sm outline-none focus:border-blue-500" /></div>
                <div><label className="mb-2 block text-sm font-medium text-gray-700">Technologies</label><input name="technologies" value={form.technologies} onChange={handleChange} placeholder="React, NestJS, SQLite" className="w-full rounded-xl border border-gray-200 px-4 py-3 text-sm outline-none focus:border-blue-500" /></div>
              </div>
              {/* Priority + Status */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="mb-2 block text-sm font-medium text-gray-700">
                    Priority
                  </label>

                  <select
                    name="priority"
                    value={form.priority}
                    onChange={handleChange}
                    className="w-full rounded-xl border border-gray-200 bg-white px-4 py-3 text-sm outline-none focus:border-blue-500"
                  >
                    <option value="LOW">Low</option>
                    <option value="MEDIUM">Medium</option>
                    <option value="HIGH">High</option>
                  </select>
                </div>

                <div>
                  <label className="mb-2 block text-sm font-medium text-gray-700">
                    Status
                  </label>

                  <select
                    name="status"
                    value={form.status}
                    onChange={handleChange}
                    className="w-full rounded-xl border border-gray-200 bg-white px-4 py-3 text-sm outline-none focus:border-blue-500"
                  >
                    <option value="NOT_STARTED">
                      Not Started
                    </option>

                    <option value="IN_PROGRESS">
                      In Progress
                    </option>

                    <option value="PAUSED">
                      Paused
                    </option>

                    <option value="COMPLETED">
                      Completed
                    </option>
                  </select>
                </div>
              </div>
              {/* Actions */}
              <div className="flex justify-end gap-3 border-t border-gray-100 pt-5">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="rounded-xl px-4 py-2.5 text-sm font-medium text-gray-600 hover:bg-gray-100"
                >
                  Cancel
                </button>

                <button
                  type="submit"
                  disabled={creating}
                  className="rounded-xl bg-blue-600 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {creating
                    ? "Creating..."
                    : "Create Project"}
                </button>
              </div>

            </form>
          </div>
        </div>
      )}
    </main>
  );
}

export default Projects;











