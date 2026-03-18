import type {
  Category,
  InventoryItem,
  ItemPlacement,
  NotificationPreferences,
  Sale,
  StoreMessage,
  StoreMessageThread,
  StoreOpenHour,
  StoreProfile,
  StoreVerificationDocument,
  Supplier
} from "./types";

const API_BASE = import.meta.env.VITE_API_BASE ?? "http://localhost:4000/api";
const AUTH_STORAGE_KEY = "myhiro_auth_merchant";
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

export type MediaUploadPreset =
  | "product_image"
  | "store_logo"
  | "store_banner"
  | "ad_banner"
  | "verification_document";

const readSession = (): AuthSession | null => {
  if (typeof window === "undefined") return null;
  const raw = localStorage.getItem(AUTH_STORAGE_KEY);
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw) as AuthSession;
    if (!parsed?.accessToken || !parsed?.refreshToken || !parsed?.user) {
      return null;
    }
    return parsed;
  } catch {
    return null;
  }
};

const writeSession = (session: AuthSession | null): void => {
  if (typeof window === "undefined") return;
  if (!session) {
    localStorage.removeItem(AUTH_STORAGE_KEY);
    return;
  }
  localStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(session));
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

const fallbackAuthSession = (identifier: string, role: AuthRole): AuthSession => {
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
      email: isEmail ? normalized : null,
      phone_e164: isEmail ? null : normalized,
      whatsapp_e164: isEmail ? null : normalized,
      role,
      status: "active"
    }
  };
};

const mapAuthPayload = (payload: Record<string, unknown>): AuthSession => {
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

const refreshAuthSession = async (): Promise<AuthSession | null> => {
  const session = readSession();
  if (!session?.refreshToken) {
    return null;
  }
  const response = await fetch(`${API_BASE}/auth/merchant/refresh`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify({ refresh_token: session.refreshToken })
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
    const next = await refreshAuthSession();
    if (next?.accessToken) {
      return jsonFetch<T>(path, options, false);
    }
  }

  if (!response.ok) {
    throw new Error(await parseApiError(response));
  }
  return (await response.json()) as T;
};

const normalizePlacementAudience = (
  raw: unknown
): NonNullable<ItemPlacement["audienceLabel"]> => {
  const value = String(raw ?? "").toLowerCase();
  if (value === "men" || value === "women" || value === "boys" || value === "girls") {
    return value;
  }
  return "general";
};

const normalizePlacements = (row: Record<string, unknown>): ItemPlacement[] => {
  const raw = row.placements;
  if (Array.isArray(raw) && raw.length > 0) {
    const parsed = raw
      .map((entry): ItemPlacement | null => {
        const candidate = entry as Record<string, unknown>;
        const categoryId = String(candidate.category_id ?? "").trim();
        const subcategoryLabel = String(candidate.subcategory_label ?? "").trim();
        if (!categoryId) {
          return null;
        }
        const placement: ItemPlacement = {
          categoryId,
          subcategoryLabel: subcategoryLabel || "General",
          audienceLabel: normalizePlacementAudience(candidate.audience_label)
        };
        if (candidate.subcategory_id) {
          placement.subcategoryId = String(candidate.subcategory_id);
        }
        return placement;
      })
      .filter((entry): entry is ItemPlacement => entry !== null);
    if (parsed.length > 0) {
      return parsed;
    }
  }
  const legacyCategory = String(row.category ?? "").trim();
  const legacySubcategory = String(row.subcategory ?? "").trim();
  return [
    {
      categoryId: legacyCategory || "groceries_food",
      subcategoryLabel: legacySubcategory || "General",
      audienceLabel: "general"
    }
  ];
};

const toUiItem = (row: Record<string, unknown>): InventoryItem => {
  const placements = normalizePlacements(row);
  const primary = placements[0];
  return {
    id: String(row.id),
    name: String(row.name),
    sku: String(row.sku),
    barcode: String(row.barcode),
    category: primary?.categoryId ?? String(row.category ?? ""),
    subcategory: primary?.subcategoryLabel ?? String(row.subcategory ?? ""),
    placements,
    quantity: Number(row.quantity ?? 0),
    minQuantity: Number(row.min_quantity ?? 0),
    maxQuantity: Number(row.max_quantity ?? 0),
    unit: String(row.unit ?? "units"),
    costPrice: Number(row.cost_price ?? 0),
    sellingPrice: Number(row.selling_price ?? 0),
    taxMode: String(row.tax_mode ?? "percent") === "fixed" ? "fixed" : "percent",
    taxValue: Number(row.tax_value ?? 0),
    supplier: String(row.supplier ?? ""),
    location: String(row.location ?? "Main Store"),
    status: String(row.status ?? "in-stock") as InventoryItem["status"],
    expiryDate: row.expiry_date ? String(row.expiry_date) : undefined,
    batchNumber: row.batch_number ? String(row.batch_number) : undefined,
    lastRestocked: row.last_restocked ? String(row.last_restocked) : undefined,
    description: row.description ? String(row.description) : undefined,
    imageUrl: row.image_url ? String(row.image_url) : undefined
  };
};

const fromUiItem = (row: InventoryItem) => ({
  id: row.id,
  name: row.name,
  sku: row.sku,
  barcode: row.barcode,
  category: row.placements[0]?.categoryId ?? row.category,
  subcategory: row.placements[0]?.subcategoryLabel ?? row.subcategory,
  placements: row.placements.map((entry) => ({
    category_id: entry.categoryId,
    subcategory_id: entry.subcategoryId,
    subcategory_label: entry.subcategoryLabel,
    audience_label: normalizePlacementAudience(entry.audienceLabel)
  })),
  quantity: row.quantity,
  min_quantity: row.minQuantity,
  max_quantity: row.maxQuantity,
  unit: row.unit,
  cost_price: row.costPrice,
  selling_price: row.sellingPrice,
  tax_mode: row.taxMode,
  tax_value: row.taxValue,
  supplier: row.supplier,
  location: row.location,
  expiry_date: row.expiryDate,
  batch_number: row.batchNumber,
  last_restocked: row.lastRestocked,
  description: row.description,
  image_url: row.imageUrl
});

const toUiSale = (row: Record<string, unknown>): Sale => ({
  id: String(row.id),
  items: Array.isArray(row.lines)
    ? row.lines.map((line) => {
        const entry = line as Record<string, unknown>;
        return {
          itemId: String(entry.item_id),
          itemName: String(entry.item_name),
          quantity: Number(entry.quantity ?? 0),
          price: Number(entry.unit_price ?? 0),
          taxMode: String(entry.tax_mode ?? "percent") === "fixed" ? "fixed" : "percent",
          taxValue: Number(entry.tax_value ?? 0),
          lineSubtotal: Number(entry.line_subtotal ?? 0),
          taxAmount: Number(entry.tax_amount ?? 0),
          lineTotal: Number(entry.line_total ?? 0)
        };
      })
    : [],
  subtotal: Number(row.subtotal ?? 0),
  taxTotal: Number(row.tax_total ?? 0),
  grandTotal: Number(row.grand_total ?? row.total ?? 0),
  total: Number(row.total ?? 0),
  customerContact: row.customer_contact ? String(row.customer_contact) : undefined,
  customerEmail: row.customer_email ? String(row.customer_email) : undefined,
  date: String(row.sold_at ?? new Date().toISOString()),
  paymentMethod: String(row.payment_method ?? "Cash") as Sale["paymentMethod"],
  cashier: String(row.cashier ?? "Store Manager")
});

const toUiStoreMessage = (row: Record<string, unknown>): StoreMessage => ({
  id: String(row.id ?? ""),
  storeId: String(row.store_id ?? ""),
  threadKey: String(row.thread_key ?? ""),
  senderType: String(row.sender_type ?? "customer") === "store" ? "store" : "customer",
  senderName: row.sender_name ? String(row.sender_name) : undefined,
  senderContact: row.sender_contact ? String(row.sender_contact) : undefined,
  recipientIdentity: row.recipient_identity ? String(row.recipient_identity) : undefined,
  channel: row.channel
    ? (String(row.channel) as StoreMessage["channel"])
    : "in_app",
  message: String(row.message ?? ""),
  createdAt: String(row.created_at ?? new Date().toISOString())
});

const toUiStoreMessageThread = (row: Record<string, unknown>): StoreMessageThread => ({
  threadKey: String(row.thread_key ?? ""),
  customerLabel: String(row.customer_label ?? "Guest customer"),
  lastMessage: String(row.last_message ?? ""),
  lastMessageAt: String(row.last_message_at ?? new Date().toISOString()),
  messageCount: Number(row.message_count ?? 0),
  channel: row.channel
    ? (String(row.channel) as StoreMessageThread["channel"])
    : "in_app",
  storeId: row.store_id ? String(row.store_id) : undefined,
  storeName: row.store_name ? String(row.store_name) : undefined
});

const toUiVerificationDocument = (row: Record<string, unknown>): StoreVerificationDocument => ({
  id: String(row.id ?? ""),
  storeId: String(row.store_id ?? ""),
  docType:
    String(row.doc_type ?? "other") === "business_document"
      ? "business_document"
      : String(row.doc_type ?? "other") === "national_id"
        ? "national_id"
        : "other",
  label: String(row.label ?? ""),
  fileUrl: String(row.file_url ?? ""),
  uploadedAt: String(row.uploaded_at ?? new Date().toISOString()),
  status:
    String(row.status ?? "submitted") === "approved"
      ? "approved"
      : String(row.status ?? "submitted") === "rejected"
        ? "rejected"
        : "submitted",
  reviewNote: row.review_note ? String(row.review_note) : undefined
});

const defaultOpenHoursByDay = (): StoreOpenHour[] => [
  { day: "Mon", open: "07:00", close: "21:00" },
  { day: "Tue", open: "07:00", close: "21:00" },
  { day: "Wed", open: "07:00", close: "21:00" },
  { day: "Thu", open: "07:00", close: "21:00" },
  { day: "Fri", open: "07:00", close: "21:00" },
  { day: "Sat", open: "07:00", close: "21:00" },
  { day: "Sun", open: "08:00", close: "18:00" }
];

const parseStaffRole = (value: unknown): "admin" | "manager" | "cashier" | "viewer" => {
  const role = String(value ?? "viewer");
  if (role === "admin" || role === "manager" || role === "cashier" || role === "viewer") {
    return role;
  }
  return "viewer";
};

export const merchantAuthApi = {
  getSession: (): AuthSession | null => readSession(),
  clearSession: async (): Promise<void> => {
    const session = readSession();
    writeSession(null);
    if (!session?.refreshToken) return;
    await fetch(`${API_BASE}/auth/merchant/signout`, {
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
    try {
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
    } catch {
      const fallback = fallbackAuthSession(email || phone, "merchant");
      writeSession(fallback);
      return fallback;
    }
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
    try {
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
    } catch {
      const fallback = fallbackAuthSession(identifier, "merchant");
      writeSession(fallback);
      return fallback;
    }
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

export const merchantApi = {
  async listInventory(storeId = "store-main-001", limit = 200) {
    const inventory = await jsonFetch<{ data: Array<Record<string, unknown>> }>(
      `/merchant/inventory?store_id=${storeId}&limit=${limit}`
    );
    return inventory.data.map(toUiItem);
  },

  async bootstrap(storeId = "store-main-001"): Promise<{
    items: InventoryItem[];
    categories: Category[];
    suppliers: Supplier[];
    sales: Sale[];
    prefs?: NotificationPreferences;
  }> {
    const [inventory, categories, suppliers, sales, prefs] = await Promise.all([
      jsonFetch<{ data: Array<Record<string, unknown>> }>(
        `/merchant/inventory?store_id=${storeId}&limit=200`
      ),
      jsonFetch<Array<Record<string, unknown>>>(`/platform/categories`).then((rows) =>
        rows.map((row) => ({
          id: String(row.id),
          name: String(row.name),
          shortName: row.short_name ? String(row.short_name) : undefined,
          subcategories: Array.isArray(row.subcategories)
            ? (row.subcategories as Array<Record<string, unknown>>).map((subcat) => String(subcat.name ?? ""))
            : [],
          color: row.color ? String(row.color) : "#3257D0",
          icon: row.icon ? String(row.icon) : undefined,
          imageUrl: row.image_url ? String(row.image_url) : undefined
        }))
      ),
      jsonFetch<Supplier[]>(`/merchant/suppliers?store_id=${storeId}`),
      jsonFetch<Array<Record<string, unknown>>>(`/merchant/sales?store_id=${storeId}`),
      jsonFetch<Record<string, unknown>>(`/merchant/settings/notifications?store_id=${storeId}`)
        .then((raw) => {
          const lowStock = (raw.low_stock as Record<string, unknown> | undefined) ?? {};
          const expiring = (raw.expiring_products as Record<string, unknown> | undefined) ?? {};
          const daily = (raw.daily_reports as Record<string, unknown> | undefined) ?? {};
          const channels = Array.isArray(lowStock.channels) ? (lowStock.channels as string[]) : [];
          const contacts = (raw.contacts as Record<string, unknown> | undefined) ?? {};
          const quietHours = (raw.quiet_hours as Record<string, unknown> | undefined) ?? {};
          const priority = Array.isArray(raw.channel_priority)
            ? (raw.channel_priority as NotificationPreferences["channelPriority"])
            : (["whatsapp", "sms", "email", "in_app"] as NotificationPreferences["channelPriority"]);
          return {
            lowStockEnabled: Boolean(lowStock.enabled),
            expiringProductsEnabled: Boolean(expiring.enabled),
            dailyReportEnabled: Boolean(daily.enabled),
            channels: {
              in_app: channels.includes("in_app"),
              email: channels.includes("email"),
              whatsapp: channels.includes("whatsapp"),
              sms: channels.includes("sms")
            },
            channelPriority: priority,
            emails: Array.isArray(contacts.email) ? (contacts.email as string[]) : [],
            phones: Array.isArray(contacts.phone_e164) ? (contacts.phone_e164 as string[]) : [],
            thresholdMode: (lowStock.threshold_mode as "per_item_min" | "absolute") ?? "per_item_min",
            absoluteThreshold: Number((lowStock.absolute_threshold as number) ?? 5),
            fallbackEnabled: Boolean(raw.fallback_enabled),
            quietHoursStart: String(quietHours.start ?? "23:00"),
            quietHoursEnd: String(quietHours.end ?? "06:00"),
            timezone: String(quietHours.timezone ?? "Africa/Accra")
          };
        })
        .catch(() => undefined)
    ]);

    return {
      items: inventory.data.map(toUiItem),
      categories,
      suppliers,
      sales: sales.map(toUiSale),
      prefs
    };
  },

  async upsertItem(item: InventoryItem) {
    const payload = await jsonFetch<Record<string, unknown>>("/merchant/inventory/upsert", {
      method: "POST",
      body: JSON.stringify(fromUiItem(item))
    });
    return toUiItem(payload);
  },

  async uploadMedia(file: File, preset: MediaUploadPreset = "product_image"): Promise<string> {
    const form = new FormData();
    form.append("file", file);
    form.append("preset", preset);
    const response = await fetch(`${API_BASE}/media/upload`, {
      method: "POST",
      body: form
    });
    if (!response.ok) {
      throw new Error(`Upload failed: ${response.status}`);
    }
    const payload = (await response.json()) as { url?: string };
    const url = String(payload.url ?? "");
    if (!url) {
      throw new Error("Upload failed: missing url");
    }
    return url;
  },

  async uploadProductImage(file: File, preset: MediaUploadPreset = "product_image"): Promise<string> {
    return merchantApi.uploadMedia(file, preset);
  },

  async ingestProductImageUrl(inputUrl: string): Promise<string> {
    const payload = await jsonFetch<Record<string, unknown>>("/media/ingest", {
      method: "POST",
      body: JSON.stringify({ url: inputUrl })
    });
    const url = String(payload.url ?? "").trim();
    if (!url) {
      throw new Error("Ingest failed: missing url");
    }
    return url;
  },

  async adjustStock(
    storeId: string,
    input: { itemId: string; quantity: number; reason: string; warehouse: string }
  ) {
    const payload = await jsonFetch<Record<string, unknown>>("/merchant/inventory/adjust", {
      method: "POST",
      body: JSON.stringify({
        store_id: storeId,
        item_id: input.itemId,
        quantity: input.quantity,
        reason: input.reason,
        warehouse: input.warehouse
      })
    });
    return toUiItem(payload);
  },

  async importInventoryCsv(storeId: string, csv: string) {
    return jsonFetch<{ imported: number; skipped: number }>("/merchant/inventory/import-csv", {
      method: "POST",
      body: JSON.stringify({ store_id: storeId, csv })
    });
  },

  async getStoreProfile(storeId: string): Promise<StoreProfile> {
    const raw = await jsonFetch<Record<string, unknown>>(`/stores/${storeId}/profile`);
    const categories = Array.isArray(raw.categories)
      ? (raw.categories as unknown[]).map((entry) => String(entry)).filter(Boolean)
      : [String(raw.category ?? "groceries_food")];
    const openHoursByDay = Array.isArray(raw.open_hours_struct)
      ? (raw.open_hours_struct as Array<Record<string, unknown>>).map((entry) => ({
          day: String(entry.day ?? "Mon") as StoreOpenHour["day"],
          open: String(entry.open ?? "07:00"),
          close: String(entry.close ?? "21:00"),
          closed: Boolean(entry.closed)
        }))
      : defaultOpenHoursByDay();
    const staffAccounts = Array.isArray(raw.staff_accounts)
      ? (raw.staff_accounts as Array<Record<string, unknown>>).map((entry, index) => ({
          id: String(entry.id ?? `acct-${storeId}-${index + 1}`),
          name: String(entry.name ?? "Staff"),
          email: String(entry.email ?? ""),
          role: parseStaffRole(entry.role),
          active: entry.active !== false
        }))
      : [
          {
            id: "acct-1",
            name: "Store Admin",
            email: String(raw.contact_email ?? ""),
            role: "admin" as const,
            active: true
          }
        ];
    return {
      storeId: String(raw.store_id ?? storeId),
      name: String(raw.name ?? "Main Store"),
      category: String(raw.category ?? "groceries"),
      categories,
      storeType: String(raw.store_type ?? "Retail Store"),
      address: String(raw.address ?? ""),
      city: raw.city ? String(raw.city) : undefined,
      region: raw.region ? String(raw.region) : undefined,
      lat: typeof raw.lat === "number" ? raw.lat : undefined,
      lng: typeof raw.lng === "number" ? raw.lng : undefined,
      openHours: String(raw.open_hours ?? raw.hours ?? ""),
      openHoursByDay,
      contactEmail: String(raw.contact_email ?? ""),
      contactPhone: String(raw.contact_phone ?? ""),
      currency: String(raw.currency ?? "GHS"),
      language: String(raw.language ?? "en"),
      timezone: String(raw.timezone ?? "Africa/Accra"),
      dateFormat: (String(raw.date_format ?? "dmy") as StoreProfile["dateFormat"]) || "dmy",
      logoUrl: raw.logo_url ? String(raw.logo_url) : undefined,
      bannerUrl: raw.banner_url ? String(raw.banner_url) : undefined,
      staffAccounts,
      verification: (String(raw.verification ?? "Unverified") as StoreProfile["verification"]) || "Unverified",
      verificationSubmitted: Boolean(raw.verification_submitted),
      discoverable: Boolean(raw.discoverable),
      lastInventoryUpdate: raw.last_inventory_update ? String(raw.last_inventory_update) : undefined
    };
  },

  async updateStoreProfile(storeId: string, next: StoreProfile): Promise<void> {
    const body: Record<string, unknown> = {
      name: next.name,
      category: next.category,
      categories: next.categories,
      store_type: next.storeType,
      currency: next.currency,
      language: next.language,
      timezone: next.timezone,
      date_format: next.dateFormat,
      city: next.city,
      region: next.region,
      lat: next.lat,
      lng: next.lng,
      open_hours: next.openHours,
      open_hours_struct: next.openHoursByDay,
      logo_url: next.logoUrl,
      banner_url: next.bannerUrl,
      staff_accounts: next.staffAccounts
    };

    if (next.address.trim()) {
      body.address = next.address;
    }
    if (next.contactEmail.trim()) {
      body.contact_email = next.contactEmail;
    }
    if (next.contactPhone.trim()) {
      body.contact_phone = next.contactPhone;
    }
    await jsonFetch(`/stores/${storeId}/profile`, {
      method: "PATCH",
      body: JSON.stringify(body)
    });
  },

  getDiscoveryStoreShareLink(storeId: string): string {
    const base = (import.meta.env.VITE_DISCOVERY_URL as string | undefined) ?? "http://localhost:5175";
    return `${base.replace(/\/$/, "")}/?store=${encodeURIComponent(storeId)}`;
  },

  async listVerificationDocuments(storeId: string): Promise<StoreVerificationDocument[]> {
    const payload = await jsonFetch<{ rows: Array<Record<string, unknown>> }>(
      `/stores/${encodeURIComponent(storeId)}/verification-documents`
    );
    return payload.rows.map(toUiVerificationDocument);
  },

  async uploadVerificationDocument(
    storeId: string,
    input: { docType: "business_document" | "national_id" | "other"; label: string; fileUrl: string }
  ): Promise<StoreVerificationDocument> {
    const payload = await jsonFetch<Record<string, unknown>>(
      `/stores/${encodeURIComponent(storeId)}/verification-documents`,
      {
        method: "POST",
        body: JSON.stringify({
          doc_type: input.docType,
          label: input.label,
          file_url: input.fileUrl
        })
      }
    );
    return toUiVerificationDocument(payload);
  },

  async submitVerificationDocuments(storeId: string): Promise<void> {
    await jsonFetch(`/stores/${encodeURIComponent(storeId)}/verification/submit`, {
      method: "POST",
      body: JSON.stringify({})
    });
  },

  async getSupportBanner(): Promise<{
    id: string;
    title: string;
    subtitle: string;
    image: string;
    link?: string;
  } | null> {
    const payload = await jsonFetch<Record<string, unknown> | null>(
      "/discovery/banner?placement=merchant_support"
    ).catch(() => null);
    if (!payload) return null;
    return {
      id: String(payload.id ?? "merchant-support-banner"),
      title: String(payload.title ?? "myHiro support"),
      subtitle: String(payload.subtitle ?? ""),
      image: String(payload.image ?? ""),
      link: payload.link ? String(payload.link) : undefined
    };
  },

  async testNotificationChannel(
    storeId: string,
    input: { channel: NotificationPreferences["channelPriority"][number]; destination: string }
  ) {
    return jsonFetch<Record<string, unknown>>("/notifications/test-channel", {
      method: "POST",
      body: JSON.stringify({
        store_id: storeId,
        channel: input.channel,
        destination: input.destination
      })
    });
  },

  async exportReportsCsv(
    storeId: string,
    input: { range: string; start?: string; end?: string }
  ): Promise<string> {
    const response = await fetch(`${API_BASE}/merchant/reports/export`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        store_id: storeId,
        range: input.range,
        start: input.start,
        end: input.end
      })
    });
    if (!response.ok) {
      throw new Error(`Export failed: ${response.status}`);
    }
    return response.text();
  },

  async deleteItem(storeId: string, itemId: string) {
    const response = await fetch(`${API_BASE}/merchant/inventory/${itemId}?store_id=${storeId}`, {
      method: "DELETE"
    });
    if (!response.ok && response.status !== 204) {
      throw new Error(`Delete failed: ${response.status}`);
    }
  },

  async completeSale(storeId: string, sale: Omit<Sale, "id" | "date">) {
    return jsonFetch<Record<string, unknown>>("/merchant/sales/complete", {
      method: "POST",
      body: JSON.stringify({
        store_id: storeId,
        payment_method: sale.paymentMethod,
        cashier: sale.cashier,
        customer_contact: sale.customerContact,
        customer_email: sale.customerEmail,
        lines: sale.items.map((line) => ({
          item_id: line.itemId,
          item_name: line.itemName,
          quantity: line.quantity,
          unit_price: line.price
        }))
      })
    }).then(toUiSale);
  },

  async downloadReceiptPdf(storeId: string, saleId: string): Promise<Blob> {
    const response = await fetch(
      `${API_BASE}/merchant/sales/${encodeURIComponent(saleId)}/receipt.pdf?store_id=${encodeURIComponent(storeId)}`
    );
    if (!response.ok) {
      throw new Error(`Receipt download failed: ${response.status}`);
    }
    return response.blob();
  },

  async sendReceiptEmail(storeId: string, saleId: string, email: string) {
    return jsonFetch<Record<string, unknown>>(
      `/merchant/sales/${encodeURIComponent(saleId)}/receipt/email`,
      {
        method: "POST",
        body: JSON.stringify({ store_id: storeId, email })
      }
    );
  },

  async createReceiptWhatsAppLink(storeId: string, saleId: string, phone: string) {
    return jsonFetch<{
      sent: boolean;
      channel: string;
      destination: string;
      sale_id: string;
      receipt_url: string;
      whatsapp_link: string;
    }>(`/merchant/sales/${encodeURIComponent(saleId)}/receipt/whatsapp-link`, {
      method: "POST",
      body: JSON.stringify({ store_id: storeId, phone })
    });
  },

  async listStoreMessages(
    storeId: string,
    threadKey?: string,
    channel?: "in_app" | "whatsapp" | "sms" | "email"
  ) {
    const params = new URLSearchParams();
    params.set("store_id", storeId);
    if (threadKey?.trim()) {
      params.set("thread_key", threadKey.trim());
    }
    if (channel) {
      params.set("channel", channel);
    }
    const payload = await jsonFetch<{
      rows: Array<Record<string, unknown>>;
      threads: Array<Record<string, unknown>>;
    }>(`/messages?${params.toString()}`);
    return {
      rows: payload.rows.map(toUiStoreMessage),
      threads: payload.threads.map(toUiStoreMessageThread)
    };
  },

  async sendStoreMessage(
    storeId: string,
    input: { message: string; threadKey?: string; senderName?: string; senderContact?: string }
  ) {
    const payload = await jsonFetch<Record<string, unknown>>("/messages", {
      method: "POST",
      body: JSON.stringify({
        store_id: storeId,
        sender_type: "store",
        message: input.message,
        thread_key: input.threadKey,
        sender_name: input.senderName,
        sender_contact: input.senderContact
      })
    });
    return toUiStoreMessage(payload);
  },

  async updatePreferences(storeId: string, prefs: NotificationPreferences) {
    await jsonFetch("/merchant/settings/notifications", {
      method: "PUT",
      body: JSON.stringify({
        store_id: storeId,
        low_stock: {
          enabled: prefs.lowStockEnabled,
          channels: (Object.keys(prefs.channels) as Array<keyof typeof prefs.channels>).filter(
            (key) => prefs.channels[key]
          ),
          threshold_mode: prefs.thresholdMode,
          absolute_threshold: prefs.absoluteThreshold
        },
        expiring_products: {
          enabled: prefs.expiringProductsEnabled,
          days_threshold: 30
        },
        daily_reports: {
          enabled: prefs.dailyReportEnabled
        },
        contacts: {
          email: prefs.emails,
          phone_e164: prefs.phones
        },
        channel_priority: prefs.channelPriority,
        quiet_hours: {
          start: prefs.quietHoursStart,
          end: prefs.quietHoursEnd,
          timezone: prefs.timezone
        },
        fallback_enabled: prefs.fallbackEnabled
      })
    });
  }
};
