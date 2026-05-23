import { useState } from "react";
import { useTranslation } from "react-i18next";
import { FileDown, ExternalLink } from "lucide-react";

const API_URL = import.meta.env.VITE_API_URL ?? "http://localhost:3001";

type ExportProfile = "full" | "redacted" | "publishable";

type Props = { caseId: string };

export function ReportTab({ caseId }: Props) {
  const { t } = useTranslation();
  const [includeTimeline, setIncludeTimeline] = useState(true);
  const [includeCustody, setIncludeCustody] = useState(true);
  const [profile, setProfile] = useState<ExportProfile>("full");

  const token = localStorage.getItem("accessToken");
  const qs = `profile=${profile}`;
  const htmlUrl = `${API_URL}/api/v1/cases/${caseId}/forensic/report.html?${qs}`;
  const zipUrl = `${API_URL}/api/v1/cases/${caseId}/forensic/report.zip?${qs}`;
  const pdfUrl = `${API_URL}/api/v1/cases/${caseId}/forensic/report.pdf?${qs}`;

  const downloadBlob = async (url: string, filename: string) => {
    const res = await fetch(url, {
      headers: token ? { Authorization: `Bearer ${token}` } : {},
    });
    if (!res.ok) throw new Error("Download failed");
    const blob = await res.blob();
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = filename;
    a.click();
  };

  return (
    <div className="card">
      <div className="card-header">
        <span className="card-title"><FileDown size={14} /> {t("forensic.reportBuilder")}</span>
      </div>
      <div className="form-stack" style={{ padding: "0 0.25rem" }}>
        <p style={{ fontSize: "0.875rem", color: "#64748b", margin: 0 }}>{t("forensic.reportHint")}</p>
        <div className="form-field">
          <label>{t("forensic.exportProfile")}</label>
          <select value={profile} onChange={(e) => setProfile(e.target.value as ExportProfile)}>
            <option value="full">{t("forensic.profileFull")}</option>
            <option value="redacted">{t("forensic.profileRedacted")}</option>
            <option value="publishable">{t("forensic.profilePublishable")}</option>
          </select>
        </div>
        <label style={{ display: "flex", alignItems: "center", gap: 8, fontSize: "0.875rem" }}>
          <input type="checkbox" checked={includeTimeline} onChange={(e) => setIncludeTimeline(e.target.checked)} />
          {t("forensic.includeTimeline")}
        </label>
        <label style={{ display: "flex", alignItems: "center", gap: 8, fontSize: "0.875rem" }}>
          <input type="checkbox" checked={includeCustody} onChange={(e) => setIncludeCustody(e.target.checked)} />
          {t("forensic.includeCustody")}
        </label>
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
          <a
            href={htmlUrl}
            target="_blank"
            rel="noreferrer"
            className="link-btn"
            onClick={(e) => {
              if (token) {
                e.preventDefault();
                fetch(htmlUrl, { headers: { Authorization: `Bearer ${token}` } })
                  .then((r) => r.text())
                  .then((html) => {
                    const w = window.open();
                    if (w) {
                      w.document.write(html);
                      w.document.close();
                    }
                  });
              }
            }}
          >
            <ExternalLink size={12} /> {t("forensic.previewHtml")}
          </a>
          <button
            type="button"
            className="link-btn"
            onClick={() => downloadBlob(pdfUrl, `evidence-${caseId}.pdf`)}
          >
            <FileDown size={12} /> {t("forensic.downloadPdf")}
          </button>
          <button
            type="button"
            className="link-btn"
            onClick={() => downloadBlob(zipUrl, `evidence-${caseId}.zip`)}
          >
            <FileDown size={12} /> {t("forensic.downloadZip")}
          </button>
        </div>
      </div>
    </div>
  );
}
