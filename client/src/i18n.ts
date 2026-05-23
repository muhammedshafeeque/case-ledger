import i18n from "i18next";
import { initReactI18next } from "react-i18next";
import { bundledResources } from "./i18n/bundles";
import { mergeRemoteTranslations } from "./i18n/loadTranslations";

const lng = localStorage.getItem("locale") ?? "en";

void i18n.use(initReactI18next).init({
  resources: bundledResources,
  lng,
  fallbackLng: "en",
  interpolation: { escapeValue: false },
});

void mergeRemoteTranslations(lng);

export default i18n;
