import { useState } from "react";
import { useTranslation } from "react-i18next";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiGet, apiPost } from "../../../../api/client";
import { Shield, CheckCircle2, XCircle, Clock, FileSearch } from "lucide-react";

type EvidenceRow = {
  id: string;
  docType: string;
  originalFilename: string | null;
  sha256Hash: string | null;
  processingStatus: string;
  latestExtraction: { status: string; source: string | null } | null;
  custodyEventCount: number;
};

type CustodyEvent = {
  id: string;
  eventType: string;
  occurredAt: string;
  actor?: { name: string } | null;
  payload: Record<string, unknown>;
};

type Props = { caseId: string; onOpenExaminer: (documentId: string) => void };

export function EvidenceLockerTab({ caseId, onOpenExaminer }: Props) {
  const { t } = useTranslation();
  const qc = useQueryClient();
  const [custodyDocId, setCustodyDocId] = useState<string | null>(null);

  const { data: evidence = [], isLoading } = useQuery({
    queryKey: ["forensic-evidence", caseId],
    queryFn: () => apiGet<EvidenceRow[]>(`/api/v1/cases/${caseId}/forensic/evidence`),
  });

  const { data: jobs = [] } = useQuery({
    queryKey: ["forensic-jobs", caseId],
    queryFn: () => apiGet<Array<{ id: string; status: string; documentId: string | null }>>(
      `/api/v1/cases/${caseId}/forensic/jobs`
    ),
    refetchInterval: (q) => {
      const pending = (q.state.data ?? []).some((j) => j.status === "pending" || j.status === "active");
      return pending ? 3000 : false;
    },
  });

  const { data: custody = [] } = useQuery({
    queryKey: ["custody", custodyDocId],
    queryFn: () =>
      apiGet<CustodyEvent[]>(`/api/v1/cases/${caseId}/forensic/documents/${custodyDocId}/custody`),
    enabled: !!custodyDocId,
  });

  const verify = useMutation({
    mutationFn: (documentId: string) =>
      apiPost<{ valid: boolean; stored: string; computed: string | null }>(
        `/api/v1/cases/${caseId}/forensic/documents/${documentId}/verify`,
        {}
      ),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["forensic-evidence", caseId] }),
  });

  const statusIcon = (status: string) => {
    if (status === "done") return <CheckCircle2 size={14} color="#16a34a" />;
    if (status === "failed") return <XCircle size={14} color="#e11d48" />;
    if (status === "processing" || status === "pending") return <Clock size={14} color="#d97706" />;
    return null;
  };

  if (isLoading) return <div className="loading">{t("common.loading")}</div>;

  const pendingJobs = jobs.filter((j) => j.status === "pending" || j.status === "active").length;

  return (
    <div>
      {pendingJobs > 0 && (
        <div style={{ marginBottom: "1rem", padding: "0.75rem", background: "#fffbeb", borderRadius: 8, border: "1px solid #fde68a", fontSize: "0.875rem" }}>
          {t("forensic.processingJobs", { count: pendingJobs })}
        </div>
      )}
      <div className="card" style={{ padding: 0, overflow: "hidden" }}>
        <div className="card-header">
          <span className="card-title"><Shield size={14} /> {t("forensic.evidenceLocker")}</span>
        </div>
        {evidence.length === 0 ? (
          <div className="empty-state" style={{ padding: "2rem" }}>
            <Shield size={28} />
            <p>{t("forensic.evidenceEmpty")}</p>
          </div>
        ) : (
          <table>
            <thead>
              <tr>
                <th>{t("documents.type")}</th>
                <th>{t("forensic.filename")}</th>
                <th>{t("forensic.hash")}</th>
                <th>{t("forensic.status")}</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {evidence.map((row) => (
                <tr key={row.id}>
                  <td><span className="badge open">{row.docType}</span></td>
                  <td>{row.originalFilename ?? "—"}</td>
                  <td style={{ fontFamily: "monospace", fontSize: "0.75rem" }}>
                    {row.sha256Hash ? `${row.sha256Hash.slice(0, 12)}…` : "—"}
                  </td>
                  <td style={{ display: "flex", alignItems: "center", gap: 6 }}>
                    {statusIcon(row.processingStatus)}
                    {row.processingStatus}
                  </td>
                  <td style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                    <button type="button" className="secondary" style={{ fontSize: "0.75rem" }} onClick={() => verify.mutate(row.id)} disabled={verify.isPending}>
                      {t("forensic.verify")}
                    </button>
                    <button type="button" className="secondary" style={{ fontSize: "0.75rem" }} onClick={() => setCustodyDocId(custodyDocId === row.id ? null : row.id)}>
                      {t("forensic.custody")}
                    </button>
                    <button type="button" className="secondary" style={{ fontSize: "0.75rem" }} onClick={() => onOpenExaminer(row.id)}>
                      <FileSearch size={12} /> {t("forensic.examiner")}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
      {custodyDocId && custody.length > 0 && (
        <div className="card" style={{ marginTop: "1rem" }}>
          <div className="card-header">
            <span className="card-title">{t("forensic.custodyChain")}</span>
          </div>
          <ol style={{ margin: 0, paddingLeft: "1.25rem", fontSize: "0.875rem" }}>
            {custody.map((e) => (
              <li key={e.id} style={{ marginBottom: 6 }}>
                <strong>{new Date(e.occurredAt).toLocaleString()}</strong> — {e.eventType}
                {e.actor ? ` (${e.actor.name})` : ""}
              </li>
            ))}
          </ol>
        </div>
      )}
    </div>
  );
}
