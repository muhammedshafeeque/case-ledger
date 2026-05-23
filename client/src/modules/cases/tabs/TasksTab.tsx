import { useState } from "react";
import { useTranslation } from "react-i18next";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { apiPost, apiPatch, apiDelete } from "../../../api/client";
import { CheckSquare, Trash2 } from "lucide-react";
import type { TaskRow } from "../types";

type Props = { caseId: string; tasks: TaskRow[] };

export function TasksTab({ caseId, tasks }: Props) {
  const { t } = useTranslation();
  const qc = useQueryClient();
  const [title, setTitle] = useState("");
  const [dueDate, setDueDate] = useState("");

  const create = useMutation({
    mutationFn: () => apiPost(`/api/v1/cases/${caseId}/tasks`, {
      title: title.trim(),
      dueDate: dueDate || undefined,
    }),
    onSuccess: () => {
      setTitle("");
      setDueDate("");
      qc.invalidateQueries({ queryKey: ["case", caseId] });
    },
  });

  const toggleDone = useMutation({
    mutationFn: (task: TaskRow) => apiPatch(`/api/v1/tasks/${task.id}`, {
      status: task.status === "done" ? "open" : "done",
    }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["case", caseId] }),
  });

  const remove = useMutation({
    mutationFn: (id: string) => apiDelete(`/api/v1/tasks/${id}`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["case", caseId] }),
  });

  return (
    <div>
      <div className="card" style={{ marginBottom: "1rem" }}>
        <div className="form-row">
          <div className="form-field" style={{ flex: 2 }}>
            <label>{t("tasks.title")}</label>
            <input value={title} onChange={(e) => setTitle(e.target.value)} />
          </div>
          <div className="form-field">
            <label>{t("tasks.due")}</label>
            <input type="date" value={dueDate} onChange={(e) => setDueDate(e.target.value)} />
          </div>
        </div>
        <button type="button" onClick={() => create.mutate()} disabled={!title.trim() || create.isPending} style={{ marginTop: 8 }}>
          {t("tasks.add")}
        </button>
      </div>

      <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
        {tasks.length === 0 && <p style={{ color: "#64748b" }}>{t("tasks.empty")}</p>}
        {tasks.map((task) => (
          <div key={task.id} className="card" style={{
            padding: "0.75rem 1rem",
            display: "flex",
            alignItems: "center",
            gap: 10,
            opacity: task.status === "done" ? 0.65 : 1,
          }}>
            <input
              type="checkbox"
              checked={task.status === "done"}
              onChange={() => toggleDone.mutate(task)}
              style={{ width: "auto" }}
            />
            <div style={{ flex: 1 }}>
              <div style={{ fontWeight: 500, textDecoration: task.status === "done" ? "line-through" : "none" }}>
                {task.title}
              </div>
              {task.dueDate && (
                <div style={{ fontSize: "0.75rem", color: "#64748b" }}>Due {task.dueDate}</div>
              )}
            </div>
            <span className={`badge ${task.status}`}>{task.status}</span>
            <button type="button" className="btn-ghost" onClick={() => remove.mutate(task.id)}>
              <Trash2 size={13} color="#94a3b8" />
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}
