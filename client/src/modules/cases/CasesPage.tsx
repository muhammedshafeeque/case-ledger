import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Link, useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { apiGet, apiPost } from "../../api/client";
import { Plus, FolderOpen, AlertCircle, Clock, ChevronRight } from "lucide-react";
import { CreateCaseModal, type CreateCaseForm } from "./CreateCaseModal";

type RtiCase = {
  id: string;
  rtiId: string;
  investigationType: string;
  title: string;
  status: string;
  priority: string;
  corruptionScore: number;
  dueDate: string;
};

function ScoreBadge({ score }: { score: number }) {
  const cls = score >= 70 ? "critical" : score >= 40 ? "high" : "low";
  return <span className={`badge ${cls}`}>{score}</span>;
}

function StatusBadge({ status }: { status: string }) {
  const cls =
    status === "open" ? "open" :
    status === "closed" ? "closed" :
    status === "resolved" ? "resolved" : "pending";
  return <span className={`badge ${cls}`}>{status}</span>;
}

export function CasesPage() {
  const { t } = useTranslation();
  const qc = useQueryClient();
  const navigate = useNavigate();
  const [modalOpen, setModalOpen] = useState(false);
  const [createError, setCreateError] = useState<string | null>(null);

  const { data, isLoading } = useQuery({
    queryKey: ["cases"],
    queryFn: () => apiGet<RtiCase[]>("/api/v1/cases?limit=100"),
  });

  const createMutation = useMutation({
    mutationFn: (form: CreateCaseForm) =>
      apiPost<RtiCase>("/api/v1/cases", {
        investigationType: form.investigationType,
        title: form.title,
        priority: form.priority,
        filedDate: form.filedDate,
        isSensitive: form.isSensitive,
        crimeNumber: form.crimeNumber,
        firNumber: form.firNumber,
        station: form.station,
      }),
    onSuccess: (created) => {
      setCreateError(null);
      setModalOpen(false);
      qc.invalidateQueries({ queryKey: ["cases"] });
      navigate(`/cases/${created.id}`);
    },
    onError: (err: Error) => {
      setCreateError(err.message);
    },
  });

  const cases = data ?? [];
  const openCount = cases.filter((c) => c.status === "open" || c.status === "pending" || c.status === "submitted").length;
  const highRisk = cases.filter((c) => c.corruptionScore >= 70).length;

  if (isLoading) {
    return <div className="loading"><FolderOpen size={16} /> Loading cases…</div>;
  }

  return (
    <div>
      <CreateCaseModal
        open={modalOpen}
        onClose={() => {
          setModalOpen(false);
          setCreateError(null);
        }}
        onSubmit={(form) => createMutation.mutate(form)}
        isPending={createMutation.isPending}
        error={createError}
      />

      <div className="page-header">
        <div>
          <h1 className="page-title">{t("nav.cases")}</h1>
          <p className="page-subtitle">{cases.length} total investigations</p>
        </div>
        <button type="button" onClick={() => setModalOpen(true)}>
          <Plus size={14} />
          {t("cases.new")}
        </button>
      </div>

      <div className="stat-grid">
        <div className="stat-card">
          <div className="stat-icon" style={{ background: "#eef2ff" }}>
            <FolderOpen size={17} color="#4f46e5" />
          </div>
          <div className="stat-label">Total Cases</div>
          <div className="stat-value">{cases.length}</div>
        </div>
        <div className="stat-card">
          <div className="stat-icon" style={{ background: "#ecfdf5" }}>
            <Clock size={17} color="#10b981" />
          </div>
          <div className="stat-label">Open</div>
          <div className="stat-value">{openCount}</div>
        </div>
        <div className="stat-card">
          <div className="stat-icon" style={{ background: "#fff1f2" }}>
            <AlertCircle size={17} color="#e11d48" />
          </div>
          <div className="stat-label">High Risk</div>
          <div className="stat-value">{highRisk}</div>
        </div>
      </div>

      <div className="card" style={{ padding: 0, overflow: "hidden" }}>
        <div className="card-header">
          <span className="card-title">
            <FolderOpen size={14} />
            All Investigations
          </span>
        </div>

        {cases.length === 0 ? (
          <div className="empty-state">
            <FolderOpen size={32} />
            <h3>No cases yet</h3>
            <p>Create your first investigation to get started</p>
            <button type="button" onClick={() => setModalOpen(true)} style={{ marginTop: "1rem" }}>
              <Plus size={14} />
              {t("cases.new")}
            </button>
          </div>
        ) : (
          <table>
            <thead>
              <tr>
                <th>{t("cases.refId")}</th>
                <th>{t("cases.title")}</th>
                <th>{t("caseCreate.fieldType")}</th>
                <th>{t("cases.status")}</th>
                <th>{t("cases.score")}</th>
                <th>{t("cases.due")}</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {cases.map((c) => (
                <tr key={c.id}>
                  <td>
                    <Link
                      to={`/cases/${c.id}`}
                      style={{ fontWeight: 700, color: "#4f46e5", fontSize: "0.8125rem", letterSpacing: "0.01em" }}
                    >
                      {c.rtiId}
                    </Link>
                  </td>
                  <td style={{ fontWeight: 500, maxWidth: 280 }}>
                    <span style={{ display: "-webkit-box", WebkitLineClamp: 1, WebkitBoxOrient: "vertical", overflow: "hidden" }}>
                      {c.title}
                    </span>
                  </td>
                  <td><span className="badge open">{c.investigationType}</span></td>
                  <td><StatusBadge status={c.status} /></td>
                  <td><ScoreBadge score={c.corruptionScore} /></td>
                  <td style={{ color: "#64748b", fontSize: "0.8125rem", whiteSpace: "nowrap" }}>{c.dueDate}</td>
                  <td style={{ width: 32 }}>
                    <Link to={`/cases/${c.id}`} className="btn-ghost" style={{ display: "inline-flex", alignItems: "center", padding: "0.25rem" }}>
                      <ChevronRight size={14} color="#94a3b8" />
                    </Link>
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
