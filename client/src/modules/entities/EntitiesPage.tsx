import { useTranslation } from "react-i18next";
import { useQuery } from "@tanstack/react-query";
import { apiGet } from "../../api/client";
import { Users, Building2, User, ShieldCheck } from "lucide-react";

type Entity = { id: string; name: string; type: string; riskScore: number };

function RiskBadge({ score }: { score: number }) {
  if (score >= 70) return <span className="badge critical">High · {score}</span>;
  if (score >= 40) return <span className="badge high">Medium · {score}</span>;
  return <span className="badge low">Low · {score}</span>;
}

function EntityAvatar({ name, type }: { name: string; type: string }) {
  const initials = name.split(" ").map((w) => w[0]).join("").slice(0, 2).toUpperCase();
  return (
    <div style={{
      width: 30, height: 30,
      borderRadius: 8,
      background: type === "company" ? "#eef2ff" : "#f0fdf4",
      display: "flex", alignItems: "center", justifyContent: "center",
      flexShrink: 0,
    }}>
      {type === "company"
        ? <Building2 size={13} color="#4f46e5" />
        : initials
          ? <span style={{ fontSize: "0.6875rem", fontWeight: 700, color: "#16a34a" }}>{initials}</span>
          : <User size={13} color="#16a34a" />
      }
    </div>
  );
}

export function EntitiesPage() {
  const { t } = useTranslation();
  const { data } = useQuery({
    queryKey: ["entities"],
    queryFn: () => apiGet<Entity[]>("/api/v1/entities"),
  });

  const entities = data ?? [];
  const companies = entities.filter((e) => e.type === "company").length;
  const highRisk = entities.filter((e) => e.riskScore >= 70).length;

  return (
    <div>
      <div className="page-header">
        <div>
          <h1 className="page-title">{t("nav.entities")}</h1>
          <p className="page-subtitle">{entities.length} tracked entities</p>
        </div>
      </div>

      <div className="stat-grid">
        <div className="stat-card">
          <div className="stat-icon" style={{ background: "#eef2ff" }}>
            <Users size={17} color="#4f46e5" />
          </div>
          <div className="stat-label">Total Entities</div>
          <div className="stat-value">{entities.length}</div>
        </div>
        <div className="stat-card">
          <div className="stat-icon" style={{ background: "#f0fdf4" }}>
            <Building2 size={17} color="#16a34a" />
          </div>
          <div className="stat-label">Companies</div>
          <div className="stat-value">{companies}</div>
        </div>
        <div className="stat-card">
          <div className="stat-icon" style={{ background: "#fff1f2" }}>
            <ShieldCheck size={17} color="#e11d48" />
          </div>
          <div className="stat-label">High Risk</div>
          <div className="stat-value">{highRisk}</div>
        </div>
      </div>

      <div className="card" style={{ padding: 0, overflow: "hidden" }}>
        <div className="card-header">
          <span className="card-title">
            <Users size={14} />
            Entity Registry
          </span>
        </div>

        {entities.length === 0 ? (
          <div className="empty-state">
            <Users size={32} />
            <h3>No entities</h3>
            <p>Entities linked to cases will appear here</p>
          </div>
        ) : (
          <table>
            <thead>
              <tr>
                <th>{t("entities.name")}</th>
                <th>{t("entities.type")}</th>
                <th>{t("entities.risk")}</th>
              </tr>
            </thead>
            <tbody>
              {entities.map((e) => (
                <tr key={e.id}>
                  <td>
                    <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                      <EntityAvatar name={e.name} type={e.type} />
                      <span style={{ fontWeight: 500 }}>{e.name}</span>
                    </div>
                  </td>
                  <td>
                    <span style={{
                      fontSize: "0.75rem",
                      color: "#64748b",
                      textTransform: "capitalize",
                    }}>
                      {e.type}
                    </span>
                  </td>
                  <td><RiskBadge score={e.riskScore} /></td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
