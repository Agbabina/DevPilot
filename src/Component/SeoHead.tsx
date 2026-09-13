import { useEffect } from "react";
import { useLocation } from "react-router-dom";

type PageMeta = {
  title: string;
  description: string;
  keywords: string;
};

const pageMeta: Record<string, PageMeta> = {
  "/": {
    title: "DevPilot | AI Developer Workspace",
    description: "DevPilot turns product ideas, developer milestones, coding tasks, and project progress into one AI-assisted workflow.",
    keywords: "DevPilot, developer workspace, project tracking, AI coding assistant, software planning",
  },
  "/projects": {
    title: "Projects | DevPilot",
    description: "Create, manage, and measure your software delivery roadmap with DevPilot project intelligence.",
    keywords: "software projects, project roadmap, developer planning, project management dashboard",
  },
  "/milestones": {
    title: "Milestones | DevPilot",
    description: "Turn product strategy into measurable team milestones, delivery checkpoints, and software progress markers.",
    keywords: "software milestones, delivery roadmap, project milestones, agile planning",
  },
  "/tasks": {
    title: "Tasks | DevPilot",
    description: "Turn milestones into prioritized engineering tasks and keep product momentum visible.",
    keywords: "developer tasks, software tasks, agile workspace, coding workflow",
  },
  "/progress": {
    title: "Progress | DevPilot",
    description: "Track project momentum, XP, completion, and growth signals across your software workspace.",
    keywords: "project progress, engineering progress, software metrics, delivery progress",
  },
  "/rewards": {
    title: "Rewards | DevPilot",
    description: "Keep momentum high with DevPilot XP, coins, streaks, and developer achievement rewards.",
    keywords: "developer rewards, coding XP, streak tracking, software gamification",
  },
  "/resources": {
    title: "Resources | DevPilot",
    description: "Find guides, templates, technical references, and development resources inside your workflow.",
    keywords: "developer resources, coding guides, software resources, technical templates",
  },
  "/chat": {
    title: "AI Copilot | DevPilot",
    description: "Ask DevPilot for coding clarity, planning support, and technical assistance in your workspace.",
    keywords: "AI coding assistant, developer copilot, software planning support, AI workflow",
  },
  "/settings": {
    title: "Settings | DevPilot",
    description: "Configure your DevPilot workspace, profile, and coding experience preferences.",
    keywords: "developer settings, workspace settings, DevPilot preferences",
  },
};

export default function SeoHead() {
  const location = useLocation();

  useEffect(() => {
    const path = location.pathname;
    const base = pageMeta[path] ?? pageMeta["/"];

    document.title = base.title;

    const setMeta = (name: string, content: string, attr = "name") => {
      let meta = document.querySelector(`meta[${attr}="${name}"]`);
      if (!meta) {
        meta = document.createElement("meta");
        meta.setAttribute(attr, name);
        document.head.appendChild(meta);
      }
      meta.setAttribute("content", content);
    };

    setMeta("description", base.description);
    setMeta("keywords", base.keywords);
    setMeta("robots", "index, follow");
    setMeta("author", "DevPilot");
    setMeta("theme-color", "#061A2F");

    setMeta("og:title", base.title, "property");
    setMeta("og:description", base.description, "property");
    setMeta("og:type", "website", "property");
    setMeta("og:site_name", "DevPilot", "property");
    setMeta("og:url", `${window.location.origin}${path}`, "property");

    const jsonLd = {
      "@context": "https://schema.org",
      "@type": "SoftwareApplication",
      name: "DevPilot",
      applicationCategory: "DeveloperApplication",
      operatingSystem: "Web",
      description: base.description,
      url: `${window.location.origin}`,
      keywords: base.keywords,
      creator: {
        "@type": "Organization",
        name: "DevPilot",
      },
      featureList: [
        "Project planning",
        "Milestone tracking",
        "Developer task management",
        "AI-assisted workflow",
        "XP and rewards",
      ],
    };

    const existingScript = document.getElementById("devpilot-ld-json");
    if (existingScript) {
      existingScript.remove();
    }

    const script = document.createElement("script");
    script.type = "application/ld+json";
    script.id = "devpilot-ld-json";
    script.textContent = JSON.stringify(jsonLd);
    document.head.appendChild(script);
  }, [location.pathname]);

  return null;
}
