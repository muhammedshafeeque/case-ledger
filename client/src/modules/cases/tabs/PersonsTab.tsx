import { useState } from "react";
import { useTranslation } from "react-i18next";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiGet, apiPost, apiDelete } from "../../../api/client";
import { UserPlus, Users, Trash2 } from "lucide-react";
import type { PersonRow } from "../types";

const ROLES = [
  "subject",
  "witness",
  "official",
  "accused",
  "victim",
  "intermediary",
  "complainant",
  "other",
] as const;

type Props = { caseId: string; persons: PersonRow[] };

function CrossCaseBadge({ entityId }: { entityId: string }) {
  const { data } = useQuery({
    queryKey: ["entity-cases", entityId],
    queryFn: () => apiGet<Array<{ id: string }>>(`/api/v1/entities/${entityId}/cases`),
  });
  if (!data || data.length <= 1) return null;
  return (
    <span className="badge high" style={{ marginLeft: 6 }} title="Appears in multiple cases">
      {data.length} cases
    </span>
  );
}

export function PersonsTab({ caseId, persons }: Props) {
  const { t } = useTranslation();
  const qc = useQueryClient();
  const [name, setName] = useState("");
  const [designation, setDesignation] = useState("");
  const [role, setRole] = useState<string>("subject");
  const [error, setError] = useState<string | null>(null);

  const add = useMutation({
    mutationFn: () =>
      apiPost<PersonRow>(`/api/v1/cases/${caseId}/entities`, {
        name: name.trim(),
        role,
        designation: designation.trim() || undefined,
      }),
    onSuccess: () => {
      setName("");
      setDesignation("");
      setRole("subject");
      setError(null);
      qc.invalidateQueries({ queryKey: ["case", caseId] });
    },
    onError: (e: Error) => setError(e.message),
  });

  const remove = useMutation({
    mutationFn: (caseEntityId: string) =>
      apiDelete(`/api/v1/cases/${caseId}/entities/${caseEntityId}`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["case", caseId] }),
  });

  return (
    <div>
      <div className="card" style={{ marginBottom: "1rem" }}>
        <div className="card-header">
          <span className="card-title">
            <UserPlus size={14} />
            {t("persons.add")}
          </span>
        </div>
        <div className="form-stack">
          {error && <div className="form-error-banner">{error}</div>}
          <div className="form-field">
            <label>{t("persons.name")} *</label>
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder={t("persons.namePlaceholder")}
            />
          </div>
          <div className="form-row">
            <div className="form-field">
              <label>{t("persons.role")}</label>
              <select value={role} onChange={(e) => setRole(e.target.value)}>
                {ROLES.map((r) => (
                  <option key={r} value={r}>
                    {t(`persons.role.${r}` as never, { defaultValue: r })}
                  </option>
                ))}
              </select>
            </div>
            <div className="form-field">
              <label>{t("persons.designation")}</label>
              <input
                value={designation}
                onChange={(e) => setDesignation(e.target.value)}
                placeholder={t("persons.designationPlaceholder")}
              />
            </div>
          </div>
          <button
            type="button"
            onClick={() => add.mutate()}
            disabled={!name.trim() || add.isPending}
          >
            {add.isPending ? t("persons.saving") : t("persons.save")}
          </button>
        </div>
      </div>

      <div className="card" style={{ padding: 0, overflow: "hidden" }}>
        <div className="card-header">
          <span className="card-title">
            <Users size={14} />
            {t("persons.list")} ({persons.length})
          </span>
        </div>
        {persons.length === 0 ? (
          <div className="empty-state" style={{ padding: "2rem" }}>
            <Users size={28} />
            <p>{t("persons.empty")}</p>
          </div>
        ) : (
          <table>
            <thead>
              <tr>
                <th>{t("persons.name")}</th>
                <th>{t("persons.role")}</th>
                <th>{t("persons.designation")}</th>
                <th>{t("entities.risk")}</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {persons.map((p) => (
                <tr key={p.caseEntityId}>
                  <td style={{ fontWeight: 600 }}>
                    {p.name}
                    <CrossCaseBadge entityId={p.id} />
                  </td>
                  <td>
                    <span className="badge open">
                      {t(`persons.role.${p.role}` as never, { defaultValue: p.role })}
                    </span>
                  </td>
                  <td style={{ color: "#64748b" }}>{p.designation || "—"}</td>
                  <td>
                    <span className={`badge ${p.riskScore >= 70 ? "critical" : p.riskScore >= 40 ? "high" : "low"}`}>
                      {p.riskScore}
                    </span>
                  </td>
                  <td>
                    <button
                      type="button"
                      className="btn-ghost"
                      onClick={() => remove.mutate(p.caseEntityId)}
                      title={t("persons.remove")}
                    >
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
