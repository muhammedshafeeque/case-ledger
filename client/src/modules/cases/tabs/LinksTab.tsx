import { useState } from "react";
import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiGet, apiPost } from "../../../api/client";
import { Link2, Plus } from "lucide-react";
import type { LinkRow } from "../types";

type CaseOption = { id: string; rtiId: string; title: string };

type Props = { caseId: string; links: LinkRow[] };

export function LinksTab({ caseId, links }: Props) {
  const { t } = useTranslation();
  const qc = useQueryClient();
  const [toCaseId, setToCaseId] = useState("");
  const [linkType, setLinkType] = useState("related");
  const [notes, setNotes] = useState("");

  const { data: allCases } = useQuery({
    queryKey: ["cases-options"],
    queryFn: () => apiGet<CaseOption[]>("/api/v1/cases?limit=100"),
  });

  const link = useMutation({
    mutationFn: () => apiPost(`/api/v1/cases/${caseId}/link`, {
      toCaseId,
      linkType,
      notes: notes.trim() || undefined,
    }),
    onSuccess: () => {
      setToCaseId("");
      setNotes("");
      qc.invalidateQueries({ queryKey: ["case", caseId] });
    },
  });

  const options = (allCases ?? []).filter((c) => c.id !== caseId);

  return (
    <div>
      <div className="card" style={{ marginBottom: "1rem" }}>
        <div className="card-header">
          <span className="card-title"><Plus size={14} /> {t("links.add")}</span>
        </div>
        <div className="form-stack">
          <div className="form-field">
            <label>{t("links.target")}</label>
            <select value={toCaseId} onChange={(e) => setToCaseId(e.target.value)}>
              <option value="">Select investigation…</option>
              {options.map((c) => (
                <option key={c.id} value={c.id}>{c.rtiId} — {c.title}</option>
              ))}
            </select>
          </div>
          <div className="form-row">
            <div className="form-field">
              <label>{t("links.type")}</label>
              <input value={linkType} onChange={(e) => setLinkType(e.target.value)} placeholder="related, same_contractor…" />
            </div>
            <div className="form-field">
              <label>{t("links.notes")}</label>
              <input value={notes} onChange={(e) => setNotes(e.target.value)} />
            </div>
          </div>
          <button type="button" onClick={() => link.mutate()} disabled={!toCaseId || link.isPending}>
            {t("links.save")}
          </button>
        </div>
      </div>

      <div className="card" style={{ padding: 0, overflow: "hidden" }}>
        <div className="card-header">
          <span className="card-title"><Link2 size={14} /> {t("links.list")} ({links.length})</span>
        </div>
        {links.length === 0 ? (
          <div className="empty-state" style={{ padding: "2rem" }}><p>{t("links.empty")}</p></div>
        ) : (
          <table>
            <thead>
              <tr>
                <th>{t("links.direction")}</th>
                <th>{t("cases.refId")}</th>
                <th>{t("cases.title")}</th>
                <th>{t("links.type")}</th>
              </tr>
            </thead>
            <tbody>
              {links.map((l) => (
                <tr key={l.id}>
                  <td><span className="badge pending">{l.direction}</span></td>
                  <td>
                    <Link to={`/cases/${l.case.id}`} style={{ fontWeight: 700, color: "#4f46e5" }}>
                      {l.case.rtiId}
                    </Link>
                  </td>
                  <td>{l.case.title}</td>
                  <td>{l.linkType}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
