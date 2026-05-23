import { useState } from "react";
import { useTranslation } from "react-i18next";
import { Shield, Clock, Network, BarChart3, FileDown, FileSearch, MapPin } from "lucide-react";
import { MapTab } from "./MapTab";
import { EvidenceLockerTab } from "./EvidenceLockerTab";
import { DocumentExaminerTab } from "./DocumentExaminerTab";
import { TimelineTab } from "./TimelineTab";
import { NetworkTab } from "./NetworkTab";
import { AnalysisTab } from "./AnalysisTab";
import { ReportTab } from "./ReportTab";

const SUB_TABS = [
  { id: "evidence", icon: Shield, key: "forensic.evidence" },
  { id: "examiner", icon: FileSearch, key: "forensic.examiner" },
  { id: "timeline", icon: Clock, key: "forensic.timeline" },
  { id: "network", icon: Network, key: "forensic.network" },
  { id: "analysis", icon: BarChart3, key: "forensic.analysis" },
  { id: "report", icon: FileDown, key: "forensic.report" },
  { id: "map", icon: MapPin, key: "forensic.map" },
] as const;

type SubTabId = (typeof SUB_TABS)[number]["id"];

type Props = { caseId: string };

export function ForensicLabTab({ caseId }: Props) {
  const { t } = useTranslation();
  const [subTab, setSubTab] = useState<SubTabId>("evidence");
  const [examinerDocId, setExaminerDocId] = useState<string | null>(null);

  return (
    <div>
      <div style={{
        display: "flex",
        gap: 4,
        flexWrap: "wrap",
        marginBottom: "1rem",
        borderBottom: "1px solid #e2e8f0",
      }}>
        {SUB_TABS.map(({ id, icon: Icon, key }) => (
          <button
            key={id}
            type="button"
            onClick={() => setSubTab(id)}
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: 6,
              padding: "0.4rem 0.75rem",
              border: "none",
              borderBottom: subTab === id ? "2px solid #4f46e5" : "2px solid transparent",
              background: "transparent",
              color: subTab === id ? "#4f46e5" : "#64748b",
              fontWeight: subTab === id ? 600 : 500,
              fontSize: "0.8125rem",
              cursor: "pointer",
            }}
          >
            <Icon size={13} />
            {t(key)}
          </button>
        ))}
      </div>

      {subTab === "evidence" && (
        <EvidenceLockerTab
          caseId={caseId}
          onOpenExaminer={(docId) => {
            setExaminerDocId(docId);
            setSubTab("examiner");
          }}
        />
      )}
      {subTab === "examiner" && (
        <DocumentExaminerTab
          documentId={examinerDocId}
          onBack={() => {
            setExaminerDocId(null);
            setSubTab("evidence");
          }}
        />
      )}
      {subTab === "timeline" && <TimelineTab caseId={caseId} />}
      {subTab === "network" && <NetworkTab caseId={caseId} />}
      {subTab === "analysis" && <AnalysisTab caseId={caseId} />}
      {subTab === "report" && <ReportTab caseId={caseId} />}
      {subTab === "map" && <MapTab caseId={caseId} />}
    </div>
  );
}
