import { useState } from "react";
import { useTranslation } from "react-i18next";
import { useMutation } from "@tanstack/react-query";
import { apiPost } from "../../../api/client";
import { Bot, Send } from "lucide-react";

type Props = { caseId: string };

export function CaseAiTab({ caseId }: Props) {
  const { t } = useTranslation();
  const [message, setMessage] = useState("");
  const [reply, setReply] = useState<string | null>(null);

  const chat = useMutation({
    mutationFn: (msg: string) => apiPost<{ draft: string | null; unavailable?: boolean; message?: string }>(
      "/api/v1/ai/chat",
      { message: msg, caseId }
    ),
    onSuccess: (data) => setReply(data.unavailable ? (data.message ?? "AI unavailable") : (data.draft ?? "")),
  });

  return (
    <div className="card">
      <div className="card-header">
        <span className="card-title"><Bot size={14} /> {t("ai.caseTitle")}</span>
      </div>
      <p style={{ fontSize: "0.8125rem", color: "#64748b", marginBottom: "1rem" }}>{t("ai.disclaimer")}</p>
      <div className="form-field">
        <textarea
          rows={3}
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          placeholder={t("ai.casePlaceholder")}
        />
      </div>
      <button
        type="button"
        onClick={() => chat.mutate(message)}
        disabled={!message.trim() || chat.isPending}
        style={{ marginTop: 8 }}
      >
        <Send size={14} />
        {chat.isPending ? t("common.loading") : t("ai.send")}
      </button>
      {reply && (
        <div style={{
          marginTop: "1rem",
          padding: "1rem",
          background: "#f8fafc",
          borderRadius: 8,
          border: "1px solid #e2e8f0",
          lineHeight: 1.65,
          whiteSpace: "pre-wrap",
        }}>
          <span className="badge pending" style={{ marginBottom: 8 }}>{t("ai.draft")}</span>
          <div>{reply}</div>
        </div>
      )}
    </div>
  );
}
