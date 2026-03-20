import { siteConfig } from "../config/site";
import { jsonFetch, readSession, writeSession } from "./baseClient";

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const PHONE_PATTERN = /^\+?[1-9]\d{7,14}$/;

type AuthRole = "admin" | "merchant" | "discovery_user";

export interface AuthUser {
  id: string;
  email?: string | null;
  phone_e164?: string | null;
  whatsapp_e164?: string | null;
  role: AuthRole;
  status: "active" | "disabled" | "deleted";
}

export interface AuthSession {
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
  user: AuthUser;
}

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

export const mapAuthPayload = (payload: Record<string, unknown>): AuthSession => {
  const user = payload.user as Record<string, unknown>;
  return {
    accessToken: String(payload.access_token ?? ""),
    refreshToken: String(payload.refresh_token ?? ""),
    expiresIn: Number(payload.expires_in ?? 0),
    user: {
      id: String(user.id ?? ""),
      email: user.email ? String(user.email) : null,
      phone_e164: user.phone_e164 ? String(user.phone_e164) : null,
      whatsapp_e164: user.whatsapp_e164 ? String(user.whatsapp_e164) : null,
      role: String(user.role ?? "merchant") as AuthRole,
      status: String(user.status ?? "active") as AuthUser["status"]
    }
  };
};

export const authService = {
  getSession: (): AuthSession | null => readSession(),
  clearSession: async (): Promise<void> => {
    const session = readSession();
    writeSession(null);
    if (!session?.refreshToken) return;
    await fetch(`${siteConfig.apiUrl}/auth/merchant/signout`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({ refresh_token: session.refreshToken })
    }).catch(() => undefined);
  },
  async signUp(input: {
    phone?: string;
    whatsappNumber?: string;
    email?: string;
    password: string;
  }): Promise<AuthSession> {
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
    const payload = await jsonFetch<Record<string, unknown>>("/auth/merchant/signup", {
      method: "POST",
      body: JSON.stringify({
        phone: phone || undefined,
        whatsapp_number: input.whatsappNumber,
        email: email || undefined,
        password: input.password,
        role: "merchant"
      })
    });
    const session = mapAuthPayload(payload);
    writeSession(session);
    return session;
  },
  async precheckSignup(input: { phone?: string; email?: string }): Promise<{
    phoneNormalized: string | null;
    emailNormalized: string | null;
    phoneAvailable: boolean;
    emailAvailable: boolean;
    conflict: "phone" | "email" | null;
  }> {
    const payload = await jsonFetch<Record<string, unknown>>("/auth/merchant/signup/precheck", {
      method: "POST",
      body: JSON.stringify({
        phone: input.phone,
        email: input.email
      })
    });
    const conflictRaw = payload.conflict ? String(payload.conflict) : null;
    return {
      phoneNormalized: payload.phone_normalized ? String(payload.phone_normalized) : null,
      emailNormalized: payload.email_normalized ? String(payload.email_normalized) : null,
      phoneAvailable: payload.phone_available !== false,
      emailAvailable: payload.email_available !== false,
      conflict: conflictRaw === "phone" || conflictRaw === "email" ? conflictRaw : null
    };
  },
  async signInWithPassword(input: { identifier: string; password: string }): Promise<AuthSession> {
    const identifier = assertValidIdentifier(input.identifier);
    if (input.password.length < 8) {
      throw new Error("Password must be at least 8 characters.");
    }
    const payload = await jsonFetch<Record<string, unknown>>("/auth/merchant/signin", {
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
  },
  async requestOtp(input: {
    identifier: string;
    purpose: "signin" | "signup_verify" | "reset_password" | "phone_change";
  }): Promise<{
    challengeId: string | null;
    channel: string | null;
    expiresAt: string | null;
    devCode: string | null;
  }> {
    const payload = await jsonFetch<Record<string, unknown>>("/auth/merchant/otp/request", {
      method: "POST",
      body: JSON.stringify({
        identifier: input.identifier,
        purpose: input.purpose
      })
    });
    return {
      challengeId: payload.challenge_id ? String(payload.challenge_id) : null,
      channel: payload.channel ? String(payload.channel) : null,
      expiresAt: payload.expires_at ? String(payload.expires_at) : null,
      devCode: payload.dev_code ? String(payload.dev_code) : null
    };
  },
  async signInWithOtp(input: { challengeId: string; code: string }): Promise<AuthSession> {
    const payload = await jsonFetch<Record<string, unknown>>("/auth/merchant/signin", {
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
  async verifyOtp(input: {
    challengeId: string;
    code: string;
    purpose?: "signin" | "signup_verify" | "reset_password" | "phone_change";
  }): Promise<void> {
    await jsonFetch<Record<string, unknown>>("/auth/merchant/otp/verify", {
      method: "POST",
      body: JSON.stringify({
        challenge_id: input.challengeId,
        code: input.code,
        purpose: input.purpose
      })
    });
  },
  async forgotPassword(identifier: string): Promise<{
    challengeId: string | null;
    channel: string | null;
    devCode: string | null;
  }> {
    const payload = await jsonFetch<Record<string, unknown>>("/auth/merchant/forgot-password", {
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
    await jsonFetch<Record<string, unknown>>("/auth/merchant/reset-password", {
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
    await jsonFetch<Record<string, unknown>>("/auth/merchant/reset-password", {
      method: "POST",
      body: JSON.stringify({
        method: "token",
        token: input.token,
        new_password: input.newPassword
      })
    });
  }
};
