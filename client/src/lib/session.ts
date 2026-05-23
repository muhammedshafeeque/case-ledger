/** Access-token session helpers (no refresh — single JWT, fixed lifetime). */

export function getAccessToken(): string | null {
  return localStorage.getItem("accessToken");
}

export function setAccessToken(token: string) {
  localStorage.setItem("accessToken", token);
}

export function clearSession() {
  localStorage.removeItem("accessToken");
  localStorage.removeItem("user");
}

export function getTokenExpiryMs(token: string): number | null {
  try {
    const payload = JSON.parse(atob(token.split(".")[1] ?? "")) as { exp?: number };
    if (typeof payload.exp !== "number") return null;
    return payload.exp * 1000;
  } catch {
    return null;
  }
}

export function isAccessTokenExpired(token: string | null = getAccessToken()): boolean {
  if (!token) return true;
  const exp = getTokenExpiryMs(token);
  if (exp == null) return true;
  return Date.now() >= exp;
}

export function sessionExpiresInMs(token: string | null = getAccessToken()): number {
  const exp = token ? getTokenExpiryMs(token) : null;
  if (exp == null) return 0;
  return Math.max(0, exp - Date.now());
}
