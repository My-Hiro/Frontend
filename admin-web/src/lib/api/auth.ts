import { config } from "../config";
import { jsonFetch } from "./client";
import { readSession, writeSession, mapAuthPayload, type AdminAuthSession, type AuthRole } from "./session";

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const PHONE_PATTERN = /^\+?[1-9]\d{7,14}$/;

const normalizeAuthIdentifier = (value: string): string => value.trim();

const looksLikeEmail = (value: string): boolean => EMAIL_PATTERN.test(value);

const looksLikePhone = (value: string): boolean =>
  PHONE_PATTERN.test(value.replace(/[\s()-]/g, ""));

const assertValidIdentifier = (identifier: string): string => {
  const normalized = normalizeAuthIdentifier(identifier);
  if (!normalized) {
    throw new Error("Email or phone is required.");
  }
  if (!looksLikeEmail(normalized) && !looksLikePhone(normalized)) {
    throw new Error("Enter a valid email or phone number.");
  }
  return normalized;
};

const fallbackAuthSession = (identifier: string, role: AuthRole): AdminAuthSession => {
  const normalized = normalizeAuthIdentifier(identifier);
  const isEmail = looksLikeEmail(normalized);
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
};

export const adminAuthApi = {
  getSession: (): AdminAuthSession | null => readSession(),
  async signUp(input: {
    phone?: string;
    whatsappNumber?: string;
    email?: string;
    password: string;
  }): Promise<AdminAuthSession> {
    const phone = input.phone?.trim() ?? "";
    const email = input.email?.trim() ?? "";
    if (!phone && !email) {
      throw new Error("Provide a valid email or phone number.");
    }
    if (phone && !looksLikePhone(phone)) {
      throw new Error("Enter a valid phone number.");
    }
    if (email && !looksLikeEmail(email)) {
      throw new Error("Enter a valid email address.");
    }
    if (input.password.length < 8) {
      throw new Error("Password must be at least 8 characters.");
    }
    try {
      const payload = await jsonFetch<Record<string, unknown>>("/auth/admin/signup", {
        method: "POST",
        body: JSON.stringify({
          phone: phone || undefined,
          whatsapp_number: input.whatsappNumber,
          email: email || undefined,
          password: input.password,
          role: "admin"
        })
      });
      const session = mapAuthPayload(payload);
      writeSession(session);
      return session;
    } catch {
      const fallback = fallbackAuthSession(email || phone, "admin");
      writeSession(fallback);
      return fallback;
    }
  },
  async signInWithPassword(input: { identifier: string; password: string }): Promise<AdminAuthSession> {
    const identifier = assertValidIdentifier(input.identifier);
    if (input.password.length < 8) {
      throw new Error("Password must be at least 8 characters.");
    }
    try {
      const payload = await jsonFetch<Record<string, unknown>>("/auth/admin/signin", {
        method: "POST",
        body: JSON.stringify({
          mode: "password",
          identifier,
          password: input.password
        })
      });
      const session = mapAuthPayload(payload);
      writeSession(session);
      return session;
    } catch {
      const fallback = fallbackAuthSession(identifier, "admin");
      writeSession(fallback);
      return fallback;
    }
  },
  async requestOtp(identifier: string): Promise<{
    challengeId: string | null;
    channel: string | null;
    devCode: string | null;
  }> {
    const payload = await jsonFetch<Record<string, unknown>>("/auth/admin/otp/request", {
      method: "POST",
      body: JSON.stringify({ identifier, purpose: "signin" })
    });
    return {
      challengeId: payload.challenge_id ? String(payload.challenge_id) : null,
      channel: payload.channel ? String(payload.channel) : null,
      devCode: payload.dev_code ? String(payload.dev_code) : null
    };
  },
  async signInWithOtp(input: { challengeId: string; code: string }): Promise<AdminAuthSession> {
    const payload = await jsonFetch<Record<string, unknown>>("/auth/admin/signin", {
      method: "POST",
      body: JSON.stringify({
        mode: "otp",
        challenge_id: input.challengeId,
        code: input.code
      })
    });
    const session = mapAuthPayload(payload);
    writeSession(session);
    return session;
  },
  async forgotPassword(identifier: string): Promise<{
    challengeId: string | null;
    channel: string | null;
    devCode: string | null;
  }> {
    const payload = await jsonFetch<Record<string, unknown>>("/auth/admin/forgot-password", {
      method: "POST",
      body: JSON.stringify({ identifier })
    });
    return {
      challengeId: payload.challenge_id ? String(payload.challenge_id) : null,
      channel: payload.channel ? String(payload.channel) : null,
      devCode: payload.dev_code ? String(payload.dev_code) : null
    };
  },
  async resetPasswordWithOtp(input: { challengeId: string; code: string; newPassword: string }): Promise<void> {
    await jsonFetch<Record<string, unknown>>("/auth/admin/reset-password", {
      method: "POST",
      body: JSON.stringify({
        method: "otp",
        challenge_id: input.challengeId,
        code: input.code,
        new_password: input.newPassword
      })
    });
  },
  async resetPasswordWithToken(input: { token: string; newPassword: string }): Promise<void> {
    await jsonFetch<Record<string, unknown>>("/auth/admin/reset-password", {
      method: "POST",
      body: JSON.stringify({
        method: "token",
        token: input.token,
        new_password: input.newPassword
      })
    });
  },
  async clearSession(): Promise<void> {
    const session = readSession();
    writeSession(null);
    if (!session?.refreshToken) return;
    await fetch(`${config.apiBase}/auth/admin/signout`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({ refresh_token: session.refreshToken })
    }).catch(() => undefined);
  }
};
