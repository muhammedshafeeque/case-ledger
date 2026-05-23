import { useState } from "react";
import { useTranslation } from "react-i18next";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { apiPost, apiDelete } from "../../../api/client";
import { StickyNote, Trash2 } from "lucide-react";
import type { NoteRow } from "../types";

type Props = { caseId: string; notes: NoteRow[] };

export function NotesTab({ caseId, notes }: Props) {
  const { t } = useTranslation();
  const qc = useQueryClient();
  const [body, setBody] = useState("");

  const create = useMutation({
    mutationFn: () => apiPost(`/api/v1/cases/${caseId}/notes`, { body: body.trim() }),
    onSuccess: () => {
      setBody("");
      qc.invalidateQueries({ queryKey: ["case", caseId] });
    },
  });

  const remove = useMutation({
    mutationFn: (id: string) => apiDelete(`/api/v1/notes/${id}`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["case", caseId] }),
  });

  return (
    <div>
      <div className="card" style={{ marginBottom: "1rem" }}>
        <div className="form-field">
          <label>{t("notes.add")}</label>
          <textarea rows={3} value={body} onChange={(e) => setBody(e.target.value)} placeholder={t("notes.placeholder")} />
        </div>
        <button type="button" onClick={() => create.mutate()} disabled={!body.trim() || create.isPending} style={{ marginTop: 8 }}>
          {t("notes.save")}
        </button>
      </div>

      <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
        {notes.length === 0 && <p style={{ color: "#64748b" }}>{t("notes.empty")}</p>}
        {notes.map((n) => (
          <div key={n.id} className="card" style={{ padding: "0.875rem" }}>
            <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 6 }}>
              <span style={{ fontSize: "0.75rem", color: "#64748b" }}>
                <StickyNote size={12} style={{ display: "inline", marginRight: 4 }} />
                {n.author.name} · {new Date(n.createdAt).toLocaleString()}
              </span>
              <button type="button" className="btn-ghost" onClick={() => remove.mutate(n.id)}>
                <Trash2 size={13} color="#94a3b8" />
              </button>
            </div>
            <p style={{ margin: 0, lineHeight: 1.6, whiteSpace: "pre-wrap" }}>{n.body}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
