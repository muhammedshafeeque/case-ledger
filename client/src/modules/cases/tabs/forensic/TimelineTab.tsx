import { useState } from "react";
import { useTranslation } from "react-i18next";
import { useQuery } from "@tanstack/react-query";
import { apiGet } from "../../../../api/client";
import { Clock } from "lucide-react";

type TimelineItem = {
  type: string;
  title: string;
  description: string;
  sourceId: string;
  severity?: string;
  timestamp: string;
};

const FILTERS = ["all", "fact", "document", "alert", "custody", "note", "contradiction"] as const;

type Props = { caseId: string };

export function TimelineTab({ caseId }: Props) {
  const { t } = useTranslation();
  const [filter, setFilter] = useState<(typeof FILTERS)[number]>("all");

  const { data: items = [], isLoading } = useQuery({
    queryKey: ["forensic-timeline", caseId],
    queryFn: () => apiGet<TimelineItem[]>(`/api/v1/cases/${caseId}/forensic/timeline`),
  });

  const filtered = filter === "all" ? items : items.filter((i) => i.type === filter);

  if (isLoading) return <div className="loading">{t("common.loading")}</div>;

  return (
    <div>
      <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginBottom: "1rem" }}>
        {FILTERS.map((f) => (
          <button
            key={f}
            type="button"
            className={filter === f ? "tab-active" : "secondary"}
            style={{ fontSize: "0.75rem" }}
            onClick={() => setFilter(f)}
          >
            {f === "all" ? t("forensic.filterAll") : f}
          </button>
        ))}
      </div>
      <div className="card">
        <div className="card-header">
          <span className="card-title"><Clock size={14} /> {t("forensic.timeline")}</span>
        </div>
        {filtered.length === 0 ? (
          <p style={{ padding: "1rem", color: "#64748b" }}>{t("forensic.timelineEmpty")}</p>
        ) : (
          <div style={{ borderLeft: "2px solid #e2e8f0", marginLeft: 12, paddingLeft: 20 }}>
            {filtered.map((item) => (
              <div key={`${item.type}-${item.sourceId}-${item.timestamp}`} style={{ marginBottom: 20, position: "relative" }}>
                <div style={{
                  position: "absolute",
                  left: -27,
                  width: 10,
                  height: 10,
                  borderRadius: "50%",
                  background: item.severity === "critical" ? "#e11d48" : "#4f46e5",
                  border: "2px solid #fff",
                }} />
                <div style={{ fontSize: "0.75rem", color: "#64748b" }}>
                  {new Date(item.timestamp).toLocaleString()}
                </div>
                <div style={{ fontWeight: 600, fontSize: "0.875rem" }}>
                  <span className="badge open" style={{ marginRight: 6 }}>{item.type}</span>
                  {item.title}
                </div>
                <p style={{ margin: "4px 0 0", fontSize: "0.8125rem", color: "#475569" }}>{item.description}</p>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
