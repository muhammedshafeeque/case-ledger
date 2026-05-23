import { Routes, Route, Navigate } from "react-router-dom";
import { Layout } from "./shared/Layout";
import { LoginPage } from "./modules/auth/LoginPage";
import { DashboardPage } from "./modules/dashboard/DashboardPage";
import { CasesPage } from "./modules/cases/CasesPage";
import { CaseDetailPage } from "./modules/cases/CaseDetailPage";
import { AlertsPage } from "./modules/alerts/AlertsPage";
import { EntitiesPage } from "./modules/entities/EntitiesPage";
import { AnalyticsPage } from "./modules/analytics/AnalyticsPage";
import { AiPage } from "./modules/ai/AiPage";
import { SearchPage } from "./modules/search/SearchPage";
import { TasksPage } from "./modules/tasks/TasksPage";
import { SettingsPage } from "./modules/settings/SettingsPage";

function RequireAuth({ children }: { children: React.ReactNode }) {
  const token = localStorage.getItem("accessToken");
  if (!token) return <Navigate to="/login" replace />;
  return <>{children}</>;
}

export default function App() {
  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />
      <Route
        path="/"
        element={
          <RequireAuth>
            <Layout />
          </RequireAuth>
        }
      >
        <Route index element={<DashboardPage />} />
        <Route path="cases" element={<CasesPage />} />
        <Route path="cases/:id" element={<CaseDetailPage />} />
        <Route path="alerts" element={<AlertsPage />} />
        <Route path="entities" element={<EntitiesPage />} />
        <Route path="analytics" element={<AnalyticsPage />} />
        <Route path="ai" element={<AiPage />} />
        <Route path="search" element={<SearchPage />} />
        <Route path="tasks" element={<TasksPage />} />
        <Route path="settings" element={<SettingsPage />} />
      </Route>
    </Routes>
  );
}
