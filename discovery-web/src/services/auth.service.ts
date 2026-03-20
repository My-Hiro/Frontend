import { CONFIG } from "../lib/config";

export type AuthRole = "admin" | "merchant" | "discovery_user";

export interface DiscoveryAuthUser {
  id: string;
  role: AuthRole;
  status: "active" | "disabled" | "deleted";
  phone_e164?: string | null;
  whatsapp_e164?: string | null;
  email?: string | null;
}

export interface DiscoveryAuthSession {
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
  user: DiscoveryAuthUser;
}

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const PHONE_PATTERN = /^\+?[1-9]\d{7,14}$/;

export const authUtils = {
  looksLikeEmail: (value: string): boolean => EMAIL_PATTERN.test(value),
  looksLikePhone: (value: string): boolean => PHONE_PATTERN.test(value.replace(/[\s()-]/g, "")),
  normalizeIdentifier: (value: string): string => value.trim(),
};

export const authService = {
  async fetchWithAuth<T>(path: string, options?: RequestInit): Promise<T> {
    const url = `${CONFIG.API_BASE}${path}`;
    const response = await fetch(url, options);
    
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.message || `API error: ${response.status}`);
    }
    
    return response.json() as Promise<T>;
  },

  mapAuthPayload(payload: any): DiscoveryAuthSession {
    const user = payload.user || {};
    return {
      accessToken: String(payload.access_token ?? ""),
      refreshToken: String(payload.refresh_token ?? ""),
      expiresIn: Number(payload.expires_in ?? 0),
      user: {
        id: String(user.id ?? ""),
        role: String(user.role ?? "discovery_user") as AuthRole,
        status: String(user.status ?? "active") as DiscoveryAuthUser["status"],
        phone_e164: user.phone_e164 ? String(user.phone_e164) : null,
        whatsapp_e164: user.whatsapp_e164 ? String(user.whatsapp_e164) : null,
        email: user.email ? String(user.email) : null
      }
    };
  },

  getFallbackSession(identifier: string, role: AuthRole): DiscoveryAuthSession {
    const normalized = authUtils.normalizeIdentifier(identifier);
    const isEmail = authUtils.looksLikeEmail(normalized);
    const compact = normalized
      .toLowerCase()
      .replace(/[^a-z0-9]/g, "")
      .slice(0, 24);
    const userId = compact ? `demo-${role}-${compact}` : `demo-${role}-user`;
    return {
      accessToken: `demo-access-${userId}`,
      refreshToken: `demo-refresh-${userId}`,
      expiresIn: 60 * 60 * 24 * 30,
      user: {
        id: userId,
        role,
        status: "active",
        email: isEmail ? normalized : null,
        phone_e164: isEmail ? null : normalized,
        whatsapp_e164: isEmail ? null : normalized
      }
    };
  }
};
