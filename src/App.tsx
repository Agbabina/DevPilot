import { BrowserRouter, Routes, Route } from "react-router-dom";
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

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/auth" element={<AuthPage />} />

        <Route element={<ProtectedRoute />}>
          <Route path="/" element={<Dashboard />} />
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
        </Route>

        <Route path="*" element={<AuthPage />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
