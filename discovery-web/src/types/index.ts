export type AvailabilityStatus =
  | "in-stock"
  | "low-stock"
  | "out-of-stock"
  | "price-on-request";

export type VerificationStatus = "unverified" | "verified" | "partner";

export interface PlatformSubcategory {
  id: string;
  name: string;
}

export interface PlatformCategory {
  id: string;
  name: string;
  shortName?: string;
  color?: string;
  icon?: string;
  imageUrl?: string;
  subcategories: PlatformSubcategory[];
}

export type PlacementAudience = "general" | "men" | "women" | "boys" | "girls";

export interface ItemPlacement {
  categoryId: string;
  subcategoryId?: string;
  subcategoryLabel: string;
  audienceLabel?: PlacementAudience;
}

export interface StoreCardModel {
  id: string;
  name: string;
  logo: string;
  rating: number;
  verification: VerificationStatus;
  distance: string;
  eta: string;
  openNow: boolean;
  isSponsored: boolean;
  lastUpdated: string;
  description: string;
  phone: string;
  address: string;
  hours: string;
  segments?: string[];
  banner?: string;
  lastInventoryUpdateIso?: string;
}

export interface ProductCardModel {
  id: string;
  name: string;
  image: string;
  price: string;
  priceRange?: string;
  availability: AvailabilityStatus;
  stockCount?: number;
  category: string;
  description: string;
  storeId: string;
  storeName: string;
  lastUpdated: string;
  placements?: ItemPlacement[];
  otherStoreCount?: number;
  isSponsored?: boolean;
  whyThisAd?: string;
}

export interface HeroBannerModel {
  id: string;
  image: string;
  title: string;
  subtitle: string;
  isSponsored: boolean;
  sponsorName?: string;
  link?: string;
  linkType?:
    | "none"
    | "custom_url"
    | "discovery_page"
    | "discovery_store"
    | "discovery_product"
    | "merchant_page";
  linkTarget?: string;
}

export interface StoreMessageModel {
  id: string;
  storeId: string;
  storeName?: string;
  threadKey: string;
  senderType: "customer" | "store";
  senderName?: string;
  senderContact?: string;
  recipientIdentity?: string;
  channel: "in_app" | "whatsapp" | "sms" | "email";
  message: string;
  createdAt: string;
}

export interface StoreMessageThreadModel {
  threadKey: string;
  customerLabel: string;
  lastMessage: string;
  lastMessageAt: string;
  messageCount: number;
  channel: "in_app" | "whatsapp" | "sms" | "email";
  storeId?: string;
  storeName?: string;
}
