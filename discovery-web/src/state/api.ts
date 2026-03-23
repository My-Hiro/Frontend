import type {
  AvailabilityStatus,
  HeroBannerModel,
  ItemPlacement,
  PlatformCategory,
  ProductCardModel,
  StoreMessageModel,
  StoreMessageThreadModel,
  StoreCardModel,
  VerificationStatus
} from "./types";
import {
  heroBanners as fallbackHeroBannersSeed,
  stores as fallbackStoreSeed
} from "../components/data";
import type {
  HeroBanner as FallbackHeroBanner,
  Product as FallbackProduct,
  Store as FallbackStore
} from "../components/data";

const API_BASE = process.env.NEXT_PUBLIC_API_BASE ?? "http://localhost:4000/api";
const AUTH_STORAGE_KEY = "myhiro_auth_discovery";
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const PHONE_PATTERN = /^\+?[1-9]\d{7,14}$/;
const FALLBACK_IMAGE = "https://images.unsplash.com/photo-1542838132-92c53300491e?w=400&q=70";
const API_BASE_POINTS_TO_LOCALHOST = /^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?/i.test(API_BASE);

type AuthRole = "admin" | "merchant" | "discovery_user";

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

const readSession = (): DiscoveryAuthSession | null => {
  if (typeof window === "undefined") return null;
  const raw = localStorage.getItem(AUTH_STORAGE_KEY);
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw) as DiscoveryAuthSession;
    if (!parsed?.accessToken || !parsed?.refreshToken || !parsed?.user) return null;
    return parsed;
  } catch {
    return null;
  }
};

const writeSession = (session: DiscoveryAuthSession | null): void => {
  if (typeof window === "undefined") return;
  if (!session) {
    localStorage.removeItem(AUTH_STORAGE_KEY);
    return;
  }
  localStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(session));
};

const mapAuthPayload = (payload: Record<string, unknown>): DiscoveryAuthSession => {
  const user = payload.user as Record<string, unknown>;
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

const fallbackAuthSession = (identifier: string, role: AuthRole): DiscoveryAuthSession => {
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

const toUiStoreMessage = (row: Record<string, unknown>): StoreMessageModel => ({
  id: String(row.id ?? ""),
  storeId: String(row.store_id ?? ""),
  storeName: row.store_name ? String(row.store_name) : undefined,
  threadKey: String(row.thread_key ?? ""),
  senderType: String(row.sender_type ?? "customer") === "store" ? "store" : "customer",
  senderName: row.sender_name ? String(row.sender_name) : undefined,
  senderContact: row.sender_contact ? String(row.sender_contact) : undefined,
  recipientIdentity: row.recipient_identity ? String(row.recipient_identity) : undefined,
  channel: row.channel ? (String(row.channel) as StoreMessageModel["channel"]) : "in_app",
  message: String(row.message ?? ""),
  createdAt: String(row.created_at ?? new Date().toISOString())
});

const toUiStoreThread = (row: Record<string, unknown>): StoreMessageThreadModel => ({
  threadKey: String(row.thread_key ?? ""),
  customerLabel: String(row.customer_label ?? "Customer"),
  lastMessage: String(row.last_message ?? ""),
  lastMessageAt: String(row.last_message_at ?? new Date().toISOString()),
  messageCount: Number(row.message_count ?? 0),
  channel: row.channel ? (String(row.channel) as StoreMessageThreadModel["channel"]) : "in_app",
  storeId: row.store_id ? String(row.store_id) : undefined,
  storeName: row.store_name ? String(row.store_name) : undefined
});

const refreshSession = async (): Promise<DiscoveryAuthSession | null> => {
  const current = readSession();
  if (!current?.refreshToken) return null;
  const response = await fetch(`${API_BASE}/auth/discovery/refresh`, {
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
  if (!shouldUseNetworkApi()) {
    throw new Error("Discovery API unavailable for this deployment.");
  }

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

  if (response.status === 401 && retryOnUnauthorized && session?.refreshToken) {
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

const clamp = (value: number, min: number, max: number): number => Math.min(max, Math.max(min, value));

const relativeTime = (iso: string): string => {
  const ms = new Date(iso).getTime();
  if (!Number.isFinite(ms)) {
    return "recently";
  }
  const deltaSec = Math.floor((Date.now() - ms) / 1000);
  if (deltaSec < 30) return "just now";
  if (deltaSec < 60) return `${deltaSec}s ago`;
  const deltaMin = Math.floor(deltaSec / 60);
  if (deltaMin < 60) return `${deltaMin}m ago`;
  const deltaHr = Math.floor(deltaMin / 60);
  if (deltaHr < 24) return `${deltaHr}h ago`;
  const deltaDay = Math.floor(deltaHr / 24);
  return `${deltaDay}d ago`;
};

const toVerificationStatus = (raw: unknown): VerificationStatus => {
  const value = String(raw ?? "").toLowerCase();
  if (value.includes("unverified")) return "unverified";
  if (value.includes("partner")) return "partner";
  if (value.includes("verified")) return "verified";
  return "unverified";
};

const toAvailabilityStatus = (raw: unknown, priceLabel?: string): AvailabilityStatus => {
  const price = String(priceLabel ?? "").toLowerCase();
  if (price.includes("price on request")) return "price-on-request";
  const value = String(raw ?? "").toLowerCase();
  if (value.includes("in")) return "in-stock";
  if (value.includes("low")) return "low-stock";
  return "out-of-stock";
};

const parseStockCount = (raw: unknown): number | undefined => {
  const value = String(raw ?? "");
  const match = value.match(/\d+/);
  if (!match) return undefined;
  const num = Number(match[0]);
  return Number.isFinite(num) ? num : undefined;
};

const parseDistanceKm = (distance: string): number => {
  const parsed = Number.parseFloat(distance.replace(/[^0-9.]+/g, ""));
  return Number.isFinite(parsed) ? parsed : Number.POSITIVE_INFINITY;
};

const sortStoresByDistance = (stores: StoreCardModel[]): StoreCardModel[] =>
  [...stores].sort((a, b) => {
    if (a.isSponsored !== b.isSponsored) {
      return Number(b.isSponsored) - Number(a.isSponsored);
    }
    const ad = parseDistanceKm(a.distance);
    const bd = parseDistanceKm(b.distance);
    if (ad !== bd) {
      return ad - bd;
    }
    return a.name.localeCompare(b.name);
  });

const shouldUseNetworkApi = (): boolean => {
  if (typeof window === "undefined") return true;
  if (!API_BASE_POINTS_TO_LOCALHOST) return true;
  const host = window.location.hostname.toLowerCase();
  return host === "localhost" || host === "127.0.0.1";
};

const slugify = (value: string): string =>
  value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");

const FALLBACK_CATEGORY_BLUEPRINT: Array<
  Omit<PlatformCategory, "subcategories"> & { defaultSubcategories?: string[] }
> = [
  {
    id: "groceries_food",
    name: "Food & Groceries",
    shortName: "Food",
    icon: "shopping-basket",
    imageUrl: "/images/categories/food-groceries.png",
    defaultSubcategories: ["Pantry Staples", "Fresh Produce", "Beverages"]
  },
  {
    id: "kids_babies",
    name: "Kids & Babies",
    shortName: "Kids",
    icon: "baby",
    imageUrl: "/images/categories/kids-babies.png",
    defaultSubcategories: ["Baby Essentials", "Schoolwear"]
  },
  {
    id: "pharmacy_health_wellness",
    name: "Pharmacy, Health & Wellness",
    shortName: "Pharmacy",
    icon: "pill",
    imageUrl: "/images/categories/pharmacy-health.png",
    defaultSubcategories: ["Pain & Fever", "Vitamins & Supplements"]
  },
  {
    id: "household_cleaning",
    name: "Home Decor, Household & Cleaning",
    shortName: "Home Decor",
    icon: "spray-can",
    imageUrl: "/images/categories/home-decor-household-cleaning.png",
    defaultSubcategories: ["Home Care", "Kitchen & Homeware"]
  },
  {
    id: "personal_care_beauty",
    name: "Personal Care & Beauty",
    shortName: "Beauty",
    icon: "sparkles",
    imageUrl: "https://images.unsplash.com/photo-1526045478516-99145907023c?w=1200&q=70",
    defaultSubcategories: ["Hair Care", "Skin & Body"]
  },
  {
    id: "electronics_appliances",
    name: "Electronics & Appliances",
    shortName: "Electronics",
    icon: "smartphone",
    imageUrl: "/images/categories/electronics-appliances.png",
    defaultSubcategories: ["Phones & Tablets", "Accessories"]
  },
  {
    id: "auto_spare_parts",
    name: "Auto & Spare Parts",
    shortName: "Auto Parts",
    icon: "wrench",
    imageUrl: "/images/categories/auto-spare-parts.png",
    defaultSubcategories: ["Brake Parts", "Engine Parts", "Filters"]
  },
  {
    id: "lighting_hardware",
    name: "Lighting, Building & Hardware",
    shortName: "Hardware",
    icon: "hammer",
    imageUrl: "/images/categories/lighting-building-hardware.png",
    defaultSubcategories: ["Lighting", "Electricals", "Paints & Finishes"]
  },
  {
    id: "office_school",
    name: "Office, Stationery, Books & School",
    shortName: "Stationery",
    icon: "notebook-pen",
    imageUrl: "https://images.unsplash.com/photo-1456735190827-d1262f71b8a3?w=1200&q=70",
    defaultSubcategories: ["Books", "Writing & Paper"]
  },
  {
    id: "fashion_clothing",
    name: "Fashion & Clothing",
    shortName: "Fashion",
    icon: "shirt",
    imageUrl: "/images/categories/fashion-clothing.png",
    defaultSubcategories: ["Dresses", "Tops", "Accessories"]
  },
  {
    id: "more",
    name: "More",
    shortName: "More",
    icon: "more-horizontal",
    imageUrl: "/images/categories/more.png",
    defaultSubcategories: ["Other (Specify)"]
  }
];

const LEGACY_STORE_CATEGORY_MAP: Record<string, string> = {
  "cat-1": "pharmacy_health_wellness",
  "cat-2": "electronics_appliances",
  "cat-3": "groceries_food",
  "cat-4": "fashion_clothing",
  "cat-5": "auto_spare_parts",
  "cat-6": "personal_care_beauty",
  "cat-7": "electronics_appliances",
  "cat-8": "household_cleaning"
};

const resolveFallbackStoreCategoryId = (store: FallbackStore): string => {
  const mapped = LEGACY_STORE_CATEGORY_MAP[store.categoryId];
  if (mapped) return mapped;
  const categoryText = store.category.toLowerCase();
  if (categoryText.includes("pharmacy") || categoryText.includes("health")) {
    return "pharmacy_health_wellness";
  }
  if (categoryText.includes("fashion")) {
    return "fashion_clothing";
  }
  if (categoryText.includes("spare") || categoryText.includes("auto")) {
    return "auto_spare_parts";
  }
  if (categoryText.includes("electronic") || categoryText.includes("phone")) {
    return "electronics_appliances";
  }
  if (categoryText.includes("grocery") || categoryText.includes("food")) {
    return "groceries_food";
  }
  if (categoryText.includes("beauty")) {
    return "personal_care_beauty";
  }
  if (categoryText.includes("home") || categoryText.includes("household")) {
    return "household_cleaning";
  }
  return "more";
};

const fallbackPlacement = (store: FallbackStore, product: FallbackProduct): ItemPlacement[] => [
  {
    categoryId: resolveFallbackStoreCategoryId(store),
    subcategoryId: `${resolveFallbackStoreCategoryId(store)}-${slugify(product.category || "general") || "general"}`,
    subcategoryLabel: product.category || "General",
    audienceLabel: "general"
  }
];

const toFallbackStoreCard = (store: FallbackStore): StoreCardModel => ({
  id: store.id,
  name: store.name,
  logo: store.logo || FALLBACK_IMAGE,
  rating: store.rating,
  verification: store.verification,
  distance: store.distance,
  eta: store.eta,
  openNow: store.openNow,
  isSponsored: store.isSponsored,
  lastUpdated: store.lastUpdated || "recently",
  description: store.description,
  phone: store.phone,
  address: store.address,
  hours: store.hours
});

const toFallbackProductCard = (
  store: FallbackStore,
  product: FallbackProduct
): ProductCardModel => ({
  id: product.id,
  name: product.name,
  image: product.image || FALLBACK_IMAGE,
  price: product.price,
  priceRange: product.priceRange,
  availability: product.availability,
  stockCount: product.stockCount,
  category: product.category,
  description: product.description,
  storeId: store.id,
  storeName: store.name,
  lastUpdated: product.lastUpdated || store.lastUpdated || "recently",
  placements: fallbackPlacement(store, product),
  otherStoreCount: product.otherStoreCount,
  isSponsored: store.isSponsored
});

const toFallbackHeroBanner = (banner: FallbackHeroBanner, index: number): HeroBannerModel => ({
  id: banner.id || `fallback-hero-${index + 1}`,
  image: banner.image || FALLBACK_IMAGE,
  title: banner.title,
  subtitle: banner.subtitle,
  isSponsored: banner.isSponsored,
  sponsorName: banner.sponsorName,
  link: banner.link,
  linkType: banner.link ? "custom_url" : "none"
});

const buildFallbackPlatformCategories = (): PlatformCategory[] => {
  const subcategoriesByCategory = new Map<string, Set<string>>();
  for (const store of fallbackStoreSeed) {
    const categoryId = resolveFallbackStoreCategoryId(store);
    const bucket = subcategoriesByCategory.get(categoryId) ?? new Set<string>();
    for (const product of store.products) {
      const label = product.category.trim();
      if (label) {
        bucket.add(label);
      }
    }
    subcategoriesByCategory.set(categoryId, bucket);
  }

  return FALLBACK_CATEGORY_BLUEPRINT.map((category) => {
    const dynamic = Array.from(subcategoriesByCategory.get(category.id) ?? new Set<string>());
    const merged = Array.from(new Set([...(category.defaultSubcategories ?? []), ...dynamic]));
    const subcategories = merged.map((label) => ({
      id: `${category.id}-${slugify(label) || "general"}`,
      name: label
    }));
    return {
      id: category.id,
      name: category.name,
      shortName: category.shortName,
      color: category.color,
      icon: category.icon,
      imageUrl: category.imageUrl,
      subcategories
    };
  });
};

const fallbackPlatformCategories = buildFallbackPlatformCategories();

const getFallbackHomeData = (): {
  heroBanners: HeroBannerModel[];
  suggested: StoreCardModel[];
  popularProducts: ProductCardModel[];
  sections: Array<{ categoryId: string; categoryName: string; stores: StoreCardModel[] }>;
} => {
  const heroBanners = fallbackHeroBannersSeed.map(toFallbackHeroBanner);
  const suggested = sortStoresByDistance(fallbackStoreSeed.map(toFallbackStoreCard));
  const popularProducts = fallbackStoreSeed
    .flatMap((store) => store.products.map((product) => toFallbackProductCard(store, product)))
    .slice(0, 24);
  const sections = fallbackPlatformCategories
    .map((category) => ({
      categoryId: category.id,
      categoryName: category.name,
      stores: sortStoresByDistance(
        fallbackStoreSeed
          .filter((store) => resolveFallbackStoreCategoryId(store) === category.id)
          .map((store) => toFallbackStoreCard(store))
      )
    }))
    .filter((section) => section.stores.length > 0);

  return { heroBanners, suggested, popularProducts, sections };
};

const getFallbackSponsoredBanners = (
  placement: "homepage_hero" | "store_profile" | "product_page" | "store_page" | "merchant_support"
): HeroBannerModel[] => {
  const sponsoredHero = fallbackHeroBannersSeed
    .filter((banner) => banner.isSponsored)
    .map((banner, index) => ({
      ...toFallbackHeroBanner(banner, index),
      sponsorName: banner.sponsorName || "Sponsored"
    }));

  if (placement === "homepage_hero") {
    return sponsoredHero;
  }

  if (placement === "store_profile" || placement === "store_page") {
    const sponsoredStores = fallbackStoreSeed.filter((store) => store.isSponsored);
    if (sponsoredStores.length === 0) {
      return sponsoredHero;
    }
    return sponsoredStores.map((store, index) => ({
      id: `fallback-${placement}-${store.id}-${index + 1}`,
      image: store.banner || store.logo || FALLBACK_IMAGE,
      title: store.name,
      subtitle: store.description,
      isSponsored: true,
      sponsorName: "Sponsored store",
      linkType: "discovery_store",
      linkTarget: store.id
    }));
  }

  if (placement === "product_page") {
    const productSource = fallbackStoreSeed
      .flatMap((store) => store.products.map((product) => ({ store, product })))
      .filter((entry) => entry.store.isSponsored);
    const rows = (productSource.length > 0
      ? productSource
      : fallbackStoreSeed.flatMap((store) => store.products.map((product) => ({ store, product })))
    ).slice(0, 3);
    return rows.map((entry, index) => ({
      id: `fallback-${placement}-${entry.product.id}-${index + 1}`,
      image: entry.product.image || entry.store.banner || FALLBACK_IMAGE,
      title: entry.product.name,
      subtitle: `Available at ${entry.store.name}`,
      isSponsored: true,
      sponsorName: entry.store.name,
      linkType: "discovery_product",
      linkTarget: entry.product.id
    }));
  }

  return [
    {
      id: "fallback-merchant-support",
      image: sponsoredHero[0]?.image || FALLBACK_IMAGE,
      title: "Grow your store on myHiro",
      subtitle: "Get discovered by nearby shoppers with live inventory.",
      isSponsored: true,
      sponsorName: "myHiro",
      linkType: "none"
    }
  ];
};

const findFallbackStore = (storeId: string): FallbackStore | undefined =>
  fallbackStoreSeed.find((store) => store.id === storeId);

const getFallbackCategoryStores = (categoryId: string): StoreCardModel[] =>
  sortStoresByDistance(
    fallbackStoreSeed
      .filter((store) => resolveFallbackStoreCategoryId(store) === categoryId)
      .map((store) => toFallbackStoreCard(store))
  );

const getFallbackStoreProducts = (storeId: string): ProductCardModel[] => {
  const fallbackStore = findFallbackStore(storeId);
  if (!fallbackStore) return [];
  return fallbackStore.products.map((product) => toFallbackProductCard(fallbackStore, product));
};

const getFallbackProduct = (
  productId: string,
  preferredStoreId?: string
): {
  product: ProductCardModel;
  store: StoreCardModel | null;
  alsoAvailableAt: Array<{ storeId: string; name: string; distance: string }>;
} | null => {
  const matches = fallbackStoreSeed.flatMap((store) =>
    store.products
      .filter((product) => product.id === productId)
      .map((product) => ({ store, product }))
  );

  if (matches.length === 0) return null;

  const primary =
    matches.find((entry) => entry.store.id === preferredStoreId) ??
    matches[0];
  const product = toFallbackProductCard(primary.store, primary.product);
  const store = toFallbackStoreCard(primary.store);
  const alsoAvailableAt = matches
    .filter((entry) => entry.store.id !== primary.store.id)
    .map((entry) => ({
      storeId: entry.store.id,
      name: entry.store.name,
      distance: entry.store.distance
    }));
  return { product, store, alsoAvailableAt };
};

const getFallbackSearchRows = (
  q: string,
  type: "item" | "store" | "mixed"
): Record<string, unknown> => {
  const query = q.trim().toLowerCase();
  if (!query) {
    return { rows: [], page: 1, total_pages: 1, total: 0 };
  }

  if (type === "store") {
    const rows = fallbackStoreSeed
      .filter((store) =>
        [store.name, store.category, store.description, ...store.productCategories]
          .join(" ")
          .toLowerCase()
          .includes(query)
      )
      .map((store) => ({
        id: store.id,
        name: store.name,
        rating: store.rating,
        distance: store.distance,
        verification_status: store.verification
      }));
    return { rows, page: 1, total_pages: 1, total: rows.length };
  }

  const grouped = new Map<
    string,
    {
      product_id: string;
      productName: string;
      image_url: string;
      category: string;
      stores: Array<Record<string, unknown>>;
    }
  >();

  for (const store of fallbackStoreSeed) {
    for (const product of store.products) {
      const haystack = [product.name, product.category, product.description, store.name]
        .join(" ")
        .toLowerCase();
      if (!haystack.includes(query)) continue;
      const key = product.name.trim().toLowerCase();
      const existing = grouped.get(key);
      const row = {
        store_id: store.id,
        store_name: store.name,
        distance: store.distance,
        price: product.price,
        availability: product.availability,
        verification: store.verification,
        sponsored: store.isSponsored
      };
      if (existing) {
        existing.stores.push(row);
        continue;
      }
      grouped.set(key, {
        product_id: product.id,
        productName: product.name,
        image_url: product.image || FALLBACK_IMAGE,
        category: product.category,
        stores: [row]
      });
    }
  }

  const rows = Array.from(grouped.values()).map((entry) => ({
    ...entry,
    stores: entry.stores.sort((a, b) => {
      const sponsoredDiff = Number(Boolean(b.sponsored)) - Number(Boolean(a.sponsored));
      if (sponsoredDiff !== 0) {
        return sponsoredDiff;
      }
      return parseDistanceKm(String(a.distance ?? "")) - parseDistanceKm(String(b.distance ?? ""));
    })
  }));
  return { rows, page: 1, total_pages: 1, total: rows.length };
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

const normalizePlacements = (raw: unknown): ItemPlacement[] | undefined => {
  if (!Array.isArray(raw) || raw.length === 0) return undefined;
  const placements = raw
    .map((entry) => entry as Record<string, unknown>)
    .map((entry) => ({
      categoryId: String(entry.category_id ?? "").trim(),
      subcategoryId: entry.subcategory_id ? String(entry.subcategory_id) : undefined,
      subcategoryLabel: String(entry.subcategory_label ?? "").trim() || "General",
      audienceLabel: normalizePlacementAudience(entry.audience_label)
    }))
    .filter((entry) => entry.categoryId.length > 0);
  return placements.length > 0 ? placements : undefined;
};

let platformCategoriesCache: PlatformCategory[] | null = null;
const HOME_CACHE_TTL_MS = 20_000;
let homeCache: { ts: number; value: unknown } | null = null;

export const discoveryAuthApi = {
  getSession: (): DiscoveryAuthSession | null => readSession(),
  async clearSession(): Promise<void> {
    const session = readSession();
    writeSession(null);
    if (!session?.refreshToken) return;
    await fetch(`${API_BASE}/auth/discovery/signout`, {
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
  }): Promise<DiscoveryAuthSession> {
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
      const payload = await jsonFetch<Record<string, unknown>>("/auth/discovery/signup", {
        method: "POST",
        body: JSON.stringify({
          phone: phone || undefined,
          whatsapp_number: input.whatsappNumber,
          email: email || undefined,
          password: input.password,
          role: "discovery_user"
        })
      });
      const session = mapAuthPayload(payload);
      writeSession(session);
      return session;
    } catch {
      const fallback = fallbackAuthSession(email || phone, "discovery_user");
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
    const payload = await jsonFetch<Record<string, unknown>>("/auth/discovery/signup/precheck", {
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
  async signInWithPassword(input: { identifier: string; password: string }): Promise<DiscoveryAuthSession> {
    const identifier = assertValidIdentifier(input.identifier);
    if (input.password.length < 8) {
      throw new Error("Password must be at least 8 characters.");
    }
    try {
      const payload = await jsonFetch<Record<string, unknown>>("/auth/discovery/signin", {
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
      const fallback = fallbackAuthSession(identifier, "discovery_user");
      writeSession(fallback);
      return fallback;
    }
  },
  async requestOtp(identifier: string, purpose: "signin" | "reset_password" | "signup_verify" | "phone_change") {
    const payload = await jsonFetch<Record<string, unknown>>("/auth/discovery/otp/request", {
      method: "POST",
      body: JSON.stringify({
        identifier,
        purpose
      })
    });
    return {
      challengeId: payload.challenge_id ? String(payload.challenge_id) : null,
      channel: payload.channel ? String(payload.channel) : null,
      devCode: payload.dev_code ? String(payload.dev_code) : null
    };
  },
  async signInWithOtp(input: { challengeId: string; code: string }): Promise<DiscoveryAuthSession> {
    const payload = await jsonFetch<Record<string, unknown>>("/auth/discovery/signin", {
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
    await jsonFetch<Record<string, unknown>>("/auth/discovery/otp/verify", {
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
    const payload = await jsonFetch<Record<string, unknown>>("/auth/discovery/forgot-password", {
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
    await jsonFetch<Record<string, unknown>>("/auth/discovery/reset-password", {
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
    await jsonFetch<Record<string, unknown>>("/auth/discovery/reset-password", {
      method: "POST",
      body: JSON.stringify({
        method: "token",
        token: input.token,
        new_password: input.newPassword
      })
    });
  }
};

export const discoveryApi = {
  async getPlatformCategories(force = false): Promise<PlatformCategory[]> {
    if (!force && platformCategoriesCache) return platformCategoriesCache;
    try {
      const raw = await jsonFetch<Array<Record<string, unknown>>>(`/platform/categories`);
      platformCategoriesCache = raw.map((row) => ({
        id: String(row.id),
        name: String(row.name),
        shortName: row.short_name ? String(row.short_name) : undefined,
        color: row.color ? String(row.color) : undefined,
        icon: row.icon ? String(row.icon) : undefined,
        imageUrl: row.image_url ? String(row.image_url) : undefined,
        subcategories: Array.isArray(row.subcategories)
          ? (row.subcategories as Array<Record<string, unknown>>).map((subcat) => ({
              id: String(subcat.id),
              name: String(subcat.name)
            }))
          : []
      }));
      return platformCategoriesCache;
    } catch {
      platformCategoriesCache = fallbackPlatformCategories;
      return platformCategoriesCache;
    }
  },

  async getHome(force = false): Promise<{
    heroBanners: HeroBannerModel[];
    suggested: StoreCardModel[];
    popularProducts: ProductCardModel[];
    sections: Array<{ categoryId: string; categoryName: string; stores: StoreCardModel[] }>;
  }> {
    if (!force && homeCache) {
      if (Date.now() - homeCache.ts < HOME_CACHE_TTL_MS) {
        return homeCache.value as Awaited<ReturnType<typeof discoveryApi.getHome>>;
      }
    }
    try {
      const categories = await discoveryApi.getPlatformCategories();
      const categoryById = new Map(categories.map((entry) => [entry.id, entry] as const));

      const [raw, heroRows] = await Promise.all([
        jsonFetch<Record<string, unknown>>(`/discovery/home`),
        jsonFetch<Array<Record<string, unknown>>>("/discovery/banners?placement=homepage_hero").catch(
          () => []
        )
      ]);
      const hero = (raw.hero as Record<string, unknown> | undefined) ?? {};
      const heroBanners: HeroBannerModel[] = heroRows.length
        ? heroRows.map((entry, index) => ({
            id: String(entry.id ?? `hero-${index}`),
            image: String(entry.image ?? ""),
            title: String(entry.title ?? "Discover nearby trusted stores"),
            subtitle: String(entry.subtitle ?? "Find items fast with live inventory signals"),
            isSponsored: true,
            sponsorName: String(entry.label ?? "Sponsored"),
            link: entry.link ? String(entry.link) : undefined,
            linkType: entry.link_type
              ? (String(entry.link_type) as HeroBannerModel["linkType"])
              : "none",
            linkTarget: entry.link_target ? String(entry.link_target) : undefined
          }))
        : [
            {
              id: String(hero.id ?? "hero-api"),
              image: String(hero.image ?? ""),
              title: String(hero.title ?? "Discover nearby trusted stores"),
              subtitle: String(hero.subtitle ?? "Find items fast with live inventory signals"),
              isSponsored: String(hero.label ?? "").toLowerCase() === "sponsored",
              sponsorName: String(hero.label ?? "") || undefined,
              link: hero.link ? String(hero.link) : undefined,
              linkType: hero.link_type
                ? (String(hero.link_type) as HeroBannerModel["linkType"])
                : "none",
              linkTarget: hero.link_target ? String(hero.link_target) : undefined
            }
          ];

      const suggestedRaw = Array.isArray(raw.suggested) ? (raw.suggested as Array<Record<string, unknown>>) : [];
      const suggested = sortStoresByDistance(suggestedRaw.map((store) => ({
        id: String(store.id),
        name: String(store.name ?? "Store"),
        logo: String(store.logo ?? "") || FALLBACK_IMAGE,
        rating: Number(store.rating ?? 0),
        verification: toVerificationStatus(store.verification_status ?? store.verification),
        distance: String(store.distance ?? ""),
        eta: "",
        openNow: true,
        isSponsored: false,
        lastUpdated: store.last_inventory_update ? relativeTime(String(store.last_inventory_update)) : "recently",
        description: "Popular store near you",
        phone: "",
        address: "",
        hours: ""
      })));

      const sectionsRaw = Array.isArray(raw.sections) ? (raw.sections as Array<Record<string, unknown>>) : [];
      const sections = sectionsRaw.map((section) => {
        const categoryId = String(section.category_id ?? "");
        const category = categoryById.get(categoryId);
        const storesRaw = Array.isArray(section.stores) ? (section.stores as Array<Record<string, unknown>>) : [];
        const stores = sortStoresByDistance(storesRaw.map((store) => ({
          id: String(store.id),
          name: String(store.name ?? "Store"),
          logo:
            String(store.logo ?? "") ||
            category?.imageUrl ||
            FALLBACK_IMAGE,
          rating: Number(store.rating ?? 0),
          verification: toVerificationStatus(
            store.verification_status ?? store.trust_indicator ?? store.verification
          ),
          distance: String(store.distance ?? ""),
          eta: String(store.eta ?? ""),
          openNow: true,
          isSponsored: Boolean(store.sponsored),
          lastUpdated: store.last_inventory_update ? relativeTime(String(store.last_inventory_update)) : "recently",
          description: String(store.descriptor ?? "") || "Nearby store",
          phone: "",
          address: "",
          hours: ""
        })));
        return {
          categoryId,
          categoryName: String(section.category ?? category?.name ?? categoryId),
          stores
        };
      });

      const popularRaw = Array.isArray(raw.popular_products)
        ? (raw.popular_products as Array<Record<string, unknown>>)
        : [];
      const popularProducts: ProductCardModel[] = popularRaw.map((product) => ({
        id: String(product.id ?? ""),
        name: String(product.name ?? "Item"),
        image:
          String(product.image_url ?? "") ||
          FALLBACK_IMAGE,
        price: String(product.price_label ?? "Price on request"),
        availability: toAvailabilityStatus(product.availability, String(product.price_label ?? "")),
        stockCount: parseStockCount(product.stock_indicator),
        category: String(product.category ?? "General"),
        description: "",
        storeId: String(product.store_id ?? ""),
        storeName: String(product.store_name ?? "Store"),
        lastUpdated: "recently",
        placements: normalizePlacements(product.placements),
        isSponsored: Boolean(product.sponsored),
        whyThisAd: product.why_this_ad ? String(product.why_this_ad) : undefined
      }));

      const parsed = { heroBanners, suggested, popularProducts, sections };
      homeCache = { ts: Date.now(), value: parsed };
      return parsed;
    } catch {
      const fallback = getFallbackHomeData();
      homeCache = { ts: Date.now(), value: fallback };
      return fallback;
    }
  },

  async getSponsoredBanner(
    placement: "homepage_hero" | "store_profile" | "product_page" | "store_page" | "merchant_support" = "homepage_hero",
    force = false
  ): Promise<HeroBannerModel | null> {
    const rows = await discoveryApi.getSponsoredBanners(placement, force);
    return rows[0] ?? null;
  },

  async getSponsoredBanners(
    placement: "homepage_hero" | "store_profile" | "product_page" | "store_page" | "merchant_support" = "homepage_hero",
    force = false
  ): Promise<HeroBannerModel[]> {
    const mapBanner = (raw: Record<string, unknown>, fallbackId: string): HeroBannerModel => ({
      id: String(raw.id ?? fallbackId),
      image: String(raw.image ?? ""),
      title: String(raw.title ?? "Sponsored"),
      subtitle: String(raw.subtitle ?? ""),
      isSponsored: true,
      sponsorName: String(raw.label ?? "Sponsored"),
      link: raw.link ? String(raw.link) : undefined,
      linkType: raw.link_type
        ? (String(raw.link_type) as HeroBannerModel["linkType"])
        : "none",
      linkTarget: raw.link_target ? String(raw.link_target) : undefined
    });

    if (!shouldUseNetworkApi()) {
      return getFallbackSponsoredBanners(placement);
    }

    const rows = await jsonFetch<Array<Record<string, unknown>>>(
      `/discovery/banners?placement=${encodeURIComponent(placement)}`
    ).catch(() => []);

    if (rows.length > 0) {
      return rows.map((entry, index) => mapBanner(entry, `banner-${placement}-${index}`));
    }

    if (placement === "homepage_hero") {
      const home = await discoveryApi.getHome(force);
      return home.heroBanners.filter((entry) => entry.isSponsored);
    }

    const fallback = await jsonFetch<Record<string, unknown> | null>(
      `/discovery/banner?placement=${encodeURIComponent(placement)}`
    ).catch(() => null);
    if (!fallback) {
      return getFallbackSponsoredBanners(placement);
    }
    return [mapBanner(fallback, `banner-${placement}-fallback`)];
  },

  async getCategoryStores(categoryId: string): Promise<StoreCardModel[]> {
    const categories = await discoveryApi.getPlatformCategories();
    const category = categories.find((entry) => entry.id === categoryId);
    try {
      const raw = await jsonFetch<Array<Record<string, unknown>>>(
        `/discovery/categories/${encodeURIComponent(categoryId)}/stores`,
      );

      return sortStoresByDistance(raw.map((store) => ({
        id: String(store.id),
        name: String(store.name ?? "Store"),
        logo:
          String(store.logo ?? "") ||
          category?.imageUrl ||
          FALLBACK_IMAGE,
        rating: Number(store.rating ?? 0),
        verification: toVerificationStatus(store.trust_indicator),
        distance: String(store.distance ?? ""),
        eta: String(store.eta ?? ""),
        openNow: true,
        isSponsored: Boolean(store.sponsored),
        lastUpdated: store.last_inventory_update ? relativeTime(String(store.last_inventory_update)) : "recently",
        description: String(store.descriptor ?? "") || "Nearby store",
        phone: "",
        address: "",
        hours: "",
      })));
    } catch {
      return getFallbackCategoryStores(categoryId);
    }
  },

  async getStore(
    storeId: string
  ): Promise<StoreCardModel & { segments: string[]; banner: string; lastInventoryUpdateIso?: string }> {
    try {
      const store = await jsonFetch<Record<string, unknown>>(`/stores/${encodeURIComponent(storeId)}`);
      const last = store.last_inventory_update ? String(store.last_inventory_update) : undefined;
      const segments = Array.isArray(store.segments) ? (store.segments as string[]).map(String) : [];
      const banner =
        String(store.banner ?? "") || "https://images.unsplash.com/photo-1604719312566-8912e9c8a213?w=1200&q=70";
      return {
        id: String(store.id ?? storeId),
        name: String(store.name ?? "Store"),
        logo:
          String(store.logo ?? "") || FALLBACK_IMAGE,
        banner,
        rating: Number(store.rating ?? 0),
        verification: toVerificationStatus(store.verification_status ?? store.verification),
        distance: "",
        eta: "",
        openNow: String(store.open_status ?? "").toLowerCase().includes("open"),
        isSponsored: false,
        lastUpdated: last ? relativeTime(last) : "recently",
        description: String(store.description ?? ""),
        phone: String(store.phone ?? ""),
        address: String(store.address ?? ""),
        hours: String(store.hours ?? ""),
        segments,
        lastInventoryUpdateIso: last
      };
    } catch {
      const fallbackStore = findFallbackStore(storeId);
      if (!fallbackStore) {
        throw new Error("Store not found");
      }
      return {
        ...toFallbackStoreCard(fallbackStore),
        banner: fallbackStore.banner || fallbackStore.logo || FALLBACK_IMAGE,
        segments: [fallbackStore.categoryId]
      };
    }
  },

  async getStoreProducts(storeId: string): Promise<ProductCardModel[]> {
    const store = await discoveryApi.getStore(storeId);
    try {
      const raw = await jsonFetch<Array<Record<string, unknown>>>(`/stores/${encodeURIComponent(storeId)}/products`);
      return raw.map((product) => ({
        id: String(product.id),
        name: String(product.name ?? "Item"),
        image:
          String(product.image_url ?? "") ||
          FALLBACK_IMAGE,
        price: String(product.price_label ?? "Price on request"),
        availability: toAvailabilityStatus(product.availability, String(product.price_label ?? "")),
        stockCount: parseStockCount(product.stock_indicator),
        category: String(product.category ?? "General"),
        description: "",
        storeId,
        storeName: store.name,
        lastUpdated: store.lastInventoryUpdateIso ? relativeTime(store.lastInventoryUpdateIso) : store.lastUpdated,
        placements: normalizePlacements(product.placements)
      }));
    } catch {
      return getFallbackStoreProducts(storeId);
    }
  },

  async getProduct(productId: string, storeId?: string): Promise<{
    product: ProductCardModel;
    store: StoreCardModel | null;
    alsoAvailableAt: Array<{ storeId: string; name: string; distance: string }>;
  } | null> {
    const raw = await jsonFetch<Record<string, unknown>>(
      `/products/${encodeURIComponent(productId)}${storeId ? `?store_id=${encodeURIComponent(storeId)}` : ""}`
    ).catch(() => null);
    if (!raw) {
      return getFallbackProduct(productId, storeId);
    }

    const storeRaw = (raw.store as Record<string, unknown> | null | undefined) ?? null;
    const store: StoreCardModel | null = storeRaw
      ? {
          id: String(storeRaw.id),
          name: String(storeRaw.name ?? "Store"),
          logo: FALLBACK_IMAGE,
          rating: 0,
          verification: toVerificationStatus(
            storeRaw.verification ?? storeRaw.trust_indicator ?? "unverified"
          ),
          distance: "",
          eta: "",
          openNow: true,
          isSponsored: false,
          lastUpdated: "recently",
          description: "",
          phone: "",
          address: String(storeRaw.address ?? ""),
          hours: String(storeRaw.hours ?? "")
        }
      : null;

    const product: ProductCardModel = {
      id: String(raw.id),
      name: String(raw.name ?? "Item"),
      image:
        String(raw.image_url ?? "") ||
        FALLBACK_IMAGE,
      price: String(raw.price_label ?? "Price on request"),
      availability: toAvailabilityStatus(raw.availability, String(raw.price_label ?? "")),
      stockCount: parseStockCount(raw.stock_indicator),
      category: String(raw.category ?? "General"),
      description: String(raw.description ?? ""),
      storeId: String(raw.store_id ?? storeId ?? ""),
      storeName: store?.name ?? "Store",
      lastUpdated: "recently",
      placements: normalizePlacements(raw.placements),
      otherStoreCount: Array.isArray(raw.also_available_at) ? (raw.also_available_at as unknown[]).length : undefined
    };

    const alsoAvailableAt = Array.isArray(raw.also_available_at)
      ? (raw.also_available_at as Array<Record<string, unknown>>).map((entry) => ({
          storeId: String(entry.store_id ?? ""),
          name: String(entry.name ?? "Store"),
          distance: String(entry.distance ?? "")
        }))
      : [];

    return { product, store, alsoAvailableAt };
  },

  async search(input: { q: string; type?: "item" | "store" | "mixed"; page?: number }) {
    const q = input.q.trim();
    const type = input.type ?? "mixed";
    const page = clamp(input.page ?? 1, 1, 1000);
    try {
      return await jsonFetch<Record<string, unknown>>(
        `/discovery/search?q=${encodeURIComponent(q)}&type=${encodeURIComponent(type)}&page=${page}`
      );
    } catch {
      return getFallbackSearchRows(q, type);
    }
  },

  async trackEvent(input: {
    type:
      | "impression"
      | "click"
      | "view"
      | "save"
      | "request"
      | "call"
      | "directions"
      | "no_result";
    storeId?: string;
    itemId?: string;
    metadata?: Record<string, unknown>;
  }): Promise<void> {
    await jsonFetch("/events", {
      method: "POST",
      body: JSON.stringify({
        type: input.type,
        store_id: input.storeId,
        item_id: input.itemId,
        metadata: input.metadata ?? {}
      })
    });
  },

  async sendStoreMessage(input: {
    storeId: string;
    message: string;
    senderName?: string;
    senderContact?: string;
    recipientIdentity?: string;
    channel?: "in_app" | "whatsapp" | "sms" | "email";
    threadKey?: string;
  }): Promise<void> {
    await jsonFetch("/messages", {
      method: "POST",
      body: JSON.stringify({
        store_id: input.storeId,
        sender_type: "customer",
        sender_name: input.senderName,
        sender_contact: input.senderContact,
        recipient_identity: input.recipientIdentity,
        channel: input.channel ?? "in_app",
        thread_key: input.threadKey,
        message: input.message
      })
    });
  },

  async listMyMessages(input: {
    identity: string;
    threadKey?: string;
    channel?: "in_app" | "whatsapp" | "sms" | "email";
  }): Promise<{ rows: StoreMessageModel[]; threads: StoreMessageThreadModel[] }> {
    const params = new URLSearchParams();
    params.set("recipient_identity", input.identity);
    if (input.threadKey?.trim()) {
      params.set("thread_key", input.threadKey.trim());
    }
    if (input.channel) {
      params.set("channel", input.channel);
    }
    const payload = await jsonFetch<{
      rows: Array<Record<string, unknown>>;
      threads: Array<Record<string, unknown>>;
    }>(`/messages?${params.toString()}`);
    return {
      rows: payload.rows.map(toUiStoreMessage),
      threads: payload.threads.map(toUiStoreThread)
    };
  },

  async reportStoreAbuse(
    storeId: string,
    input: { reason: string; details?: string; productId?: string }
  ): Promise<void> {
    await jsonFetch(`/stores/${encodeURIComponent(storeId)}/report-abuse`, {
      method: "POST",
      body: JSON.stringify({
        product_id: input.productId,
        reason: input.reason,
        details: input.details
      })
    });
  },

  async addBookmark(type: 'store' | 'item' | 'search', targetId: string, metadata?: any): Promise<void> {
    await jsonFetch('/bookmarks', {
      method: 'POST',
      body: JSON.stringify({ type, target_id: targetId, metadata })
    });
  },

  async getBookmarks(type?: 'store' | 'item' | 'search'): Promise<any[]> {
    return jsonFetch(`/bookmarks${type ? `?type=${type}` : ''}`);
  },

  async removeBookmark(type: string, targetId: string): Promise<void> {
    await jsonFetch(`/bookmarks/${type}/${targetId}`, {
      method: 'DELETE'
    });
  }
  };

  async addBookmark(type: 'store' | 'item' | 'search', targetId: string, metadata?: any): Promise<void> {
    await jsonFetch('/bookmarks', {
      method: 'POST',
      body: JSON.stringify({ type, target_id: targetId, metadata })
    });
  },

  async getBookmarks(type?: 'store' | 'item' | 'search'): Promise<any[]> {
    return jsonFetch(`/bookmarks${type ? `?type=${type}` : ''}`);
  },

  async removeBookmark(type: string, targetId: string): Promise<void> {
    await jsonFetch(`/bookmarks/${type}/${targetId}`, {
      method: 'DELETE'
    });
  }
};
