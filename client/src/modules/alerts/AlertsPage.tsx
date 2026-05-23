import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiGet, apiPatch } from "../../api/client";
import { Bell, AlertTriangle, Info, ShieldAlert } from "lucide-react";

type Alert = {
  id: string;
  title: string;
  severity: string;
  alertType: string;
  status: string;
  caseId: string;
};

function SeverityBadge({ severity }: { severity: string }) {
  const cls =
    severity === "critical" ? "critical" :
    severity === "high" ? "high" :
    severity === "medium" ? "medium" : "low";
  const Icon = severity === "critical" || severity === "high" ? AlertTriangle : Info;
  return (
    <span className={`badge ${cls}`}>
      <Icon size={9} />
      {severity}
    </span>
  );
}

export function AlertsPage() {
  const { t } = useTranslation();
  const qc = useQueryClient();
  const { data } = useQuery({
    queryKey: ["alerts"],
    queryFn: () => apiGet<Alert[]>("/api/v1/alerts?limit=100"),
  });

  const acknowledge = useMutation({
    mutationFn: (id: string) => apiPatch(`/api/v1/alerts/${id}`, { status: "acknowledged" }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["alerts"] }),
  });

  const alerts = data ?? [];
  const criticalCount = alerts.filter((a) => a.severity === "critical").length;
  const unreviewed = alerts.filter((a) => a.status === "unreviewed").length;

  return (
    <div>
      <div className="page-header">
        <div>
          <h1 className="page-title">{t("nav.alerts")}</h1>
          <p className="page-subtitle">{unreviewed} unreviewed · {alerts.length} total</p>
        </div>
      </div>

      <div className="stat-grid">
        <div className="stat-card">
          <div className="stat-icon" style={{ background: "#fff1f2" }}>
            <ShieldAlert size={17} color="#e11d48" />
          </div>
          <div className="stat-label">Critical</div>
          <div className="stat-value">{criticalCount}</div>
        </div>
        <div className="stat-card">
          <div className="stat-icon" style={{ background: "#eef2ff" }}>
            <Bell size={17} color="#4f46e5" />
          </div>
          <div className="stat-label">Unreviewed</div>
          <div className="stat-value">{unreviewed}</div>
        </div>
      </div>

      <div className="card" style={{ padding: 0, overflow: "hidden" }}>
        {alerts.length === 0 ? (
          <div className="empty-state">
            <Bell size={32} />
            <h3>No alerts</h3>
          </div>
        ) : (
          <table>
            <thead>
              <tr>
                <th>{t("alerts.type")}</th>
                <th>{t("alerts.title")}</th>
                <th>{t("alerts.severity")}</th>
                <th>{t("cases.status")}</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {alerts.map((a) => (
                <tr key={a.id}>
                  <td style={{ fontSize: "0.7rem", fontWeight: 600, color: "#64748b", textTransform: "uppercase" }}>
                    {a.alertType}
                  </td>
                  <td>
                    <Link to={`/cases/${a.caseId}`} style={{ fontWeight: 500, color: "inherit" }}>
                      {a.title}
                    </Link>
                  </td>
                  <td><SeverityBadge severity={a.severity} /></td>
                  <td><span className={`badge ${a.status}`}>{a.status}</span></td>
                  <td>
                    {a.status === "unreviewed" && (
                      <button
                        type="button"
                        className="secondary"
                        style={{ fontSize: "0.75rem", padding: "0.2rem 0.5rem" }}
                        onClick={() => acknowledge.mutate(a.id)}
                      >
                        {t("alerts.acknowledge")}
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
