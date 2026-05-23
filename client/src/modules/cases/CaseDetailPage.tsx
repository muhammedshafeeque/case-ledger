import { useState } from "react";
import { useParams, Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiGet, apiPatch } from "../../api/client";
import { LookupPanel } from "../lookup/LookupPanel";
import type { CaseDetail } from "./types";
import { DocumentsTab } from "./tabs/DocumentsTab";
import { FactsTab } from "./tabs/FactsTab";
import { NotesTab } from "./tabs/NotesTab";
import { TasksTab } from "./tabs/TasksTab";
import { LinksTab } from "./tabs/LinksTab";
import { PersonsTab } from "./tabs/PersonsTab";
import { CaseAiTab } from "./tabs/CaseAiTab";
import { ForensicLabTab } from "./tabs/forensic/ForensicLabTab";
import { DiaryTab } from "./tabs/DiaryTab";
import { SourceVaultTab } from "./tabs/SourceVaultTab";
import { StoryTab } from "./tabs/StoryTab";
import {
  AlertTriangle,
  FileText,
  Scale,
  CheckCircle2,
  ExternalLink,
  GitMerge,
  ListChecks,
  StickyNote,
  CheckSquare,
  Link2,
  Search,
  Bot,
  LayoutGrid,
  Users,
  FlaskConical,
  BookOpen,
  Lock,
  NotebookPen,
  ArrowLeft,
  Clock,
  Building2,
  Flag,
} from "lucide-react";

/* ── Tab definition ──────────────────────────────────────────── */
const BASE_TABS = [
  { id: "overview",  icon: LayoutGrid,   key: "tabs.overview" },
  { id: "persons",   icon: Users,        key: "tabs.persons" },
  { id: "forensic",  icon: FlaskConical, key: "tabs.forensic" },
  { id: "diary",     icon: NotebookPen,  key: "tabs.diary", roles: ["admin", "investigator", "analyst", "legal"] as const },
  { id: "documents", icon: FileText,     key: "tabs.documents" },
  { id: "facts",     icon: ListChecks,   key: "tabs.facts" },
  { id: "notes",     icon: StickyNote,   key: "tabs.notes" },
  { id: "tasks",     icon: CheckSquare,  key: "tabs.tasks" },
  { id: "links",     icon: Link2,        key: "tabs.links" },
  { id: "story",     icon: BookOpen,     key: "tabs.story", roles: ["admin", "journalist", "legal"] as const },
  { id: "sources",   icon: Lock,         key: "tabs.sources", roles: ["admin", "journalist", "legal"] as const },
  { id: "lookup",    icon: Search,       key: "tabs.lookup" },
  { id: "ai",        icon: Bot,          key: "tabs.ai" },
] as const;

type TabId = (typeof BASE_TABS)[number]["id"];

/* ── Risk Ring ───────────────────────────────────────────────── */
function RiskRing({ score }: { score: number }) {
  const r = 38;
  const sz = 104;
  const cx = sz / 2;
  const circumference = 2 * Math.PI * r;
  const pct = Math.min(Math.max(score, 0), 100);
  const filled = (pct / 100) * circumference;

  const color = score >= 70 ? "#e11d48" : score >= 40 ? "#d97706" : "#10b981";
  const tier  = score >= 70 ? "High Risk" : score >= 40 ? "Medium Risk" : "Low Risk";
  const pillStyle: React.CSSProperties = {
    background: score >= 70 ? "var(--rose-50)" : score >= 40 ? "var(--amber-50)" : "var(--emerald-50)",
    color,
  };

  return (
    <div className="risk-widget">
      <div className="risk-widget-label">Corruption Risk Score</div>

      <div style={{ position: "relative", width: sz, height: sz }}>
        <svg width={sz} height={sz} viewBox={`0 0 ${sz} ${sz}`}>
          <circle
            cx={cx} cy={cx} r={r} fill="none"
            stroke="var(--slate-100)" strokeWidth={9} strokeLinecap="round"
          />
          <circle
            cx={cx} cy={cx} r={r} fill="none"
            stroke={color} strokeWidth={9}
            strokeDasharray={`${filled} ${circumference - filled}`}
            strokeLinecap="round"
            transform={`rotate(-90 ${cx} ${cx})`}
            style={{ transition: "stroke-dasharray 0.5s ease" }}
          />
        </svg>
        <div style={{
          position: "absolute", inset: 0,
          display: "flex", flexDirection: "column",
          alignItems: "center", justifyContent: "center",
        }}>
          <span style={{ fontSize: 26, fontWeight: 800, color, lineHeight: 1, letterSpacing: "-0.04em" }}>
            {score}
          </span>
          <span style={{ fontSize: 9, color: "var(--slate-400)", fontWeight: 600, letterSpacing: "0.05em" }}>
            / 100
          </span>
        </div>
      </div>

      <div className="risk-tier-pill" style={pillStyle}>
        {tier}
      </div>
    </div>
  );
}

/* ── Main component ──────────────────────────────────────────── */
export function CaseDetailPage() {
  const { t } = useTranslation();
  const { id } = useParams<{ id: string }>();
  const qc = useQueryClient();
  const [tab, setTab] = useState<TabId>("overview");

  const userRole = (() => {
    try {
      const raw = localStorage.getItem("user");
      return raw ? (JSON.parse(raw) as { role?: string }).role : undefined;
    } catch {
      return undefined;
    }
  })();

  const visibleTabs = BASE_TABS.filter((tb) => {
    if (!("roles" in tb) || !tb.roles) return true;
    return userRole && (tb.roles as readonly string[]).includes(userRole);
  });

  const { data: caseData, isLoading } = useQuery({
    queryKey: ["case", id],
    queryFn: () => apiGet<CaseDetail>(`/api/v1/cases/${id}`),
    enabled: !!id,
  });

  const { data: penalty } = useQuery({
    queryKey: ["penalty", id],
    queryFn: () => apiGet<Record<string, unknown>>(`/api/v1/legal/penalty/${id}`),
    enabled: !!id && caseData?.investigationType === "rti",
  });

  const { data: contradictions } = useQuery({
    queryKey: ["contradictions", id],
    queryFn: () =>
      apiGet<Array<{ id: string; description: string; status: string }>>(
        `/api/v1/contradictions?limit=50&caseId=${id}`
      ),
    enabled: !!id,
  });

  const confirmContradiction = useMutation({
    mutationFn: (contradictionId: string) =>
      apiPatch(`/api/v1/contradictions/${contradictionId}`, { status: "confirmed" }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["contradictions", id] }),
  });

  if (isLoading || !caseData || !id) {
    return <div className="loading">{t("common.loading")}</div>;
  }

  const status = caseData.status;
  const caseContradictions = contradictions ?? [];

  return (
    <div>
      {/* Breadcrumb */}
      <nav className="breadcrumb">
        <Link to="/cases" className="back-link">
          <ArrowLeft size={13} />
          Investigations
        </Link>
      </nav>

      {/* ── Hero header ── */}
      <div className="case-hero">
        <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 16, flexWrap: "wrap" }}>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div className="case-hero-meta">
              <span className="case-id-chip">{caseData.rtiId}</span>
              <span className="badge info">{caseData.investigationType}</span>
              <span className={`badge ${status}`}>{status}</span>
            </div>

            <h1 className="case-hero-title">{caseData.title}</h1>

            <div className="case-hero-attrs">
              <span className="case-hero-attr">
                <Clock size={12} />
                Due <strong>{caseData.dueDate}</strong>
              </span>
              <span className="hero-sep" />
              <span className="case-hero-attr">
                <Flag size={12} />
                Priority <strong style={{ textTransform: "capitalize" }}>{caseData.priority}</strong>
              </span>
              {caseData.department && (
                <>
                  <span className="hero-sep" />
                  <span className="case-hero-attr">
                    <Building2 size={12} />
                    <strong>{caseData.department}</strong>
                  </span>
                </>
              )}
            </div>
          </div>

          <a
            href={`${import.meta.env.VITE_API_URL}/api/v1/cases/${id}/evidence-package`}
            target="_blank"
            rel="noreferrer"
            className="link-btn"
            style={{ flexShrink: 0 }}
          >
            <ExternalLink size={12} />
            {t("case.evidencePackage")}
          </a>
        </div>
      </div>

      {/* ── Tab bar ── */}
      <div className="tabs-bar">
        {visibleTabs.map(({ id: tabId, icon: Icon, key }) => (
          <button
            key={tabId}
            type="button"
            className={`tab-btn${tab === tabId ? " t-active" : ""}`}
            onClick={() => setTab(tabId)}
          >
            <Icon size={13} />
            {t(key)}
          </button>
        ))}
      </div>

      {/* ── Tab content ── */}

      {tab === "overview" && (
        <div className="overview-grid">

          {/* Main column */}
          <div className="main-col">

            {/* Investigation details */}
            <div className="card" style={{ padding: 0 }}>
              <div className="card-header">
                <span className="card-title">
                  <FileText size={13} />
                  {t("case.investigationDetails") ?? "Investigation details"}
                </span>
              </div>
              <div className="detail-grid">
                <div className="detail-field">
                  <div className="detail-label">{t("caseCreate.fieldType")}</div>
                  <span className="badge info">{caseData.investigationType}</span>
                </div>
                <div className="detail-field">
                  <div className="detail-label">{t("case.status")}</div>
                  <span className={`badge ${status}`}>{status}</span>
                </div>
                <div className="detail-field">
                  <div className="detail-label">{t("caseCreate.fieldStarted")}</div>
                  <div className="detail-value">{caseData.filedDate}</div>
                </div>
                <div className="detail-field">
                  <div className="detail-label">{t("cases.due")}</div>
                  <div className="detail-value">{caseData.dueDate}</div>
                </div>
                <div className="detail-field">
                  <div className="detail-label">Department</div>
                  <div className={`detail-value${!caseData.department ? " dim" : ""}`}>
                    {caseData.department || "—"}
                  </div>
                </div>
                <div className="detail-field">
                  <div className="detail-label">PIO Officer</div>
                  <div className={`detail-value${!caseData.pioOfficer ? " dim" : ""}`}>
                    {caseData.pioOfficer || "—"}
                  </div>
                </div>
              </div>

              {/* Penalty (inside same card, below grid) */}
              {penalty && (
                <div className="penalty-banner">
                  <Scale size={16} color="var(--rose-600)" style={{ flexShrink: 0 }} />
                  <div>
                    <div className="penalty-label">{t("case.penalty")}</div>
                    <div className="penalty-amount">₹ {String(penalty.totalPenalty)}</div>
                  </div>
                </div>
              )}
            </div>

            {/* Contradictions / Findings */}
            {caseContradictions.length > 0 && (
              <div className="card" style={{ padding: 0 }}>
                <div className="card-header">
                  <span className="card-title">
                    <GitMerge size={13} />
                    {t("case.contradictions")}
                  </span>
                  <span className="badge info">{caseContradictions.length}</span>
                </div>
                <div className="contradiction-list">
                  {caseContradictions.map((c) => {
                    const confirmed = c.status === "confirmed" || c.status === "published";
                    return (
                      <div key={c.id} className={`contradiction-item${confirmed ? " confirmed" : ""}`}>
                        <p className="contradiction-desc">{c.description}</p>
                        {confirmed ? (
                          <span style={{ display: "flex", alignItems: "center", gap: 4, color: "var(--emerald-700)", fontSize: "0.75rem", fontWeight: 600, flexShrink: 0 }}>
                            <CheckCircle2 size={13} />
                            {t("case.confirmed")}
                          </span>
                        ) : (
                          <button
                            className="secondary"
                            style={{ fontSize: "0.75rem", flexShrink: 0 }}
                            onClick={() => confirmContradiction.mutate(c.id)}
                          >
                            {t("case.confirmFinding")}
                          </button>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>

          {/* Sidebar column */}
          <div className="side-col">

            {/* Risk ring */}
            <div className="card" style={{ padding: 0 }}>
              <RiskRing score={caseData.corruptionScore} />
            </div>

            {/* Alerts */}
            {caseData.alerts.length > 0 && (
              <div className="card" style={{ padding: 0 }}>
                <div className="card-header">
                  <span className="card-title">
                    <AlertTriangle size={13} />
                    {t("nav.alerts")}
                  </span>
                  <span className="badge high">{caseData.alerts.length}</span>
                </div>
                <div className="alert-list">
                  {caseData.alerts.map((a, i) => (
                    <div key={i} className={`alert-item ${a.severity}`}>
                      <span className={`badge ${a.severity}`}>{a.severity}</span>
                      <p className="alert-item-title">{a.title}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {tab === "persons"   && <PersonsTab   caseId={id} persons={caseData.entities ?? []} />}
      {tab === "forensic"  && <ForensicLabTab caseId={id} />}
      {tab === "diary"     && <DiaryTab caseId={id} />}
      {tab === "story"     && <StoryTab caseId={id} />}
      {tab === "sources"   && <SourceVaultTab caseId={id} />}
      {tab === "documents" && <DocumentsTab  caseId={id} caseRef={caseData.rtiId} documents={caseData.documents ?? []} />}
      {tab === "facts"     && <FactsTab      caseId={id} facts={caseData.facts ?? []} />}
      {tab === "notes"     && <NotesTab      caseId={id} notes={caseData.notes ?? []} />}
      {tab === "tasks"     && <TasksTab      caseId={id} tasks={caseData.tasks ?? []} />}
      {tab === "links"     && <LinksTab      caseId={id} links={caseData.links ?? []} />}
      {tab === "lookup"    && <LookupPanel   caseId={id} />}
      {tab === "ai"        && <CaseAiTab     caseId={id} />}
    </div>
  );
}
