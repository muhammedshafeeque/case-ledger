import { useState } from "react";
import { useTranslation } from "react-i18next";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiGet, apiPost, apiDelete } from "../../../api/client";
import { Lock } from "lucide-react";

type SourceRow = { id: string; codename: string; contactMethod: string | null; createdAt: string };

type Props = { caseId: string };

export function SourceVaultTab({ caseId }: Props) {
  const { t } = useTranslation();
  const qc = useQueryClient();
  const [codename, setCodename] = useState("");
  const [realIdentity, setRealIdentity] = useState("");
  const [revealed, setRevealed] = useState<Record<string, string>>({});

  const { data: sources = [] } = useQuery({
    queryKey: ["sources", caseId],
    queryFn: () => apiGet<SourceRow[]>(`/api/v1/cases/${caseId}/sources`),
  });

  const add = useMutation({
    mutationFn: () =>
      apiPost(`/api/v1/cases/${caseId}/sources`, { codename, realIdentity, contactMethod: "" }),
    onSuccess: () => {
      setCodename("");
      setRealIdentity("");
      qc.invalidateQueries({ queryKey: ["sources", caseId] });
    },
  });

  const reveal = useMutation({
    mutationFn: (sourceId: string) =>
      apiGet<{ realIdentity: string; notes: string | null }>(`/api/v1/cases/${caseId}/sources/${sourceId}/reveal`),
    onSuccess: (data, sourceId) => {
      setRevealed((r) => ({ ...r, [sourceId]: data.realIdentity }));
    },
  });

  const remove = useMutation({
    mutationFn: (id: string) => apiDelete(`/api/v1/cases/${caseId}/sources/${id}`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["sources", caseId] }),
  });

  return (
    <div>
      <div className="card" style={{ marginBottom: "1rem" }}>
        <div className="card-header">
          <span className="card-title"><Lock size={14} /> {t("sources.title")}</span>
        </div>
        <div className="form-stack">
          <div className="form-field">
            <label>{t("sources.codename")}</label>
            <input value={codename} onChange={(e) => setCodename(e.target.value)} placeholder="Source A" />
          </div>
          <div className="form-field">
            <label>{t("sources.realIdentity")}</label>
            <input value={realIdentity} onChange={(e) => setRealIdentity(e.target.value)} type="password" />
          </div>
          <button type="button" onClick={() => add.mutate()} disabled={!codename || !realIdentity}>
            {t("sources.add")}
          </button>
        </div>
      </div>
      <div className="card">
        {sources.map((s) => (
          <div key={s.id} style={{ padding: "0.75rem", borderBottom: "1px solid #e2e8f0" }}>
            <strong>{s.codename}</strong>
            {revealed[s.id] && <p style={{ margin: "4px 0", fontSize: "0.875rem" }}>{revealed[s.id]}</p>}
            <div style={{ display: "flex", gap: 8, marginTop: 6 }}>
              <button type="button" className="secondary" style={{ fontSize: "0.75rem" }} onClick={() => reveal.mutate(s.id)}>
                {t("sources.reveal")}
              </button>
              <button type="button" className="secondary" style={{ fontSize: "0.75rem" }} onClick={() => remove.mutate(s.id)}>
                {t("common.delete")}
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
