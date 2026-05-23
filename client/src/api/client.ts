import axios from "axios";
import { clearSession, getAccessToken, isAccessTokenExpired, setAccessToken } from "../lib/session.js";

const API_URL = import.meta.env.VITE_API_URL ?? "http://localhost:3001";

export const api = axios.create({
  baseURL: API_URL,
  withCredentials: true,
});

let redirectingToLogin = false;

export function redirectToLogin() {
  if (redirectingToLogin) return;
  if (window.location.pathname === "/login") return;
  redirectingToLogin = true;
  clearSession();
  window.location.href = "/login";
}

api.interceptors.request.use((config) => {
  const token = getAccessToken();
  if (token) {
    if (isAccessTokenExpired(token)) {
      redirectToLogin();
      return Promise.reject(new Error("Session expired"));
    }
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

api.interceptors.response.use(
  (response) => response,
  (error) => {
    const status = error.response?.status;
    const path = error.config?.url ?? "";
    if (status === 401 && !path.includes("/auth/login")) {
      redirectToLogin();
    }
    return Promise.reject(error);
  }
);

export type ApiEnvelope<T> = {
  success: boolean;
  data?: T;
  error?: string;
  meta?: Record<string, unknown>;
};

export async function apiGet<T>(path: string): Promise<T> {
  const { data } = await api.get<ApiEnvelope<T>>(path);
  if (!data.success) throw new Error(data.error ?? "Request failed");
  return data.data as T;
}

function apiErrorMessage(err: unknown, fallback: string): string {
  if (err && typeof err === "object" && "response" in err) {
    const res = (err as { response?: { data?: ApiEnvelope<unknown> } }).response;
    if (res?.data?.error) return res.data.error;
    if (res?.data && typeof res.data === "object" && "error" in res.data) {
      return String((res.data as ApiEnvelope<unknown>).error);
    }
  }
  return err instanceof Error ? err.message : fallback;
}

export async function apiPost<T>(path: string, body?: unknown): Promise<T> {
  try {
    const { data } = await api.post<ApiEnvelope<T>>(path, body);
    if (!data.success) throw new Error(data.error ?? "Request failed");
    return data.data as T;
  } catch (err) {
    throw new Error(apiErrorMessage(err, "Request failed"));
  }
}

export async function apiPatch<T>(path: string, body?: unknown): Promise<T> {
  const { data } = await api.patch<ApiEnvelope<T>>(path, body);
  if (!data.success) throw new Error(data.error ?? "Request failed");
  return data.data as T;
}

export async function apiDelete<T>(path: string): Promise<T> {
  const { data } = await api.delete<ApiEnvelope<T>>(path);
  if (!data.success) throw new Error(data.error ?? "Request failed");
  return data.data as T;
}

export async function apiUpload<T>(path: string, formData: FormData): Promise<T> {
  try {
    const { data } = await api.post<ApiEnvelope<T>>(path, formData, {
      headers: { "Content-Type": "multipart/form-data" },
    });
    if (!data.success) throw new Error(data.error ?? "Upload failed");
    return data.data as T;
  } catch (err) {
    throw new Error(apiErrorMessage(err, "Upload failed"));
  }
}

export { setAccessToken, clearSession, getAccessToken, isAccessTokenExpired };
