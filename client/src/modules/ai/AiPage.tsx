import { useState } from "react";
import { useTranslation } from "react-i18next";
import { apiPost } from "../../api/client";
import { Bot, Send, Info, Sparkles } from "lucide-react";

export function AiPage() {
  const { t } = useTranslation();
  const [message, setMessage] = useState("");
  const [response, setResponse] = useState("");
  const [loading, setLoading] = useState(false);

  async function send() {
    if (!message.trim()) return;
    setLoading(true);
    try {
      const result = await apiPost<{ draft: string | null; unavailable?: boolean; message?: string }>(
        "/api/v1/ai/chat",
        { message }
      );
      setResponse(result.unavailable ? (result.message ?? "Unavailable") : (result.draft ?? ""));
    } catch (e) {
      setResponse(e instanceof Error ? e.message : "Error");
    } finally {
      setLoading(false);
    }
  }

  function handleKey(e: React.KeyboardEvent) {
    if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) void send();
  }

  return (
    <div>
      <div className="page-header">
        <div>
          <h1 className="page-title" style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <Sparkles size={20} color="#4f46e5" />
            {t("ai.title")}
          </h1>
          <p className="page-subtitle">AI-assisted investigation drafting</p>
        </div>
      </div>

      <div className="notice info">
        <Info size={14} style={{ flexShrink: 0, marginTop: 1 }} />
        <span>{t("ai.disclaimer")}</span>
      </div>

      {/* Response bubble */}
      {response && (
        <div className="card" style={{ borderLeft: "3px solid #4f46e5" }}>
          <div style={{
            display: "flex", alignItems: "center", gap: 6,
            marginBottom: "0.75rem",
          }}>
            <div style={{
              width: 26, height: 26,
              background: "#4f46e5",
              borderRadius: 8,
              display: "flex", alignItems: "center", justifyContent: "center",
            }}>
              <Bot size={14} color="white" />
            </div>
            <span style={{ fontWeight: 600, fontSize: "0.8125rem", color: "#4f46e5" }}>
              AI Draft
            </span>
          </div>
          <div style={{
            fontSize: "0.875rem",
            lineHeight: 1.75,
            color: "#1e293b",
            whiteSpace: "pre-wrap",
          }}>
            {response}
          </div>
        </div>
      )}

      {/* Input */}
      <div className="card">
        <div style={{ marginBottom: "0.625rem" }}>
          <label style={{ marginBottom: "0.375rem" }}>{t("ai.placeholder")}</label>
          <textarea
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            onKeyDown={handleKey}
            rows={5}
            placeholder={t("ai.placeholder")}
            style={{ resize: "vertical" }}
          />
        </div>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <span style={{ fontSize: "0.75rem", color: "#94a3b8" }}>
            ⌘ Enter to send
          </span>
          <button onClick={() => void send()} disabled={loading || !message.trim()}>
            <Send size={13} />
            {loading ? "Generating…" : t("ai.send")}
          </button>
        </div>
      </div>
    </div>
  );
}
