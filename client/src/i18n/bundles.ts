import { UI_TRANSLATIONS } from "./translation-keys";

function toResources(lang: "english" | "malayalam") {
  const translation: Record<string, string> = {};
  for (const row of UI_TRANSLATIONS) {
    translation[row.key] = row[lang];
  }
  return translation;
}

export const bundledResources = {
  en: { translation: toResources("english") },
  ml: { translation: toResources("malayalam") },
};
