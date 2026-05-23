import { useState } from "react";
import { useTranslation } from "react-i18next";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiGet, apiPost } from "../../api/client";
import { Search, ExternalLink, CheckCircle2, ArrowLeft, History, ChevronRight, AlertCircle } from "lucide-react";

type LookupSource = "mca21" | "eproc" | "ecourts" | "cag";

type PreviewResult = {
  confirmationToken: string;
  url: string;
  description: string;
  summary: string;
  disclaimer: string;
  fieldSchema: Array<{ key: string; label: string }>;
};

type ExecuteResult = {
  logId: string | null;
  data: { results: Record<string, unknown>[] };
  fetchMode: string;
  pasteRequired?: boolean;
  confirmationToken?: string;
  message?: string;
};

type LookupLog = {
  id: string;
  source: string;
  decision: string;
  createdAt: string;
};

const SOURCES: { id: LookupSource; label: string }[] = [
  { id: "eproc",   label: "eProcurement" },
  { id: "ecourts", label: "eCourts" },
  { id: "cag",     label: "CAG Reports" },
  { id: "mca21",   label: "MCA21" },
];

export function LookupPanel({ caseId }: { caseId: string }) {
  const { t } = useTranslation();
  const qc = useQueryClient();
  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [source, setSource] = useState<LookupSource>("eproc");
  const [query, setQuery] = useState<Record<string, string>>({ keyword: "" });
  const [preview, setPreview] = useState<PreviewResult | null>(null);
  const [executeResult, setExecuteResult] = useState<ExecuteResult | null>(null);
  const [token, setToken] = useState("");
  const [pasteJson, setPasteJson] = useState("");
  const [selectedIndices, setSelectedIndices] = useState<Set<number>>(new Set());
  const [error, setError] = useState("");

  const { data: logs } = useQuery({
    queryKey: ["lookup-log", caseId],
    queryFn: () => apiGet<LookupLog[]>(`/api/v1/lookup/log?caseId=${caseId}`),
  });

  const previewMutation = useMutation({
    mutationFn: () => {
      const q: Record<string, unknown> = {};
      for (const [k, v] of Object.entries(query)) {
        if (v.trim()) q[k] = k === "reportYear" ? Number(v) : v.trim();
      }
      return apiPost<PreviewResult>("/api/v1/lookup/preview", { source, query: q, caseId });
    },
    onSuccess: (data) => {
      setPreview(data);
      setToken(data.confirmationToken);
      setStep(2);
      setError("");
    },
    onError: (e: Error) => setError(e.message),
  });

  const executeMutation = useMutation({
    mutationFn: (body: { confirmationToken: string; pastedData?: unknown }) =>
      apiPost<ExecuteResult>("/api/v1/lookup/execute", body),
    onSuccess: (data) => {
      setExecuteResult(data);
      if (data.pasteRequired && !data.logId) {
        setToken(data.confirmationToken ?? token);
        setError("");
        return;
      }
      if (data.logId) {
        setStep(3);
        const indices = new Set(data.data.results.map((_, i) => i));
        setSelectedIndices(indices);
        qc.invalidateQueries({ queryKey: ["lookup-log", caseId] });
      }
      setError("");
    },
    onError: (e: Error) => setError(e.message),
  });

  const commitMutation = useMutation({
    mutationFn: () => {
      if (!executeResult?.logId) throw new Error("No log to commit");
      return apiPost("/api/v1/lookup/commit", {
        logId: executeResult.logId,
        selectedFields: { resultIndices: [...selectedIndices] },
      });
    },
    onSuccess: () => {
      setStep(1);
      setPreview(null);
      setExecuteResult(null);
      setPasteJson("");
      qc.invalidateQueries({ queryKey: ["case", caseId] });
      qc.invalidateQueries({ queryKey: ["lookup-log", caseId] });
    },
    onError: (e: Error) => setError(e.message),
  });

  function renderQueryFields() {
    switch (source) {
      case "mca21":
        return (
          <>
            <div className="form-group">
              <label>{t("lookup.cin")}</label>
              <input value={query.cin ?? ""} onChange={(e) => setQuery({ ...query, cin: e.target.value })} placeholder="U12345MH2023PTC..." />
            </div>
            <div className="form-group">
              <label>{t("lookup.companyName")}</label>
              <input value={query.companyName ?? ""} onChange={(e) => setQuery({ ...query, companyName: e.target.value })} placeholder="Company name..." />
            </div>
          </>
        );
      case "eproc":
        return (
          <>
            <div className="form-group">
              <label>{t("lookup.tenderId")}</label>
              <input value={query.tenderId ?? ""} onChange={(e) => setQuery({ ...query, tenderId: e.target.value })} placeholder="Tender ID..." />
            </div>
            <div className="form-group">
              <label>{t("lookup.keyword")}</label>
              <input value={query.keyword ?? ""} onChange={(e) => setQuery({ ...query, keyword: e.target.value })} placeholder="Search keyword..." />
            </div>
          </>
        );
      case "ecourts":
        return (
          <div className="form-group">
            <label>{t("lookup.caseNumber")}</label>
            <input value={query.caseNumber ?? ""} onChange={(e) => setQuery({ ...query, caseNumber: e.target.value })} required placeholder="Case number..." />
          </div>
        );
      case "cag":
        return (
          <>
            <div className="form-group">
              <label>{t("lookup.reportYear")}</label>
              <input value={query.reportYear ?? ""} onChange={(e) => setQuery({ ...query, reportYear: e.target.value })} placeholder="2023" type="number" />
            </div>
            <div className="form-group">
              <label>{t("lookup.keyword")}</label>
              <input value={query.keyword ?? ""} onChange={(e) => setQuery({ ...query, keyword: e.target.value })} placeholder="Search keyword..." />
            </div>
          </>
        );
    }
  }

  function submitPaste() {
    try {
      const parsed = JSON.parse(pasteJson) as unknown;
      executeMutation.mutate({ confirmationToken: token, pastedData: parsed });
    } catch {
      setError(t("lookup.invalidJson"));
    }
  }

  function reset() {
    setStep(1);
    setPreview(null);
    setExecuteResult(null);
    setPasteJson("");
    setError("");
  }

  const results = executeResult?.data.results ?? [];

  return (
    <div className="card">
      {/* Header */}
      <div style={{ marginBottom: "1.25rem" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 4 }}>
          <Search size={15} color="#4f46e5" />
          <span style={{ fontWeight: 700, fontSize: "0.9375rem" }}>{t("lookup.title")}</span>
        </div>
        <p style={{ fontSize: "0.8125rem", color: "#64748b" }}>{t("lookup.subtitle")}</p>
      </div>

      {/* Step indicator */}
      <div className="steps">
        {[
          { n: 1, label: "Configure" },
          { n: 2, label: "Preview" },
          { n: 3, label: "Review" },
        ].map(({ n, label }, i, arr) => (
          <>
            <div key={n} className={`step ${step === n ? "active" : step > n ? "done" : ""}`}>
              <div className="step-num">
                {step > n ? <CheckCircle2 size={11} /> : n}
              </div>
              {label}
            </div>
            {i < arr.length - 1 && <div key={`line-${n}`} className="step-line" />}
          </>
        ))}
      </div>

      {/* Step 1 — Configure */}
      {step === 1 && (
        <div>
          <div style={{ marginBottom: "1rem" }}>
            <label style={{ marginBottom: "0.5rem" }}>{t("lookup.source")}</label>
            <div className="source-pills">
              {SOURCES.map((s) => (
                <button
                  key={s.id}
                  type="button"
                  className={`source-pill${source === s.id ? " active" : ""}`}
                  onClick={() => setSource(s.id)}
                >
                  {s.label}
                </button>
              ))}
            </div>
          </div>

          <div>{renderQueryFields()}</div>

          <button onClick={() => previewMutation.mutate()} disabled={previewMutation.isPending}>
            <Search size={13} />
            {previewMutation.isPending ? "Loading…" : t("lookup.preview")}
          </button>
        </div>
      )}

      {/* Step 2 — Preview / confirm */}
      {step === 2 && preview && (
        <div>
          <div style={{
            background: "#f8fafc", border: "1px solid #e2e8f0",
            borderRadius: 8, padding: "0.875rem", marginBottom: "1rem",
          }}>
            <p style={{ fontWeight: 600, marginBottom: 4, fontSize: "0.875rem" }}>{preview.description}</p>
            <p style={{ fontSize: "0.8125rem", color: "#64748b", marginBottom: 8 }}>{preview.summary}</p>
            <a
              href={preview.url}
              target="_blank"
              rel="noreferrer"
              style={{ display: "inline-flex", alignItems: "center", gap: 4, fontSize: "0.8125rem", color: "#4f46e5" }}
            >
              <ExternalLink size={11} />
              {preview.url}
            </a>
          </div>

          {preview.disclaimer && (
            <div className="notice warning" style={{ marginBottom: "1rem" }}>
              <AlertCircle size={13} style={{ flexShrink: 0, marginTop: 1 }} />
              {preview.disclaimer}
            </div>
          )}

          {!executeResult?.pasteRequired ? (
            <div style={{ display: "flex", gap: 8 }}>
              <button
                onClick={() => executeMutation.mutate({ confirmationToken: token })}
                disabled={executeMutation.isPending}
              >
                <ChevronRight size={13} />
                {executeMutation.isPending ? "Fetching…" : t("lookup.confirmFetch")}
              </button>
              <button className="secondary" onClick={reset}>
                <ArrowLeft size={13} />
                {t("lookup.back")}
              </button>
            </div>
          ) : (
            <div>
              <div className="notice info" style={{ marginBottom: "0.75rem" }}>
                {executeResult.message}
              </div>
              <div className="form-group">
                <label>Paste JSON data</label>
                <textarea
                  value={pasteJson}
                  onChange={(e) => setPasteJson(e.target.value)}
                  rows={6}
                  style={{ fontFamily: "monospace", fontSize: "0.8125rem", resize: "vertical" }}
                  placeholder='[{"title":"..."}]'
                />
              </div>
              <div style={{ display: "flex", gap: 8 }}>
                <button onClick={submitPaste} disabled={executeMutation.isPending || !pasteJson.trim()}>
                  {t("lookup.submitPaste")}
                </button>
                <button className="secondary" onClick={reset}>
                  <ArrowLeft size={13} />
                  {t("lookup.back")}
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Step 3 — Review results */}
      {step === 3 && executeResult?.logId && (
        <div>
          <p style={{ fontSize: "0.8125rem", color: "#64748b", marginBottom: "0.875rem" }}>
            {t("lookup.reviewHint")} · <span style={{ fontWeight: 600, color: "#4f46e5" }}>{executeResult.fetchMode}</span>
          </p>

          <div style={{ display: "flex", flexDirection: "column", gap: 6, marginBottom: "1rem" }}>
            {results.map((row, i) => (
              <label key={i} style={{
                display: "flex", alignItems: "flex-start", gap: 10,
                padding: "0.625rem 0.75rem",
                background: selectedIndices.has(i) ? "#eef2ff" : "#f8fafc",
                border: `1px solid ${selectedIndices.has(i) ? "#c7d2fe" : "#e2e8f0"}`,
                borderRadius: 8,
                cursor: "pointer",
                transition: "background 0.1s",
              }}>
                <input
                  type="checkbox"
                  checked={selectedIndices.has(i)}
                  onChange={(e) => {
                    const next = new Set(selectedIndices);
                    if (e.target.checked) next.add(i); else next.delete(i);
                    setSelectedIndices(next);
                  }}
                  style={{ width: "auto", marginTop: 2, cursor: "pointer" }}
                />
                <code style={{ fontSize: "0.75rem", lineHeight: 1.5, wordBreak: "break-all" }}>
                  {JSON.stringify(row).slice(0, 140)}{JSON.stringify(row).length > 140 ? "…" : ""}
                </code>
              </label>
            ))}
          </div>

          <div style={{ display: "flex", gap: 8 }}>
            <button
              onClick={() => commitMutation.mutate()}
              disabled={commitMutation.isPending || selectedIndices.size === 0}
            >
              <CheckCircle2 size={13} />
              {commitMutation.isPending ? "Committing…" : t("lookup.commit")} ({selectedIndices.size})
            </button>
            <button className="secondary" onClick={reset}>
              <ArrowLeft size={13} />
              {t("lookup.cancel")}
            </button>
          </div>
        </div>
      )}

      {/* Error */}
      {error && (
        <div className="notice error" style={{ marginTop: "0.875rem" }}>
          <AlertCircle size={13} style={{ flexShrink: 0 }} />
          {error}
        </div>
      )}

      {/* History */}
      {logs && logs.length > 0 && (
        <div style={{ marginTop: "1.25rem", paddingTop: "1.25rem", borderTop: "1px solid #e2e8f0" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 5, marginBottom: "0.625rem" }}>
            <History size={13} color="#64748b" />
            <span style={{ fontSize: "0.8125rem", fontWeight: 600, color: "#475569" }}>{t("lookup.history")}</span>
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
            {logs.map((l) => (
              <div key={l.id} style={{
                display: "flex", alignItems: "center", justifyContent: "space-between",
                padding: "0.375rem 0.625rem",
                background: "#f8fafc", border: "1px solid #e2e8f0",
                borderRadius: 6, fontSize: "0.8rem",
              }}>
                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <span style={{ fontWeight: 600, color: "#4f46e5" }}>{l.source}</span>
                  <span className={`badge ${l.decision === "approved" ? "resolved" : "closed"}`}>{l.decision}</span>
                </div>
                <span style={{ color: "#94a3b8", fontSize: "0.75rem" }}>
                  {new Date(l.createdAt).toLocaleString()}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
