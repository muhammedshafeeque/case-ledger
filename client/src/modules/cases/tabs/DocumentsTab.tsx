import { useState } from "react";
import { useTranslation } from "react-i18next";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiGet, apiPost, apiUpload } from "../../../api/client";
import { Upload, FileText } from "lucide-react";
import type { DocumentRow } from "../types";

const DOC_TYPES = [
  "application", "response", "first_appeal", "second_appeal", "sic_order",
  "court_order", "audit_report", "news", "evidence",
] as const;

type Props = { caseId: string; caseRef: string; documents: DocumentRow[] };

export function DocumentsTab({ caseId, documents }: Props) {
  const { t } = useTranslation();
  const qc = useQueryClient();
  const [docType, setDocType] = useState<string>("response");
  const [textContent, setTextContent] = useState("");
  const [notAnswered, setNotAnswered] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [error, setError] = useState<string | null>(null);

  const commit = useMutation({
    mutationFn: async () => {
      setError(null);
      let s3Key: string | undefined;
      let sha256Hash: string | undefined;
      let fileSize: number | undefined;
      let mimeType: string | undefined;

      if (file) {
        const fd = new FormData();
        fd.append("file", file);
        fd.append("caseId", caseId);
        fd.append("docType", docType);
        const uploaded = await apiUpload<{ key: string; hash: string; size: number; localOnly?: boolean }>(
          "/api/v1/documents/upload",
          fd
        );
        s3Key = uploaded.key;
        sha256Hash = uploaded.hash;
        fileSize = uploaded.size;
        mimeType = file.type;
      }

      if (!textContent.trim() && !file) {
        throw new Error("Add file or paste response text");
      }

      return apiPost<DocumentRow>("/api/v1/documents", {
        caseId,
        docType,
        s3Key,
        sha256Hash,
        fileSize,
        mimeType,
        originalFilename: file?.name,
        textContent: textContent.trim() || undefined,
        notAnswered: notAnswered.trim() || undefined,
        facts: textContent.includes("not answered") || notAnswered
          ? [{
              factType: "official_statement",
              content: notAnswered || "Fields marked as not answered in response",
            }]
          : undefined,
      });
    },
    onSuccess: () => {
      setTextContent("");
      setNotAnswered("");
      setFile(null);
      qc.invalidateQueries({ queryKey: ["case", caseId] });
      qc.invalidateQueries({ queryKey: ["forensic-evidence", caseId] });
      qc.invalidateQueries({ queryKey: ["forensic-jobs", caseId] });
    },
    onError: (e: Error) => setError(e.message),
  });

  const { data: jobs = [] } = useQuery({
    queryKey: ["forensic-jobs", caseId],
    queryFn: () =>
      apiGet<Array<{ status: string }>>(`/api/v1/cases/${caseId}/forensic/jobs`),
    refetchInterval: (q) => {
      const pending = (q.state.data ?? []).some((j) => j.status === "pending" || j.status === "active");
      return pending ? 3000 : false;
    },
  });

  const processingCount = jobs.filter((j) => j.status === "pending" || j.status === "active").length;

  return (
    <div>
      {processingCount > 0 && (
        <div style={{ marginBottom: "1rem", padding: "0.75rem", background: "#fffbeb", borderRadius: 8, border: "1px solid #fde68a", fontSize: "0.875rem" }}>
          Extracting text from {processingCount} document(s)…
        </div>
      )}
      <div className="card" style={{ marginBottom: "1rem" }}>
        <div className="card-header">
          <span className="card-title"><Upload size={14} /> {t("documents.add")}</span>
        </div>
        <div className="form-stack" style={{ padding: "0 0.25rem" }}>
          {error && <div className="form-error-banner">{error}</div>}
          <div className="form-row">
            <div className="form-field">
              <label>{t("documents.type")}</label>
              <select value={docType} onChange={(e) => setDocType(e.target.value)}>
                {DOC_TYPES.map((d) => <option key={d} value={d}>{d.replace(/_/g, " ")}</option>)}
              </select>
            </div>
            <div className="form-field">
              <label>{t("documents.file")}</label>
              <input type="file" accept=".pdf,.txt,.doc,.docx" onChange={(e) => setFile(e.target.files?.[0] ?? null)} />
            </div>
          </div>
          <div className="form-field">
            <label>{t("documents.text")}</label>
            <textarea
              rows={5}
              value={textContent}
              onChange={(e) => setTextContent(e.target.value)}
              placeholder="Paste RTI response or document text…"
            />
          </div>
          <div className="form-field">
            <label>{t("documents.notAnswered")}</label>
            <input
              value={notAnswered}
              onChange={(e) => setNotAnswered(e.target.value)}
              placeholder="e.g. budget breakdown, tender evaluation"
            />
          </div>
          <button type="button" onClick={() => commit.mutate()} disabled={commit.isPending}>
            {commit.isPending ? t("documents.saving") : t("documents.commit")}
          </button>
        </div>
      </div>

      <div className="card" style={{ padding: 0, overflow: "hidden" }}>
        <div className="card-header">
          <span className="card-title"><FileText size={14} /> {t("documents.list")} ({documents.length})</span>
        </div>
        {documents.length === 0 ? (
          <div className="empty-state" style={{ padding: "2rem" }}>
            <FileText size={28} />
            <p>{t("documents.empty")}</p>
          </div>
        ) : (
          <table>
            <thead>
              <tr>
                <th>{t("documents.type")}</th>
                <th>{t("cases.title")}</th>
                <th>Uploaded</th>
              </tr>
            </thead>
            <tbody>
              {documents.map((d) => (
                <tr key={d.id}>
                  <td><span className="badge open">{d.docType}</span></td>
                  <td style={{ maxWidth: 400, overflow: "hidden", textOverflow: "ellipsis" }}>
                    {d.textContent?.slice(0, 120) || (d.mimeType ? "File attached" : "—")}
                  </td>
                  <td style={{ fontSize: "0.8125rem", color: "#64748b" }}>
                    {new Date(d.uploadedAt).toLocaleString()}
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
