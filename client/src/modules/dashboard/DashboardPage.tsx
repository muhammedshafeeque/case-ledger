import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { useQuery } from "@tanstack/react-query";
import { apiGet } from "../../api/client";
import {
  LayoutDashboard,
  FolderOpen,
  Bell,
  Clock,
  AlertTriangle,
  ChevronRight,
  Plus,
} from "lucide-react";

type DashboardStats = {
  totalCases: number;
  criticalAlerts: number;
  overdueCases: number;
  highRiskCases: number;
  avgCorruptionScore: number | null;
};

type RtiCase = {
  id: string;
  rtiId: string;
  title: string;
  department: string;
  status: string;
  corruptionScore: number;
  dueDate: string;
};

type Alert = {
  id: string;
  title: string;
  severity: string;
  alertType: string;
  caseId: string;
};

export function DashboardPage() {
  const { t } = useTranslation();

  const { data: stats, isLoading: statsLoading } = useQuery({
    queryKey: ["dashboard-stats"],
    queryFn: () => apiGet<DashboardStats>("/api/v1/analytics/dashboard"),
  });

  const { data: recentCases } = useQuery({
    queryKey: ["cases-recent"],
    queryFn: () => apiGet<RtiCase[]>("/api/v1/cases?limit=8"),
  });

  const { data: recentAlerts } = useQuery({
    queryKey: ["alerts-recent"],
    queryFn: () => apiGet<Alert[]>("/api/v1/alerts?limit=8"),
  });

  if (statsLoading) {
    return <div className="loading">{t("common.loading")}</div>;
  }

  const cases = recentCases ?? [];
  const alerts = recentAlerts ?? [];

  return (
    <div>
      <div className="page-header">
        <div>
          <h1 className="page-title">{t("nav.dashboard")}</h1>
          <p className="page-subtitle">{t("dashboard.subtitle")}</p>
        </div>
        <Link to="/cases" className="link-btn" style={{ textDecoration: "none" }}>
          <Plus size={14} />
          {t("cases.new")}
        </Link>
      </div>

      <div className="stat-grid">
        <StatCard
          icon={<FolderOpen size={17} color="#4f46e5" />}
          iconBg="#eef2ff"
          label={t("dashboard.totalCases")}
          value={stats?.totalCases ?? 0}
        />
        <StatCard
          icon={<Bell size={17} color="#e11d48" />}
          iconBg="#fff1f2"
          label={t("dashboard.criticalAlerts")}
          value={stats?.criticalAlerts ?? 0}
        />
        <StatCard
          icon={<Clock size={17} color="#d97706" />}
          iconBg="#fffbeb"
          label={t("dashboard.overdue")}
          value={stats?.overdueCases ?? 0}
        />
        <StatCard
          icon={<AlertTriangle size={17} color="#be123c" />}
          iconBg="#fff1f2"
          label={t("dashboard.highRisk")}
          value={stats?.highRiskCases ?? 0}
        />
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1rem", alignItems: "start" }}>
        <div className="card" style={{ padding: 0, overflow: "hidden" }}>
          <div className="card-header">
            <span className="card-title">
              <LayoutDashboard size={14} />
              {t("dashboard.recentCases")}
            </span>
            <Link to="/cases" className="link-btn" style={{ fontSize: "0.8125rem" }}>
              {t("common.viewAll")}
              <ChevronRight size={12} />
            </Link>
          </div>
          {cases.length === 0 ? (
            <div className="empty-state" style={{ padding: "2rem" }}>
              <FolderOpen size={28} />
              <p>No investigations yet</p>
              <Link to="/cases" style={{ marginTop: 8 }}>{t("cases.new")}</Link>
            </div>
          ) : (
            <table>
              <thead>
                <tr>
                  <th>{t("cases.refId")}</th>
                  <th>{t("cases.title")}</th>
                  <th>{t("cases.score")}</th>
                </tr>
              </thead>
              <tbody>
                {cases.map((c) => (
                  <tr key={c.id}>
                    <td>
                      <Link to={`/cases/${c.id}`} style={{ fontWeight: 700, color: "#4f46e5", fontSize: "0.8125rem" }}>
                        {c.rtiId}
                      </Link>
                    </td>
                    <td style={{ maxWidth: 200, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                      {c.title}
                    </td>
                    <td>
                      <span className={`badge ${c.corruptionScore >= 70 ? "critical" : c.corruptionScore >= 40 ? "high" : "low"}`}>
                        {c.corruptionScore}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        <div className="card" style={{ padding: 0, overflow: "hidden" }}>
          <div className="card-header">
            <span className="card-title">
              <Bell size={14} />
              {t("dashboard.recentAlerts")}
            </span>
            <Link to="/alerts" className="link-btn" style={{ fontSize: "0.8125rem" }}>
              {t("common.viewAll")}
              <ChevronRight size={12} />
            </Link>
          </div>
          {alerts.length === 0 ? (
            <div className="empty-state" style={{ padding: "2rem" }}>
              <Bell size={28} />
              <p>No alerts</p>
            </div>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: 0 }}>
              {alerts.map((a) => (
                <Link
                  key={a.id}
                  to={`/cases/${a.caseId}`}
                  style={{
                    display: "block",
                    padding: "0.75rem 1rem",
                    borderBottom: "1px solid #e2e8f0",
                    textDecoration: "none",
                    color: "inherit",
                  }}
                >
                  <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 4 }}>
                    <span className={`badge ${a.severity}`}>{a.severity}</span>
                    <span style={{ fontSize: "0.75rem", color: "#64748b" }}>{a.alertType}</span>
                  </div>
                  <p style={{ fontSize: "0.875rem", margin: 0, lineHeight: 1.5 }}>{a.title}</p>
                </Link>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function StatCard({
  icon,
  iconBg,
  label,
  value,
}: {
  icon: React.ReactNode;
  iconBg: string;
  label: string;
  value: number;
}) {
  return (
    <div className="stat-card">
      <div className="stat-icon" style={{ background: iconBg }}>{icon}</div>
      <div className="stat-label">{label}</div>
      <div className="stat-value">{value}</div>
    </div>
  );
}
