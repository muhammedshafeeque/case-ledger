import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { apiPost } from "../../api/client";
import { setAppLocale } from "../../i18n/loadTranslations";
import { LocaleToggle } from "../../shared/LocaleToggle";
import { Shield, Mail, Lock, KeyRound, LogIn } from "lucide-react";

export function LoginPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [email, setEmail] = useState("investigator@rti-watch.local");
  const [password, setPassword] = useState("Investigate@2026");
  const [totpCode, setTotpCode] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const result = await apiPost<{
        accessToken: string;
        user: { id: string; email: string; name: string; role: string; locale?: string };
      }>("/api/v1/auth/login", {
        email,
        password,
        totpCode: totpCode || undefined,
      });
      localStorage.setItem("accessToken", result.accessToken);
      localStorage.setItem("user", JSON.stringify(result.user));
      if (result.user?.locale) await setAppLocale(result.user.locale);
      navigate("/");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Login failed");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div style={{
      minHeight: "100vh",
      display: "flex",
      background: "linear-gradient(135deg, #0f172a 0%, #1e293b 60%, #0f172a 100%)",
    }}>
      {/* Left panel — branding */}

      {/* Right panel — form */}
      <div style={{
        flex: 1,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: "2rem",
      }}>
        <div style={{ width: "100%", maxWidth: 400 }}>
          {/* Logo mark */}
          <div style={{ marginBottom: "2rem", textAlign: "center" }}>
            <div style={{
              width: 52, height: 52,
              background: "#4f46e5",
              borderRadius: 14,
              display: "inline-flex",
              alignItems: "center",
              justifyContent: "center",
              marginBottom: "1rem",
              boxShadow: "0 8px 24px rgba(79,70,229,0.4)",
            }}>
              <Shield size={26} color="white" />
            </div>
            <div style={{ color: "white", fontWeight: 700, fontSize: "1.25rem", letterSpacing: "-0.02em" }}>
              {t("app.title")}
            </div>
            <div style={{ color: "#64748b", fontSize: "0.8125rem", marginTop: 2 }}>
              Investigation Platform
            </div>
          </div>

          {/* Card */}
          <div style={{
            background: "white",
            borderRadius: 16,
            padding: "2rem",
            boxShadow: "0 24px 64px rgba(0,0,0,0.3), 0 8px 24px rgba(0,0,0,0.2)",
          }}>
            <h1 style={{ fontSize: "1.1875rem", fontWeight: 700, marginBottom: 6 }}>
              {t("login.title")}
            </h1>
            <p style={{ color: "#64748b", fontSize: "0.8125rem", marginBottom: "1.5rem" }}>
              Sign in to access your investigation dashboard
            </p>

            <form onSubmit={handleSubmit}>
              <div className="form-group">
                <label style={{ display: "flex", alignItems: "center", gap: 5 }}>
                  <Mail size={12} color="#64748b" />
                  {t("login.email")}
                </label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  autoComplete="email"
                  required
                />
              </div>

              <div className="form-group">
                <label style={{ display: "flex", alignItems: "center", gap: 5 }}>
                  <Lock size={12} color="#64748b" />
                  {t("login.password")}
                </label>
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  autoComplete="current-password"
                  required
                />
              </div>

              <div className="form-group">
                <label style={{ display: "flex", alignItems: "center", gap: 5 }}>
                  <KeyRound size={12} color="#64748b" />
                  {t("login.totp")}
                  <span style={{ color: "#94a3b8", fontWeight: 400, fontSize: "0.75rem", marginLeft: 4 }}>(optional)</span>
                </label>
                <input
                  value={totpCode}
                  onChange={(e) => setTotpCode(e.target.value)}
                  placeholder="000000"
                  autoComplete="one-time-code"
                  inputMode="numeric"
                  maxLength={6}
                />
              </div>

              {error && (
                <div className="notice error" style={{ marginBottom: "1rem" }}>
                  {error}
                </div>
              )}

              <button
                type="submit"
                disabled={loading}
                style={{ width: "100%", justifyContent: "center", padding: "0.625rem 1rem" }}
              >
                <LogIn size={14} />
                {loading ? "Signing in…" : t("login.submit")}
              </button>
            </form>

            <div style={{ marginTop: "1rem" }}>
              <LocaleToggle />
            </div>
          </div>

          <p style={{ textAlign: "center", color: "#475569", fontSize: "0.75rem", marginTop: "1.5rem" }}>
            Case Ledger · Secure Investigation Platform
          </p>
        </div>
      </div>
    </div>
  );
}
