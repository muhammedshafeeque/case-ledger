import { useState } from "react";
import { useTranslation } from "react-i18next";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { apiPost, apiDelete } from "../../../api/client";
import { ListChecks, Plus, Trash2 } from "lucide-react";
import type { FactRow } from "../types";

const FACT_TYPES = [
  "financial_amount", "date", "official_statement", "entity_mention",
  "legal_section", "process_event", "contractor_name", "project_detail",
] as const;

type Props = { caseId: string; facts: FactRow[] };

export function FactsTab({ caseId, facts }: Props) {
  const { t } = useTranslation();
  const qc = useQueryClient();
  const [factType, setFactType] = useState<string>("financial_amount");
  const [content, setContent] = useState("");
  const [amount, setAmount] = useState("");

  const create = useMutation({
    mutationFn: () => apiPost(`/api/v1/cases/${caseId}/facts`, {
      factType,
      content: content.trim(),
      amount: amount ? Number(amount) : undefined,
    }),
    onSuccess: () => {
      setContent("");
      setAmount("");
      qc.invalidateQueries({ queryKey: ["case", caseId] });
    },
  });

  const remove = useMutation({
    mutationFn: (id: string) => apiDelete(`/api/v1/facts/${id}`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["case", caseId] }),
  });

  return (
    <div>
      <div className="card" style={{ marginBottom: "1rem" }}>
        <div className="card-header">
          <span className="card-title"><Plus size={14} /> {t("facts.add")}</span>
        </div>
        <div className="form-stack">
          <div className="form-row">
            <div className="form-field">
              <label>{t("facts.type")}</label>
              <select value={factType} onChange={(e) => setFactType(e.target.value)}>
                {FACT_TYPES.map((f) => <option key={f} value={f}>{f.replace(/_/g, " ")}</option>)}
              </select>
            </div>
            <div className="form-field">
              <label>{t("facts.amount")}</label>
              <input type="number" value={amount} onChange={(e) => setAmount(e.target.value)} placeholder="Optional" />
            </div>
          </div>
          <div className="form-field">
            <label>{t("facts.content")}</label>
            <textarea rows={3} value={content} onChange={(e) => setContent(e.target.value)} />
          </div>
          <button type="button" onClick={() => create.mutate()} disabled={!content.trim() || create.isPending}>
            {t("facts.save")}
          </button>
        </div>
      </div>

      <div className="card" style={{ padding: 0, overflow: "hidden" }}>
        <div className="card-header">
          <span className="card-title"><ListChecks size={14} /> {t("facts.list")} ({facts.length})</span>
        </div>
        {facts.length === 0 ? (
          <div className="empty-state" style={{ padding: "2rem" }}><p>{t("facts.empty")}</p></div>
        ) : (
          <table>
            <thead>
              <tr>
                <th>{t("facts.type")}</th>
                <th>{t("facts.content")}</th>
                <th>{t("facts.amount")}</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {facts.map((f) => (
                <tr key={f.id}>
                  <td><span className="badge pending">{f.factType}</span></td>
                  <td style={{ maxWidth: 360 }}>{f.content}</td>
                  <td>{f.amount ? `₹ ${f.amount}` : "—"}</td>
                  <td>
                    <button type="button" className="btn-ghost" onClick={() => remove.mutate(f.id)} title="Delete">
                      <Trash2 size={14} color="#94a3b8" />
                    </button>
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
