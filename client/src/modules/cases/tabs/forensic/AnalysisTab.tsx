import { useState } from "react";
import { useTranslation } from "react-i18next";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiGet, apiPatch, apiPost } from "../../../../api/client";
import { BarChart3, Upload } from "lucide-react";

type AnalysisData = {
  contradictions: {
    confirmed: number;
    open: number;
    items: Array<{ id: string; description: string; status: string }>;
  };
  financialFacts: Array<{
    id: string;
    content: string;
    amount: string | null;
    amountCategory: string | null;
    factDate: string | null;
    entity?: { name: string } | null;
  }>;
  financialByCategory: Record<string, { total: number; count: number }>;
  score: { corruptionScore: number; breakdown: Record<string, unknown> };
  criticalAlerts: number;
};

type Props = { caseId: string };

export function AnalysisTab({ caseId }: Props) {
  const { t } = useTranslation();
  const qc = useQueryClient();
  const [cdrFile, setCdrFile] = useState<File | null>(null);

  const importCdr = useMutation({
    mutationFn: async () => {
      if (!cdrFile) throw new Error("No file");
      const text = await cdrFile.text();
      return apiPost(`/api/v1/cases/${caseId}/imports/cdr`, { csvText: text });
    },
    onSuccess: () => {
      setCdrFile(null);
      qc.invalidateQueries({ queryKey: ["forensic-timeline", caseId] });
      qc.invalidateQueries({ queryKey: ["forensic-network", caseId] });
    },
  });

  const { data, isLoading } = useQuery({
    queryKey: ["forensic-analysis", caseId],
    queryFn: () => apiGet<AnalysisData>(`/api/v1/cases/${caseId}/forensic/analysis`),
  });

  const confirm = useMutation({
    mutationFn: (id: string) => apiPatch(`/api/v1/contradictions/${id}`, { status: "confirmed" }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["forensic-analysis", caseId] });
      qc.invalidateQueries({ queryKey: ["contradictions", caseId] });
    },
  });

  if (isLoading || !data) return <div className="loading">{t("common.loading")}</div>;

  return (
    <div style={{ display: "grid", gap: "1rem" }}>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(140px, 1fr))", gap: "0.75rem" }}>
        <div className="card" style={{ textAlign: "center" }}>
          <div style={{ fontSize: "1.5rem", fontWeight: 700 }}>{data.score.corruptionScore}</div>
          <div style={{ fontSize: "0.75rem", color: "#64748b" }}>{t("case.score")}</div>
        </div>
        <div className="card" style={{ textAlign: "center" }}>
          <div style={{ fontSize: "1.5rem", fontWeight: 700, color: "#e11d48" }}>{data.criticalAlerts}</div>
          <div style={{ fontSize: "0.75rem", color: "#64748b" }}>{t("forensic.criticalAlerts")}</div>
        </div>
        <div className="card" style={{ textAlign: "center" }}>
          <div style={{ fontSize: "1.5rem", fontWeight: 700 }}>{data.contradictions.open}</div>
          <div style={{ fontSize: "0.75rem", color: "#64748b" }}>{t("forensic.openContradictions")}</div>
        </div>
        <div className="card" style={{ textAlign: "center" }}>
          <div style={{ fontSize: "1.5rem", fontWeight: 700, color: "#16a34a" }}>{data.contradictions.confirmed}</div>
          <div style={{ fontSize: "0.75rem", color: "#64748b" }}>{t("forensic.confirmedContradictions")}</div>
        </div>
      </div>

      <div className="card">
        <div className="card-header">
          <span className="card-title"><BarChart3 size={14} /> {t("forensic.financialFacts")}</span>
        </div>
        {Object.keys(data.financialByCategory).length === 0 ? (
          <p style={{ padding: "1rem", color: "#64748b" }}>{t("forensic.noFinancial")}</p>
        ) : (
          <table>
            <thead>
              <tr><th>{t("facts.type")}</th><th>{t("facts.amount")}</th><th>Count</th></tr>
            </thead>
            <tbody>
              {Object.entries(data.financialByCategory).map(([cat, v]) => (
                <tr key={cat}>
                  <td>{cat}</td>
                  <td>₹ {v.total.toLocaleString()}</td>
                  <td>{v.count}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {data.contradictions.items.length > 0 && (
        <div className="card">
          <div className="card-header">
            <span className="card-title">{t("case.contradictions")}</span>
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {data.contradictions.items.map((c) => (
              <div key={c.id} style={{ padding: "0.75rem", background: "#f8fafc", borderRadius: 8, display: "flex", justifyContent: "space-between", gap: 8 }}>
                <p style={{ margin: 0, fontSize: "0.875rem", flex: 1 }}>{c.description}</p>
                {c.status !== "confirmed" && c.status !== "dismissed" && (
                  <button type="button" className="secondary" style={{ fontSize: "0.75rem" }} onClick={() => confirm.mutate(c.id)}>
                    {t("case.confirmFinding")}
                  </button>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="card" style={{ marginTop: "1rem" }}>
        <div className="card-header">
          <span className="card-title"><Upload size={14} /> {t("imports.cdr")}</span>
        </div>
        <div className="form-stack">
          <input type="file" accept=".csv,text/csv" onChange={(e) => setCdrFile(e.target.files?.[0] ?? null)} />
          <button type="button" disabled={!cdrFile || importCdr.isPending} onClick={() => importCdr.mutate()}>
            {t("imports.cdrUpload")}
          </button>
        </div>
      </div>
    </div>
  );
}
