import { useTranslation } from "react-i18next";
import { useQuery } from "@tanstack/react-query";
import { apiGet } from "../../api/client";
import { BarChart2, TrendingUp, Download, Activity } from "lucide-react";

export function AnalyticsPage() {
  const { t } = useTranslation();
  const { data } = useQuery({
    queryKey: ["analytics"],
    queryFn: () => apiGet<{ totalCases: number; avgCorruptionScore: number | null }>("/api/v1/analytics/dashboard"),
  });

  const avg = data?.avgCorruptionScore ?? null;
  const riskLevel = avg === null ? null : avg >= 70 ? "High" : avg >= 40 ? "Medium" : "Low";
  const riskColor = avg === null ? "#64748b" : avg >= 70 ? "#e11d48" : avg >= 40 ? "#d97706" : "#10b981";

  return (
    <div>
      <div className="page-header">
        <div>
          <h1 className="page-title">{t("nav.analytics")}</h1>
          <p className="page-subtitle">Investigation metrics overview</p>
        </div>
        <a
          href={`${import.meta.env.VITE_API_URL}/api/v1/analytics/export/cases`}
          target="_blank"
          rel="noreferrer"
          className="link-btn"
        >
          <Download size={13} />
          {t("analytics.export")}
        </a>
      </div>

      <div className="stat-grid">
        <div className="stat-card">
          <div className="stat-icon" style={{ background: "#eef2ff" }}>
            <BarChart2 size={18} color="#4f46e5" />
          </div>
          <div className="stat-label">{t("analytics.total")}</div>
          <div className="stat-value">{data?.totalCases ?? 0}</div>
        </div>

        <div className="stat-card">
          <div className="stat-icon" style={{ background: "#fff7ed" }}>
            <TrendingUp size={18} color="#ea580c" />
          </div>
          <div className="stat-label">{t("analytics.avgScore")}</div>
          <div className="stat-value">
            {avg !== null ? avg.toFixed(1) : "—"}
          </div>
          {riskLevel && (
            <span className={`badge ${riskLevel === "High" ? "critical" : riskLevel === "Medium" ? "high" : "low"}`}
              style={{ marginTop: 4 }}>
              {riskLevel} risk
            </span>
          )}
        </div>

        <div className="stat-card">
          <div className="stat-icon" style={{ background: "#f0fdf4" }}>
            <Activity size={18} color="#16a34a" />
          </div>
          <div className="stat-label">Risk Level</div>
          <div className="stat-value" style={{ fontSize: "1.25rem", color: riskColor }}>
            {riskLevel ?? "—"}
          </div>
        </div>
      </div>

      <div className="card">
        <div className="card-header">
          <span className="card-title">
            <BarChart2 size={14} />
            Summary
          </span>
        </div>
        <div style={{ padding: "0.5rem 0" }}>
          <div style={{
            display: "grid",
            gridTemplateColumns: "1fr 1fr",
            gap: "1.25rem",
          }}>
            <MetricRow label={t("analytics.total")} value={String(data?.totalCases ?? 0)} />
            <MetricRow
              label={t("analytics.avgScore")}
              value={avg !== null ? `${avg.toFixed(1)} / 100` : "—"}
            />
          </div>
        </div>
      </div>
    </div>
  );
}

function MetricRow({ label, value }: { label: string; value: string }) {
  return (
    <div style={{ padding: "0.875rem", background: "#f8fafc", borderRadius: 8, border: "1px solid #e2e8f0" }}>
      <div style={{ fontSize: "0.75rem", fontWeight: 600, color: "#64748b", textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: 4 }}>
        {label}
      </div>
      <div style={{ fontSize: "1.375rem", fontWeight: 700, letterSpacing: "-0.02em", color: "#0f172a" }}>
        {value}
      </div>
    </div>
  );
}
