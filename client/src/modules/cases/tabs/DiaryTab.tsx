import { useState } from "react";
import { useTranslation } from "react-i18next";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiGet, apiPost, apiDelete } from "../../../api/client";
import { Clock } from "lucide-react";

type Entry = {
  id: string;
  entryAt: string;
  entryType: string;
  summary: string;
  location: string | null;
  isPrivileged: boolean;
  createdBy: { name: string };
};

type Props = { caseId: string };

export function DiaryTab({ caseId }: Props) {
  const { t } = useTranslation();
  const qc = useQueryClient();
  const [summary, setSummary] = useState("");
  const [entryType, setEntryType] = useState("patrol");
  const [location, setLocation] = useState("");

  const { data: entries = [] } = useQuery({
    queryKey: ["diary", caseId],
    queryFn: () => apiGet<Entry[]>(`/api/v1/cases/${caseId}/diary`),
  });

  const add = useMutation({
    mutationFn: () =>
      apiPost(`/api/v1/cases/${caseId}/diary`, {
        entryAt: new Date().toISOString(),
        entryType,
        summary,
        location: location || undefined,
      }),
    onSuccess: () => {
      setSummary("");
      qc.invalidateQueries({ queryKey: ["diary", caseId] });
    },
  });

  const remove = useMutation({
    mutationFn: (id: string) => apiDelete(`/api/v1/cases/${caseId}/diary/${id}`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["diary", caseId] }),
  });

  return (
    <div>
      <div className="card" style={{ marginBottom: "1rem" }}>
        <div className="card-header">
          <span className="card-title"><Clock size={14} /> {t("diary.title")}</span>
        </div>
        <div className="form-stack">
          <div className="form-row">
            <div className="form-field">
              <label>{t("diary.type")}</label>
              <select value={entryType} onChange={(e) => setEntryType(e.target.value)}>
                {["patrol", "interview", "seizure", "court", "other"].map((x) => (
                  <option key={x} value={x}>{x}</option>
                ))}
              </select>
            </div>
            <div className="form-field">
              <label>{t("diary.location")}</label>
              <input value={location} onChange={(e) => setLocation(e.target.value)} />
            </div>
          </div>
          <div className="form-field">
            <label>{t("diary.summary")}</label>
            <textarea rows={3} value={summary} onChange={(e) => setSummary(e.target.value)} />
          </div>
          <button type="button" onClick={() => add.mutate()} disabled={!summary.trim() || add.isPending}>
            {t("diary.add")}
          </button>
        </div>
      </div>
      <div className="card">
        {entries.length === 0 ? (
          <p className="empty-state">{t("diary.empty")}</p>
        ) : (
          <ul style={{ listStyle: "none", padding: 0, margin: 0 }}>
            {entries.map((e) => (
              <li key={e.id} style={{ padding: "0.75rem", borderBottom: "1px solid #e2e8f0" }}>
                <div style={{ fontSize: "0.75rem", color: "#64748b" }}>
                  {new Date(e.entryAt).toLocaleString()} · {e.entryType}
                  {e.isPrivileged ? " · privileged" : ""}
                </div>
                <p style={{ margin: "4px 0" }}>{e.summary}</p>
                {e.location && <p style={{ fontSize: "0.8125rem", color: "#64748b" }}>{e.location}</p>}
                <button type="button" className="secondary" style={{ fontSize: "0.75rem" }} onClick={() => remove.mutate(e.id)}>
                  {t("common.delete")}
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
