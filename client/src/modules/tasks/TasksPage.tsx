import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { useQuery } from "@tanstack/react-query";
import { apiGet } from "../../api/client";
import { CheckSquare } from "lucide-react";

type Task = {
  id: string;
  title: string;
  status: string;
  priority: string;
  dueDate: string | null;
  case: { id: string; rtiId: string; title: string } | null;
};

export function TasksPage() {
  const { t } = useTranslation();
  const { data, isLoading } = useQuery({
    queryKey: ["tasks-all"],
    queryFn: () => apiGet<Task[]>("/api/v1/tasks?limit=100"),
  });

  const tasks = data ?? [];
  const open = tasks.filter((t) => t.status !== "done" && t.status !== "cancelled");

  if (isLoading) return <div className="loading">{t("common.loading")}</div>;

  return (
    <div>
      <div className="page-header">
        <div>
          <h1 className="page-title">{t("nav.tasks")}</h1>
          <p className="page-subtitle">{open.length} open · {tasks.length} total</p>
        </div>
      </div>

      <div className="card" style={{ padding: 0, overflow: "hidden" }}>
        {tasks.length === 0 ? (
          <div className="empty-state">
            <CheckSquare size={32} />
            <p>{t("tasks.emptyGlobal")}</p>
          </div>
        ) : (
          <table>
            <thead>
              <tr>
                <th>{t("tasks.title")}</th>
                <th>{t("nav.cases")}</th>
                <th>{t("tasks.due")}</th>
                <th>{t("cases.status")}</th>
              </tr>
            </thead>
            <tbody>
              {tasks.map((task) => (
                <tr key={task.id}>
                  <td style={{ fontWeight: 500 }}>{task.title}</td>
                  <td>
                    {task.case ? (
                      <Link to={`/cases/${task.case.id}`} style={{ color: "#4f46e5", fontWeight: 600 }}>
                        {task.case.rtiId}
                      </Link>
                    ) : "—"}
                  </td>
                  <td style={{ color: "#64748b" }}>{task.dueDate ?? "—"}</td>
                  <td><span className={`badge ${task.status}`}>{task.status}</span></td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
