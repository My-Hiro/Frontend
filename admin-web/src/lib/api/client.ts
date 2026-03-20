import { config } from "../config";
import { readSession, writeSession, mapAuthPayload } from "./session";

export const parseApiError = async (response: Response): Promise<string> => {
  try {
    const payload = (await response.json()) as { message?: string };
    return payload.message ?? `API error: ${response.status}`;
  } catch {
    return `API error: ${response.status}`;
  }
};

const refreshSession = async () => {
  const current = readSession();
  if (!current?.refreshToken) return null;
  const response = await fetch(`${config.apiBase}/auth/admin/refresh`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify({ refresh_token: current.refreshToken })
  });
  if (!response.ok) {
    writeSession(null);
    return null;
  }
  const payload = (await response.json()) as Record<string, unknown>;
  const next = mapAuthPayload(payload);
  writeSession(next);
  return next;
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

  const response = await fetch(`${config.apiBase}${path}`, {
    ...options,
    headers
  });

  if (response.status === 401 && retryOnUnauthorized) {
    const next = await refreshSession();
    if (next?.accessToken) {
      return jsonFetch<T>(path, options, false);
    }
  }

  if (!response.ok) {
    throw new Error(await parseApiError(response));
  }

  return (await response.json()) as T;
};

export type RangePreset = "7days" | "30days" | "3months" | "6months" | "1year";

export type DateRangeInput = {
  range?: RangePreset;
  start?: string;
  end?: string;
};

export type GeoFilterInput = {
  center_lat?: number;
  center_lng?: number;
  radius_km?: number;
};

export const toQuery = (input: Record<string, unknown>): string => {
  const params = new URLSearchParams();
  for (const [key, value] of Object.entries(input)) {
    if (value === undefined || value === null) continue;
    params.set(key, String(value));
  }
  const qs = params.toString();
  return qs ? `?${qs}` : "";
};
