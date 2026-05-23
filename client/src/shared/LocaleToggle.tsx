import { useTranslation } from "react-i18next";
import { setAppLocale } from "../i18n/loadTranslations";
import { Globe } from "lucide-react";

export function LocaleToggle() {
  const { i18n } = useTranslation();

  return (
    <button
      type="button"
      className="secondary"
      style={{ width: "100%", justifyContent: "center" }}
      onClick={() => {
        const next = i18n.language === "en" ? "ml" : "en";
        void setAppLocale(next, true);
      }}
    >
      <Globe size={13} />
      {i18n.language === "en" ? "മലയാളം" : "English"}
    </button>
  );
}
