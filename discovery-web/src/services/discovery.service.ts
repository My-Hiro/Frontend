import { CONFIG } from "../lib/config";
import { relativeTime, slugify, clamp } from "../lib/utils";
import type { 
  HeroBannerModel, 
  PlatformCategory, 
  ProductCardModel, 
  StoreCardModel,
  VerificationStatus,
  AvailabilityStatus,
  ItemPlacement,
  StoreMessageModel,
  StoreMessageThreadModel
} from "../types";
import {
  heroBanners as fallbackHeroBannersSeed,
  stores as fallbackStoreSeed
} from "@/components/features/data";
import type {
  HeroBanner as FallbackHeroBanner,
  Product as FallbackProduct,
  Store as FallbackStore
} from "@/components/features/data";

const FALLBACK_IMAGE = "https://images.unsplash.com/photo-1542838132-92c53300491e?w=400&q=70";

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

const normalizePlacements = (raw: unknown): ItemPlacement[] | undefined => {
  if (!Array.isArray(raw) || raw.length === 0) return undefined;
  const placements = raw
    .map((entry) => entry as Record<string, unknown>)
    .map((entry) => ({
      categoryId: String(entry.category_id ?? "").trim(),
      subcategoryId: entry.subcategory_id ? String(entry.subcategory_id) : undefined,
      subcategoryLabel: String(entry.subcategory_label ?? "").trim() || "General",
      audienceLabel: (String(entry.audience_label ?? "").toLowerCase() as any) || "general"
    }))
    .filter((entry) => entry.categoryId.length > 0);
  return placements.length > 0 ? placements : undefined;
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

export const discoveryService = {
  async jsonFetch<T>(path: string, options?: RequestInit): Promise<T> {
    const url = `${CONFIG.API_BASE}${path}`;
    const response = await fetch(url, {
      ...options,
      headers: {
        "Content-Type": "application/json",
        ...options?.headers,
      },
      next: { revalidate: 60, ...options?.next }, // Default 1 min cache
    });

    if (!response.ok) {
      throw new Error(`API error: ${response.status}`);
    }

    return response.json() as Promise<T>;
  },

  async getPlatformCategories(): Promise<PlatformCategory[]> {
    try {
      const raw = await this.jsonFetch<any[]>("/platform/categories");
      return raw.map((row) => ({
        id: String(row.id),
        name: String(row.name),
        shortName: row.short_name ? String(row.short_name) : undefined,
        color: row.color ? String(row.color) : undefined,
        icon: row.icon ? String(row.icon) : undefined,
        imageUrl: row.image_url ? String(row.image_url) : undefined,
        subcategories: Array.isArray(row.subcategories)
          ? row.subcategories.map((subcat: any) => ({
              id: String(subcat.id),
              name: String(subcat.name)
            }))
          : []
      }));
    } catch {
      return fallbackPlatformCategories;
    }
  },

  async getHome(): Promise<{
    heroBanners: HeroBannerModel[];
    suggested: StoreCardModel[];
    popularProducts: ProductCardModel[];
    sections: Array<{ categoryId: string; categoryName: string; stores: StoreCardModel[] }>;
  }> {
    try {
      const categories = await this.getPlatformCategories();
      const categoryById = new Map(categories.map((entry) => [entry.id, entry] as const));

      const [raw, heroRows] = await Promise.all([
        this.jsonFetch<any>("/discovery/home"),
        this.jsonFetch<any[]>("/discovery/banners?placement=homepage_hero").catch(() => [])
      ]);

      const hero = raw.hero ?? {};
      const heroBanners: HeroBannerModel[] = heroRows.length
        ? heroRows.map((entry, index) => ({
            id: String(entry.id ?? `hero-${index}`),
            image: String(entry.image ?? ""),
            title: String(entry.title ?? "Discover nearby trusted stores"),
            subtitle: String(entry.subtitle ?? "Find items fast with live inventory signals"),
            isSponsored: true,
            sponsorName: String(entry.label ?? "Sponsored"),
            link: entry.link ? String(entry.link) : undefined,
            linkType: entry.link_type as any ?? "none",
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
              linkType: hero.link_type as any ?? "none",
              linkTarget: hero.link_target ? String(hero.link_target) : undefined
            }
          ];

      const suggestedRaw = Array.isArray(raw.suggested) ? raw.suggested : [];
      const suggested = sortStoresByDistance(suggestedRaw.map((store: any) => ({
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

      const sectionsRaw = Array.isArray(raw.sections) ? raw.sections : [];
      const sections = sectionsRaw.map((section: any) => {
        const categoryId = String(section.category_id ?? "");
        const category = categoryById.get(categoryId);
        const storesRaw = Array.isArray(section.stores) ? section.stores : [];
        const stores = sortStoresByDistance(storesRaw.map((store: any) => ({
          id: String(store.id),
          name: String(store.name ?? "Store"),
          logo: String(store.logo ?? "") || category?.imageUrl || FALLBACK_IMAGE,
          rating: Number(store.rating ?? 0),
          verification: toVerificationStatus(store.verification_status ?? store.trust_indicator ?? store.verification),
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

      const popularRaw = Array.isArray(raw.popular_products) ? raw.popular_products : [];
      const popularProducts: ProductCardModel[] = popularRaw.map((product: any) => ({
        id: String(product.id ?? ""),
        name: String(product.name ?? "Item"),
        image: String(product.image_url ?? "") || FALLBACK_IMAGE,
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

      return { heroBanners, suggested, popularProducts, sections };
    } catch {
      return getFallbackHomeData();
    }
  },

  async getSponsoredBanners(
    placement: "homepage_hero" | "store_profile" | "product_page" | "store_page" | "merchant_support" = "homepage_hero"
  ): Promise<HeroBannerModel[]> {
    try {
      const rows = await this.jsonFetch<any[]>(`/discovery/banners?placement=${encodeURIComponent(placement)}`);
      return rows.map((entry, index) => ({
        id: String(entry.id ?? `banner-${placement}-${index}`),
        image: String(entry.image ?? ""),
        title: String(entry.title ?? "Sponsored"),
        subtitle: String(entry.subtitle ?? ""),
        isSponsored: true,
        sponsorName: String(entry.label ?? "Sponsored"),
        link: entry.link ? String(entry.link) : undefined,
        linkType: entry.link_type as any ?? "none",
        linkTarget: entry.link_target ? String(entry.link_target) : undefined
      }));
    } catch {
      return [];
    }
  },

  async getCategoryStores(categoryId: string): Promise<StoreCardModel[]> {
    try {
      const categories = await this.getPlatformCategories();
      const category = categories.find((entry) => entry.id === categoryId);
      const raw = await this.jsonFetch<any[]>(`/discovery/categories/${encodeURIComponent(categoryId)}/stores`);

      return sortStoresByDistance(raw.map((store) => ({
        id: String(store.id),
        name: String(store.name ?? "Store"),
        logo: String(store.logo ?? "") || category?.imageUrl || FALLBACK_IMAGE,
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

  async getStore(storeId: string): Promise<StoreCardModel> {
    try {
      const store = await this.jsonFetch<any>(`/stores/${encodeURIComponent(storeId)}`);
      const last = store.last_inventory_update ? String(store.last_inventory_update) : undefined;
      return {
        id: String(store.id ?? storeId),
        name: String(store.name ?? "Store"),
        logo: String(store.logo ?? "") || FALLBACK_IMAGE,
        banner: String(store.banner ?? "") || FALLBACK_IMAGE,
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
        segments: Array.isArray(store.segments) ? store.segments.map(String) : [],
        lastInventoryUpdateIso: last
      };
    } catch {
      const fallbackStore = findFallbackStore(storeId);
      if (!fallbackStore) throw new Error("Store not found");
      return {
        ...toFallbackStoreCard(fallbackStore),
        banner: fallbackStore.banner || fallbackStore.logo || FALLBACK_IMAGE,
        segments: [fallbackStore.categoryId]
      };
    }
  },

  async getStoreProducts(storeId: string): Promise<ProductCardModel[]> {
    try {
      const store = await this.getStore(storeId);
      const raw = await this.jsonFetch<any[]>(`/stores/${encodeURIComponent(storeId)}/products`);
      return raw.map((product) => ({
        id: String(product.id),
        name: String(product.name ?? "Item"),
        image: String(product.image_url ?? "") || FALLBACK_IMAGE,
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
    try {
      const raw = await this.jsonFetch<any>(
        `/products/${encodeURIComponent(productId)}${storeId ? `?store_id=${encodeURIComponent(storeId)}` : ""}`
      );

      const storeRaw = raw.store ?? null;
      const store: StoreCardModel | null = storeRaw
        ? {
            id: String(storeRaw.id),
            name: String(storeRaw.name ?? "Store"),
            logo: FALLBACK_IMAGE,
            rating: 0,
            verification: toVerificationStatus(storeRaw.verification ?? storeRaw.trust_indicator ?? "unverified"),
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
        image: String(raw.image_url ?? "") || FALLBACK_IMAGE,
        price: String(raw.price_label ?? "Price on request"),
        availability: toAvailabilityStatus(raw.availability, String(raw.price_label ?? "")),
        stockCount: parseStockCount(raw.stock_indicator),
        category: String(raw.category ?? "General"),
        description: String(raw.description ?? ""),
        storeId: String(raw.store_id ?? storeId ?? ""),
        storeName: store?.name ?? "Store",
        lastUpdated: "recently",
        placements: normalizePlacements(raw.placements),
        otherStoreCount: Array.isArray(raw.also_available_at) ? raw.also_available_at.length : undefined
      };

      const alsoAvailableAt = Array.isArray(raw.also_available_at)
        ? raw.also_available_at.map((entry: any) => ({
            storeId: String(entry.store_id ?? ""),
            name: String(entry.name ?? "Store"),
            distance: String(entry.distance ?? "")
          }))
        : [];

      return { product, store, alsoAvailableAt };
    } catch {
      return getFallbackProduct(productId, storeId);
    }
  },

  async search(input: { q: string; type?: "item" | "store" | "mixed"; page?: number }) {
    const q = input.q.trim();
    const type = input.type ?? "mixed";
    const page = clamp(input.page ?? 1, 1, 1000);
    try {
      return await this.jsonFetch<any>(
        `/discovery/search?q=${encodeURIComponent(q)}&type=${encodeURIComponent(type)}&page=${page}`
      );
    } catch {
      return { rows: [], page: 1, total_pages: 1, total: 0 };
    }
  },

  async trackEvent(input: {
    type: "impression" | "click" | "view" | "save" | "request" | "call" | "directions" | "no_result";
    storeId?: string;
    itemId?: string;
    metadata?: Record<string, any>;
  }): Promise<void> {
    try {
      await this.jsonFetch("/events", {
        method: "POST",
        body: JSON.stringify({
          type: input.type,
          store_id: input.storeId,
          item_id: input.itemId,
          metadata: input.metadata ?? {}
        })
      });
    } catch {
      // Ignore event tracking errors
    }
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
    await this.jsonFetch("/messages", {
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
    const payload = await this.jsonFetch<{
      rows: any[];
      threads: any[];
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
    await this.jsonFetch(`/stores/${encodeURIComponent(storeId)}/report-abuse`, {
      method: "POST",
      body: JSON.stringify({
        product_id: input.productId,
        reason: input.reason,
        details: input.details
      })
    });
  }
};
