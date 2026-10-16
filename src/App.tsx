import { useEffect } from "react";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import AuthPage from "./Pages/AuthPage";
import Dashboard from "./Pages/Dashboard";
import Projects from "./Pages/Projects";
import ProjectDetails from "./Pages/ProjectDetails";
import Milestones from "./Pages/Milestones";
import Chat from "./Pages/Chat";
import Tasks from "./Pages/Tasks";
import Progress from "./Pages/Progress";
import Rewards from "./Pages/Rewards";
import Settings from "./Pages/Settings";
import Resources from "./Pages/Resources";
import ProtectedRoute from "./auth/ProtectedRoute";
import SeoHead from "./Component/SeoHead";
import LandingPage from "./Pages/LandingPage";
import CliPage from "./Pages/CliPage";
import DocsPage from "./Pages/DocsPage";
import AdminPage from "./Pages/AdminPage";
import AnalyticsTracker from "./Component/AnalyticsTracker";

function App() {
  useEffect(() => {
    const theme = localStorage.getItem("theme") || "light";
    document.documentElement.classList.toggle("dark", theme === "dark");
  }, []);
  return (
    <BrowserRouter>
      <AnalyticsTracker />
      <SeoHead />
      <Routes>
        <Route path="/" element={<LandingPage />} />
        <Route path="/cli" element={<CliPage />} />
        <Route path="/docs" element={<DocsPage />} />
        <Route path="/auth" element={<AuthPage />} />

        <Route element={<ProtectedRoute />}>
          <Route path="/app" element={<Dashboard />} />
          <Route path="/projects" element={<Projects />} />
          <Route path="/projects/:projectId" element={<ProjectDetails />} />
          <Route
            path="/projects/:projectId/milestones"
            element={<Milestones />}
          />
          <Route path="/chat" element={<Chat />} />
          <Route path="/milestones" element={<Milestones />} />
          <Route path="/tasks" element={<Tasks />} />
          <Route path="/progress" element={<Progress />} />
          <Route path="/rewards" element={<Rewards />} />
          <Route path="/settings" element={<Settings />} />
          <Route path="/resources" element={<Resources />} />
          <Route path="/admin" element={<AdminPage />} />
        </Route>

        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;


