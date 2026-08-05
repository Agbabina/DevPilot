
import ProjectSummary from "./ProjectSummary";
import { projectService } from "../services/projectService";
import type { Project } from "../services/projectService";
import { useEffect, useState } from "react";

export default function RecentProjects() {
  const [projects, setProjects] = useState<Project[]>([]);

  useEffect(() => {
    async function fetchProjects() {
      try {
        const data = await projectService.getAll();
        setProjects(data);
      } catch (error) {
        console.error(error);
      }
    }

    fetchProjects();
  }, []);

  const recentProjects = projects.slice(0, 3);

  return (
    <div className="rounded-xl border border-gray-200 bg-white p-5 w-230">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-semibold">Recent Projects</h2>

        <button className="text-blue-600">View all</button>
      </div>

      <div className="mt-5">
        <div className="flex items-center gap-4 border-b py-4">
          {recentProjects.map((project) => (
            <ProjectSummary
              key={project.id}
              title={project.name}
              description={project.description ?? "No description"}
              taskProgress={project.progress}
            />
          ))}
        </div>

        <div className="mt-4 text-center">
          <button className="text-blue-600">
            View all projects →
          </button>
        </div>
      </div>
    </div>
  );
}


