const API_BASE = import.meta.env.VITE_API_BASE ?? "http://localhost:4000/api";
const AUTH_STORAGE_KEY = "myhiro_auth_admin";
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const PHONE_PATTERN = /^\+?[1-9]\d{7,14}$/;

type AuthRole = "admin" | "merchant" | "discovery_user";

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

const readSession = (): AdminAuthSession | null => {
  if (typeof window === "undefined") return null;
  const raw = localStorage.getItem(AUTH_STORAGE_KEY);
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw) as AdminAuthSession;
    if (!parsed?.accessToken || !parsed?.refreshToken || !parsed?.user) return null;
    return parsed;
  } catch {
    return null;
  }
};

const writeSession = (session: AdminAuthSession | null): void => {
  if (typeof window === "undefined") return;
  if (!session) {
    localStorage.removeItem(AUTH_STORAGE_KEY);
    return;
  }
  localStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(session));
};

const mapAuthPayload = (payload: Record<string, unknown>): AdminAuthSession => {
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

const parseApiError = async (response: Response): Promise<string> => {
  try {
    const payload = (await response.json()) as { message?: string };
    return payload.message ?? `API error: ${response.status}`;
  } catch {
    return `API error: ${response.status}`;
  }
};

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

const refreshSession = async (): Promise<AdminAuthSession | null> => {
  const current = readSession();
  if (!current?.refreshToken) return null;
  const response = await fetch(`${API_BASE}/auth/admin/refresh`, {
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

const jsonFetch = async <T>(
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

  const response = await fetch(`${API_BASE}${path}`, {
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

const toQuery = (input: Record<string, unknown>): string => {
  const params = new URLSearchParams();
  for (const [key, value] of Object.entries(input)) {
    if (value === undefined || value === null) continue;
    params.set(key, String(value));
  }
  const qs = params.toString();
  return qs ? `?${qs}` : "";
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
    await fetch(`${API_BASE}/auth/admin/signout`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({ refresh_token: session.refreshToken })
    }).catch(() => undefined);
  }
};

export const adminApi = {
  getPlatform(input: DateRangeInput) {
    return jsonFetch<{
      total_stores: number;
      active_stores: number;
      total_skus: number;
      low_stock_incidents: number;
      discovery_searches: number;
      no_result_rate: number;
      call_direction_conversions: number;
    }>(`/admin/analytics/platform${toQuery(input)}`);
  },

  getOverlap(input: DateRangeInput) {
    return jsonFetch<{
      total_events: number;
      stale_events: number;
      freshness_lag_avg_ms: number;
      mismatch_rate: number;
      stale_update_merchants: string[];
    }>(`/admin/analytics/inventory-discovery-overlap${toQuery(input)}`);
  },

  getAds(input: DateRangeInput) {
    return jsonFetch<{
      impressions: number;
      ctr: number;
      calls: number;
      directions: number;
    }>(`/admin/analytics/ads${toQuery(input)}`);
  },

  getMissedDemand(input: DateRangeInput) {
    return jsonFetch<Array<{ query: string; count: number }>>(
      `/admin/analytics/missed-demand${toQuery(input)}`
    );
  },

  getMerchantHealth(input: DateRangeInput) {
    return jsonFetch<
      Array<{
        store_id: string;
        store_name: string;
        verification: string;
        updates: number;
        stale_updates: number;
        last_inventory_update: string;
      }>
    >(`/admin/analytics/merchant-health${toQuery(input)}`);
  },

  getTopSearches(input: DateRangeInput & GeoFilterInput) {
    return jsonFetch<{
      scope: "overall" | "area";
      center: { lat: number; lng: number } | null;
      radius_km: number | null;
      rows: Array<{
        query: string;
        searches: number;
        no_results: number;
        no_result_rate: number;
        clicks: number;
        area_clicks?: number;
        stores_clicked?: number;
      }>;
    }>(`/admin/analytics/top-searches${toQuery(input)}`);
  },

  getTopStores(input: DateRangeInput & GeoFilterInput) {
    return jsonFetch<{
      scope: "overall" | "area";
      center: { lat: number; lng: number } | null;
      radius_km: number | null;
      rows: Array<{
        store_id: string;
        store_name: string;
        verification: string;
        city: string;
        region: string;
        distance_km?: number;
        score: number;
        views: number;
        clicks: number;
        calls: number;
        directions: number;
        saves: number;
        requests: number;
      }>;
    }>(`/admin/analytics/top-stores${toQuery(input)}`);
  },

  getStoreRankings(
    input: DateRangeInput &
      GeoFilterInput & {
        scope?: "overall" | "geo";
      }
  ) {
    return jsonFetch<{
      scope: "overall" | "geo";
      center: { lat: number; lng: number } | null;
      radius_km: number | null;
      total: number;
      rows: Array<{
        rank: number;
        store_id: string;
        store_name: string;
        verification: string;
        city: string;
        region: string;
        distance_km?: number;
        score: number;
        views: number;
        clicks: number;
        calls: number;
        directions: number;
        saves: number;
        requests: number;
      }>;
    }>(`/admin/analytics/store-rankings${toQuery(input)}`);
  },

  getProductSalesRanking(input: DateRangeInput) {
    return jsonFetch<{
      total: number;
      rows: Array<{
        rank: number;
        product_id: string;
        product_name: string;
        units_sold: number;
        revenue: number;
        profit: number;
        margin: number;
      }>;
      }>(`/admin/analytics/product-sales-ranking${toQuery(input)}`);
  },

  getSalesDimensionRanking(input: DateRangeInput) {
    return jsonFetch<{
      audience: {
        total: number;
        rows: Array<{
          rank: number;
          audience_label: "general" | "men" | "women" | "boys" | "girls";
          units_sold: number;
          revenue: number;
        }>;
      };
      categories: {
        total: number;
        rows: Array<{
          rank: number;
          category_id: string;
          category_name: string;
          units_sold: number;
          revenue: number;
        }>;
      };
      subcategories: {
        total: number;
        rows: Array<{
          rank: number;
          category_id: string;
          category_name: string;
          subcategory_label: string;
          units_sold: number;
          revenue: number;
        }>;
      };
    }>(`/admin/analytics/sales-dimension-ranking${toQuery(input)}`);
  },

  getCustomerPurchases(
    input: DateRangeInput & {
      contact?: string;
      email?: string;
    }
  ) {
    return jsonFetch<{
      total: number;
      rows: Array<{
        customer_contact?: string;
        customer_email?: string;
        transactions: number;
        total_spend: number;
        products: Array<{ name: string; quantity: number }>;
      }>;
    }>(`/admin/analytics/customer-purchases${toQuery(input)}`);
  },

  getModerationOverview() {
    return jsonFetch<{
      verification_queue: number;
      abuse_reports_open: number;
      suspicious_listings: number;
    }>(`/admin/moderation/overview`);
  },

  listAbuseReports(status?: "open" | "resolved") {
    return jsonFetch<{
      rows: Array<{
        id: string;
        store_id: string;
        store_name: string;
        product_id?: string;
        reason: string;
        details?: string;
        created_at: string;
        status: "open" | "resolved";
      }>;
    }>(`/admin/moderation/abuse-reports${toQuery({ status })}`);
  },

  updateAbuseReport(id: string, status: "open" | "resolved") {
    return jsonFetch<{ updated: true; row: unknown }>(`/admin/moderation/abuse-reports/${encodeURIComponent(id)}`, {
      method: "PATCH",
      body: JSON.stringify({ status })
    });
  },

  listStores(input?: {
    q?: string;
    verification?: "Unverified" | "Verified" | "Partner";
    flagged?: boolean;
    submitted?: boolean;
  }) {
    return jsonFetch<{
      rows: Array<{
        store_id: string;
        store_name: string;
        verification: "Unverified" | "Verified" | "Partner";
        verification_submitted: boolean;
        open_reports: number;
        city: string;
        region: string;
        lat: number | null;
        lng: number | null;
        last_inventory_update: string;
      }>;
    }>(`/admin/stores${toQuery(input ?? {})}`);
  },

  updateStoreVerification(storeId: string, verification: "Unverified" | "Verified" | "Partner") {
    return jsonFetch<{
      updated: true;
      row: {
        store_id: string;
        store_name: string;
        verification: "Unverified" | "Verified" | "Partner";
        verification_submitted: boolean;
        open_reports: number;
        city: string;
        region: string;
        lat: number | null;
        lng: number | null;
        last_inventory_update: string;
      };
    }>(`/admin/stores/${encodeURIComponent(storeId)}/verification`, {
      method: "PATCH",
      body: JSON.stringify({ verification })
    });
  },

  listAdPlacements() {
    return jsonFetch<
      Array<{
        id: string;
        title: string;
        subtitle?: string;
        image_url: string;
        link_type:
          | "none"
          | "custom_url"
          | "discovery_page"
          | "discovery_store"
          | "discovery_product"
          | "merchant_page";
        link_target?: string;
        link_url?: string;
        placements: Array<"homepage_hero" | "store_profile" | "product_page" | "store_page" | "merchant_support">;
        priority: number;
        active: boolean;
        starts_at?: string;
        ends_at?: string;
        created_at: string;
        updated_at: string;
      }>
    >("/admin/ads/placements");
  },

  createAdPlacement(input: {
    title: string;
    subtitle?: string;
    image_url: string;
    link_type:
      | "none"
      | "custom_url"
      | "discovery_page"
      | "discovery_store"
      | "discovery_product"
      | "merchant_page";
    link_target?: string;
    link_url?: string;
    placements: Array<"homepage_hero" | "store_profile" | "product_page" | "store_page" | "merchant_support">;
    priority: number;
    active: boolean;
    starts_at?: string;
    ends_at?: string;
  }) {
    return jsonFetch<Record<string, unknown>>("/admin/ads/placements", {
      method: "POST",
      body: JSON.stringify(input)
    });
  },

  updateAdPlacement(id: string, input: Partial<{
    title: string;
    subtitle?: string;
    image_url: string;
    link_type:
      | "none"
      | "custom_url"
      | "discovery_page"
      | "discovery_store"
      | "discovery_product"
      | "merchant_page";
    link_target?: string;
    link_url?: string;
    placements: Array<"homepage_hero" | "store_profile" | "product_page" | "store_page" | "merchant_support">;
    priority: number;
    active: boolean;
    starts_at?: string;
    ends_at?: string;
  }>) {
    return jsonFetch<Record<string, unknown>>(`/admin/ads/placements/${encodeURIComponent(id)}`, {
      method: "PATCH",
      body: JSON.stringify(input)
    });
  },

  deleteAdPlacement(id: string) {
    return jsonFetch<{ deleted: boolean }>(`/admin/ads/placements/${encodeURIComponent(id)}`, {
      method: "DELETE"
    });
  },

  reorderAdPlacements(ids: string[]) {
    return jsonFetch<{ updated: boolean }>("/admin/ads/placements/reorder", {
      method: "POST",
      body: JSON.stringify({ ids })
    });
  },

  async uploadAdImage(
    file: File,
    options?: { preset?: "ad_banner" | "store_banner" | "store_logo" | "product_image" | "verification_document" }
  ): Promise<string> {
    const form = new FormData();
    form.append("file", file);
    form.append("preset", options?.preset ?? "ad_banner");
    const response = await fetch(`${API_BASE}/media/upload`, {
      method: "POST",
      body: form
    });
    if (!response.ok) {
      throw new Error(await parseApiError(response));
    }
    const payload = (await response.json()) as { url?: string };
    if (!payload.url) throw new Error("missing_upload_url");
    return String(payload.url);
  },

  listSponsorships() {
    return jsonFetch<
      Array<{
        id: string;
        target_type: "store" | "product";
        target_id: string;
        priority: number;
        label: string;
        active: boolean;
        starts_at?: string;
        ends_at?: string;
        created_at: string;
        updated_at: string;
      }>
    >("/admin/sponsorships");
  },

  listSponsorshipTargets(input: { type: "store" | "product"; q?: string }) {
    return jsonFetch<{
      rows: Array<{
        id: string;
        label: string;
        store_id?: string;
        store_name?: string;
      }>;
    }>(`/admin/sponsorship-targets${toQuery({ type: input.type, q: input.q })}`);
  },

  createSponsorship(input: {
    target_type: "store" | "product";
    target_id: string;
    priority: number;
    label: string;
    active: boolean;
    starts_at?: string;
    ends_at?: string;
  }) {
    return jsonFetch<Record<string, unknown>>("/admin/sponsorships", {
      method: "POST",
      body: JSON.stringify(input)
    });
  },

  updateSponsorship(
    id: string,
    input: Partial<{
      target_type: "store" | "product";
      target_id: string;
      priority: number;
      label: string;
      active: boolean;
      starts_at?: string;
      ends_at?: string;
    }>
  ) {
    return jsonFetch<Record<string, unknown>>(`/admin/sponsorships/${encodeURIComponent(id)}`, {
      method: "PATCH",
      body: JSON.stringify(input)
    });
  },

  deleteSponsorship(id: string) {
    return jsonFetch<{ deleted: boolean }>(`/admin/sponsorships/${encodeURIComponent(id)}`, {
      method: "DELETE"
    });
  },

  listAccounts(input?: {
    platform?: "merchant" | "discovery" | "admin";
    status?: "active" | "disabled" | "deleted";
    q?: string;
  }) {
    return jsonFetch<{
      rows: Array<{
        id: string;
        platform: "merchant" | "discovery" | "admin";
        role: string;
        status: "active" | "disabled" | "deleted";
        email: string | null;
        phone_e164: string | null;
        whatsapp_e164: string | null;
        created_at: string;
        updated_at: string;
      }>;
    }>(`/admin/accounts${toQuery(input ?? {})}`);
  },

  updateAccountStatus(id: string, status: "active" | "disabled" | "deleted") {
    return jsonFetch<{
      updated: true;
      row: {
        id: string;
        platform: "merchant" | "discovery" | "admin";
        role: string;
        status: "active" | "disabled" | "deleted";
      };
    }>(`/admin/accounts/${encodeURIComponent(id)}/status`, {
      method: "PATCH",
      body: JSON.stringify({ status })
    });
  },

  listSignups(input?: { platform?: "merchant" | "discovery" | "admin"; start?: string; end?: string }) {
    return jsonFetch<{
      total: number;
      rows: Array<{
        id: string;
        platform: "merchant" | "discovery" | "admin";
        role: string;
        status: "active" | "disabled" | "deleted";
        email: string | null;
        phone_e164: string | null;
        created_at: string;
      }>;
    }>(`/admin/signups${toQuery(input ?? {})}`);
  },

  listStoreVerificationDocuments(storeId: string) {
    return jsonFetch<{
      rows: Array<{
        id: string;
        doc_type: "business_document" | "national_id" | "other";
        label: string;
        file_url: string;
        uploaded_at: string;
        status: "submitted" | "approved" | "rejected";
        review_note?: string;
      }>;
    }>(`/admin/stores/${encodeURIComponent(storeId)}/verification-documents`);
  },

  updateStoreVerificationDocument(
    storeId: string,
    docId: string,
    input: { status: "submitted" | "approved" | "rejected"; review_note?: string }
  ) {
    return jsonFetch<{
      updated: true;
      row: {
        id: string;
        status: "submitted" | "approved" | "rejected";
        review_note?: string;
      };
    }>(`/admin/stores/${encodeURIComponent(storeId)}/verification-documents/${encodeURIComponent(docId)}`, {
      method: "PATCH",
      body: JSON.stringify(input)
    });
  }
};
