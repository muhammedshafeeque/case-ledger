import i18n from "i18next";

const API_URL = import.meta.env.VITE_API_URL ?? "http://localhost:3001";

export async function mergeRemoteTranslations(locale: string) {
  try {
    const res = await fetch(`${API_URL}/api/v1/i18n/translations?locale=${locale}`);
    const json = (await res.json()) as { success?: boolean; data?: Record<string, string> };
    if (json.success && json.data) {
      i18n.addResourceBundle(locale, "translation", json.data, true, true);
    }
  } catch {
    /* offline: bundled keys only */
  }
}

export async function setAppLocale(locale: string, persistUser = false) {
  await i18n.changeLanguage(locale);
  localStorage.setItem("locale", locale);
  await mergeRemoteTranslations(locale);
  if (persistUser && localStorage.getItem("accessToken")) {
    try {
      await fetch(`${API_URL}/api/v1/i18n/users/locale`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${localStorage.getItem("accessToken")}`,
        },
        credentials: "include",
        body: JSON.stringify({ locale }),
      });
    } catch {
      /* ignore */
    }
  }
}
