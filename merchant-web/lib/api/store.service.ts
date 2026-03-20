import { jsonFetch } from "./baseClient";
import { toUiItem } from "./inventory.service";
import type {
  NotificationPreferences,
  StoreOpenHour,
  StoreProfile,
  StoreVerificationDocument,
  Supplier,
} from "@/types";

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

export const toUiVerificationDocument = (row: Record<string, unknown>): StoreVerificationDocument => ({
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

export const storeService = {
  async bootstrap(storeId = "store-main-001") {
    const { toUiSale } = await import("./sales.service");
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
