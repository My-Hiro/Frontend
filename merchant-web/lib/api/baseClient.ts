import { siteConfig } from "../config/site";
import type { AuthSession } from "./auth.service";

const AUTH_STORAGE_KEY = "myhiro_auth_merchant";

export const readSession = (): AuthSession | null => {
  if (typeof window === "undefined") return null;
  const raw = localStorage.getItem(AUTH_STORAGE_KEY);
  if (!raw) return null;
  try {
    return JSON.parse(raw) as AuthSession;
  } catch {
    return null;
  }
};

export const writeSession = (session: AuthSession | null): void => {
  if (typeof window === "undefined") return;
  if (!session) {
    localStorage.removeItem(AUTH_STORAGE_KEY);
    return;
  }
  localStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(session));
};

export const jsonFetch = async <T>(
  path: string,
  options?: RequestInit,
  retryOnUnauthorized = true
): Promise<T> => {
  const session = readSession();
  const headers = new Headers(options?.headers ?? {});
  if (!headers.has("Content-Type") && !(options?.body instanceof FormData)) {
    headers.set("Content-Type", "application/json");
  }
  if (session?.accessToken) {
    headers.set("Authorization", `Bearer ${session.accessToken}`);
  }

  const response = await fetch(`${siteConfig.apiUrl}${path}`, {
    ...options,
    headers
  });

  if (response.status === 401 && retryOnUnauthorized) {
    // Basic refresh logic or redirect to login
  }

  if (!response.ok) {
    const error = await response.json().catch(() => ({ message: `API error: ${response.status}` }));
    throw new Error(error.message);
  }
  return (await response.json()) as T;
};
