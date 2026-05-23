import { useState } from "react";
import { useTranslation } from "react-i18next";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiGet, apiPost, apiDelete } from "../../../../api/client";
import { FileSearch, Highlighter } from "lucide-react";

type Annotation = {
  id: string;
  quote: string;
  label: string;
  createdBy: { name: string };
};

type DocContent = {
  document: { id: string; docType: string; originalFilename: string | null; mimeType: string | null };
  extractedText: string;
  downloadUrl: string | null;
};

type Props = { documentId: string | null; onBack: () => void };

const LABELS = ["key_quote", "not_answered", "comment", "redaction"] as const;

export function DocumentExaminerTab({ documentId, onBack }: Props) {
  const { t } = useTranslation();
  const qc = useQueryClient();
  const [selection, setSelection] = useState("");
  const [label, setLabel] = useState<(typeof LABELS)[number]>("comment");
  const [search, setSearch] = useState("");

  const { data, isLoading } = useQuery({
    queryKey: ["doc-content", documentId],
    queryFn: () => apiGet<DocContent>(`/api/v1/documents/${documentId}/content`),
    enabled: !!documentId,
  });

  const { data: annotations = [] } = useQuery({
    queryKey: ["doc-annotations", documentId],
    queryFn: () => apiGet<Annotation[]>(`/api/v1/documents/${documentId}/annotations`),
    enabled: !!documentId,
  });

  const addAnnotation = useMutation({
    mutationFn: () =>
      apiPost(`/api/v1/documents/${documentId}/annotations`, { quote: selection, label }),
    onSuccess: () => {
      setSelection("");
      qc.invalidateQueries({ queryKey: ["doc-annotations", documentId] });
    },
  });

  const removeAnnotation = useMutation({
    mutationFn: (annotationId: string) =>
      apiDelete(`/api/v1/documents/${documentId}/annotations/${annotationId}`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["doc-annotations", documentId] }),
  });

  if (!documentId) {
    return (
      <div className="empty-state card" style={{ padding: "2rem" }}>
        <FileSearch size={28} />
        <p>{t("forensic.selectDocument")}</p>
      </div>
    );
  }

  if (isLoading || !data) return <div className="loading">{t("common.loading")}</div>;

  const text = data.extractedText;
  const filtered = search
    ? text.split("\n").filter((line) => line.toLowerCase().includes(search.toLowerCase())).join("\n")
    : text;

  return (
    <div>
      <button type="button" className="secondary" style={{ marginBottom: "1rem" }} onClick={onBack}>
        ← {t("forensic.backToEvidence")}
      </button>
      <div className="card" style={{ marginBottom: "1rem" }}>
        <div className="card-header">
          <span className="card-title">
            <FileSearch size={14} /> {data.document.originalFilename ?? data.document.docType}
          </span>
          {data.downloadUrl && (
            <a href={data.downloadUrl} target="_blank" rel="noreferrer" className="link-btn">
              {t("forensic.downloadOriginal")}
            </a>
          )}
        </div>
        {data.downloadUrl && data.document.mimeType?.includes("pdf") && (
          <iframe
            src={data.downloadUrl}
            title="PDF"
            style={{ width: "100%", height: 400, border: "1px solid #e2e8f0", borderRadius: 8 }}
          />
        )}
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 280px", gap: "1rem" }}>
        <div className="card">
          <div className="card-header">
            <span className="card-title">{t("forensic.extractedText")}</span>
            <input
              type="search"
              placeholder={t("forensic.searchInDoc")}
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              style={{ maxWidth: 200 }}
            />
          </div>
          <pre
            style={{
              whiteSpace: "pre-wrap",
              fontSize: "0.8125rem",
              maxHeight: 480,
              overflow: "auto",
              margin: 0,
              padding: "0.5rem",
              background: "#f8fafc",
              borderRadius: 8,
            }}
            onMouseUp={() => {
              const sel = window.getSelection()?.toString().trim();
              if (sel) setSelection(sel);
            }}
          >
            {filtered || t("forensic.noText")}
          </pre>
          {selection && (
            <div style={{ marginTop: "0.75rem", display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center" }}>
              <select value={label} onChange={(e) => setLabel(e.target.value as typeof label)}>
                {LABELS.map((l) => (
                  <option key={l} value={l}>{l.replace(/_/g, " ")}</option>
                ))}
              </select>
              <button type="button" onClick={() => addAnnotation.mutate()} disabled={addAnnotation.isPending}>
                <Highlighter size={12} /> {t("forensic.addAnnotation")}
              </button>
              <span style={{ fontSize: "0.75rem", color: "#64748b" }}>"{selection.slice(0, 60)}…"</span>
            </div>
          )}
        </div>

        <div className="card">
          <div className="card-header">
            <span className="card-title">{t("forensic.annotations")} ({annotations.length})</span>
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {annotations.map((a) => (
              <div key={a.id} style={{ padding: "0.5rem", background: "#f8fafc", borderRadius: 6, fontSize: "0.8125rem" }}>
                <span className="badge open">{a.label}</span>
                <p style={{ margin: "4px 0" }}>{a.quote.slice(0, 120)}{a.quote.length > 120 ? "…" : ""}</p>
                <button type="button" className="secondary" style={{ fontSize: "0.7rem" }} onClick={() => removeAnnotation.mutate(a.id)}>
                  Remove
                </button>
              </div>
            ))}
            {annotations.length === 0 && <p style={{ color: "#64748b", fontSize: "0.875rem" }}>{t("forensic.noAnnotations")}</p>}
          </div>
        </div>
      </div>
    </div>
  );
}
