import { config } from "../config";

export type AuthRole = "admin" | "merchant" | "discovery_user";

export interface AdminAuthUser {
  id: string;
  role: AuthRole;
  status: "active" | "disabled" | "deleted";
  email?: string | null;
  phone_e164?: string | null;
  whatsapp_e164?: string | null;
}

export interface AdminAuthSession {
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
  user: AdminAuthUser;
}

export const readSession = (): AdminAuthSession | null => {
  if (typeof window === "undefined") return null;
  const raw = localStorage.getItem(config.authStorageKey);
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw) as AdminAuthSession;
    if (!parsed?.accessToken || !parsed?.refreshToken || !parsed?.user) return null;
    return parsed;
  } catch {
    return null;
  }
};

export const writeSession = (session: AdminAuthSession | null): void => {
  if (typeof window === "undefined") return;
  if (!session) {
    localStorage.removeItem(config.authStorageKey);
    return;
  }
  localStorage.setItem(config.authStorageKey, JSON.stringify(session));
};

export const mapAuthPayload = (payload: Record<string, unknown>): AdminAuthSession => {
  const user = payload.user as Record<string, unknown>;
  return {
    accessToken: String(payload.access_token ?? ""),
    refreshToken: String(payload.refresh_token ?? ""),
    expiresIn: Number(payload.expires_in ?? 0),
    user: {
      id: String(user.id ?? ""),
      role: String(user.role ?? "admin") as AuthRole,
      status: String(user.status ?? "active") as AdminAuthUser["status"],
      email: user.email ? String(user.email) : null,
      phone_e164: user.phone_e164 ? String(user.phone_e164) : null,
      whatsapp_e164: user.whatsapp_e164 ? String(user.whatsapp_e164) : null
    }
  };
};
