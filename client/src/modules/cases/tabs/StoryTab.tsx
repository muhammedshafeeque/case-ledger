import { useState } from "react";
import { useTranslation } from "react-i18next";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiGet, apiPost, apiPatch } from "../../../api/client";
import { BookOpen } from "lucide-react";

type Item = { id: string; kind: string; title: string; body: string; status: string };

type Props = { caseId: string };

export function StoryTab({ caseId }: Props) {
  const { t } = useTranslation();
  const qc = useQueryClient();
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [kind, setKind] = useState("hypothesis");

  const { data: items = [] } = useQuery({
    queryKey: ["story", caseId],
    queryFn: () => apiGet<Item[]>(`/api/v1/cases/${caseId}/story`),
  });

  const add = useMutation({
    mutationFn: () => apiPost(`/api/v1/cases/${caseId}/story/items`, { kind, title, body }),
    onSuccess: () => {
      setTitle("");
      setBody("");
      qc.invalidateQueries({ queryKey: ["story", caseId] });
    },
  });

  const saveChecklist = useMutation({
    mutationFn: (checklist: Record<string, boolean>) =>
      apiPatch(`/api/v1/cases/${caseId}/story/publication`, {
        publicationChecklist: checklist,
        legalReviewStatus: checklist.lawyer ? "reviewed" : "pending",
      }),
  });

  const checklistKeys = ["sourceConsent", "docsVerified", "lawyer", "embargoOk"];

  return (
    <div>
      <div className="card" style={{ marginBottom: "1rem" }}>
        <div className="card-header">
          <span className="card-title"><BookOpen size={14} /> {t("story.board")}</span>
        </div>
        <div className="form-stack">
          <select value={kind} onChange={(e) => setKind(e.target.value)}>
            {["hypothesis", "lead", "dead_end", "publishable"].map((k) => (
              <option key={k} value={k}>{k}</option>
            ))}
          </select>
          <input placeholder={t("story.itemTitle")} value={title} onChange={(e) => setTitle(e.target.value)} />
          <textarea rows={2} placeholder={t("story.itemBody")} value={body} onChange={(e) => setBody(e.target.value)} />
          <button type="button" onClick={() => add.mutate()} disabled={!title.trim()}>
            {t("story.addItem")}
          </button>
        </div>
      </div>
      <div className="card" style={{ marginBottom: "1rem" }}>
        <div className="card-header">
          <span className="card-title">{t("story.checklist")}</span>
        </div>
        {checklistKeys.map((k) => (
          <label key={k} style={{ display: "block", marginBottom: 6 }}>
            <input
              type="checkbox"
              onChange={(e) => saveChecklist.mutate({ [k]: e.target.checked })}
            />{" "}
            {k}
          </label>
        ))}
      </div>
      <div className="card">
        {items.map((item) => (
          <div key={item.id} style={{ padding: "0.75rem", borderBottom: "1px solid #e2e8f0" }}>
            <span className="badge open">{item.kind}</span>
            <strong style={{ marginLeft: 8 }}>{item.title}</strong>
            <p style={{ margin: "4px 0", fontSize: "0.875rem" }}>{item.body}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
