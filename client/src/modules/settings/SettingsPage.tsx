import { useTranslation } from "react-i18next";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiGet, apiPatch } from "../../api/client";
import { LocaleToggle } from "../../shared/LocaleToggle";
import { Settings, User } from "lucide-react";

type Me = {
  id: string;
  email: string;
  name: string;
  role: string;
  locale: string;
  totpEnabled: boolean;
  workspaceMode?: string;
};

export function SettingsPage() {
  const { t } = useTranslation();
  const qc = useQueryClient();
  const { data: me, isLoading } = useQuery({
    queryKey: ["me"],
    queryFn: () => apiGet<Me>("/api/v1/auth/me"),
  });

  const saveWorkspace = useMutation({
    mutationFn: (workspaceMode: string) =>
      apiPatch<Me>("/api/v1/auth/me/preferences", { workspaceMode }),
    onSuccess: (user) => {
      localStorage.setItem("user", JSON.stringify(user));
      qc.invalidateQueries({ queryKey: ["me"] });
    },
  });

  if (isLoading) return <div className="loading">{t("common.loading")}</div>;

  return (
    <div>
      <div className="page-header">
        <div>
          <h1 className="page-title">{t("nav.settings")}</h1>
          <p className="page-subtitle">{t("settings.subtitle")}</p>
        </div>
      </div>

      <div className="card" style={{ marginBottom: "1rem" }}>
        <div className="card-header">
          <span className="card-title"><User size={14} /> {t("settings.profile")}</span>
        </div>
        {me && (
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1rem" }}>
            <div>
              <div className="field-label">{t("login.email")}</div>
              <div>{me.email}</div>
            </div>
            <div>
              <div className="field-label">Name</div>
              <div>{me.name}</div>
            </div>
            <div>
              <div className="field-label">Role</div>
              <div><span className="badge open">{me.role}</span></div>
            </div>
            <div>
              <div className="field-label">2FA</div>
              <div>{me.totpEnabled ? "Enabled" : "Not enabled"}</div>
            </div>
          </div>
        )}
      </div>

      <div className="card">
        <div className="card-header">
          <span className="card-title"><Settings size={14} /> {t("settings.preferences")}</span>
        </div>
        <LocaleToggle />
        <div className="form-field" style={{ marginTop: "1rem" }}>
          <label>{t("settings.workspace")}</label>
          <select
            value={me?.workspaceMode ?? localStorage.getItem("workspaceMode") ?? "accountability"}
            onChange={(e) => {
              localStorage.setItem("workspaceMode", e.target.value);
              saveWorkspace.mutate(e.target.value);
            }}
          >
            <option value="accountability">{t("settings.workspaceAccountability")}</option>
            <option value="criminal">{t("settings.workspaceCriminal")}</option>
            <option value="newsroom">{t("settings.workspaceNewsroom")}</option>
          </select>
        </div>
      </div>
    </div>
  );
}
