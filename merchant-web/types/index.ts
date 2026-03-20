export type ViewId =
  | "dashboard"
  | "inventory"
  | "categories"
  | "suppliers"
  | "sales"
  | "messages"
  | "reports"
  | "support"
  | "settings";

export type MenuMode = "basic" | "advanced";

export type InventoryStatus = "in-stock" | "low-stock" | "out-of-stock" | "expired";
export type TaxMode = "percent" | "fixed";
export type PlacementAudience = "general" | "men" | "women" | "boys" | "girls";

export interface ItemPlacement {
  categoryId: string;
  subcategoryId?: string;
  subcategoryLabel: string;
  audienceLabel?: PlacementAudience;
}

export interface InventoryItem {
  id: string;
  name: string;
  sku: string;
  barcode: string;
  category: string;
  subcategory: string;
  placements: ItemPlacement[];
  quantity: number;
  minQuantity: number;
  maxQuantity: number;
  unit: string;
  costPrice: number;
  sellingPrice: number;
  taxMode: TaxMode;
  taxValue: number;
  supplier: string;
  location: string;
  status: InventoryStatus;
  expiryDate?: string;
  batchNumber?: string;
  lastRestocked?: string;
  description?: string;
  imageUrl?: string;
}

export interface Category {
  id: string;
  name: string;
  shortName?: string;
  subcategories: string[];
  color: string;
  icon?: string;
  imageUrl?: string;
}

export interface CategoryStat {
  id: string;
  name: string;
  color: string;
  subcategories: string[];
  totalValue: number;
  totalUnits: number;
  productsCount: number;
  soldUnits: number;
  salesRevenue: number;
  lowStock: number;
  order: number;
}

export interface CategoryRollup {
  id: string;
  name: string;
  color: string;
  value: number;
  products: number;
  units: number;
}

export interface Supplier {
  id: string;
  name: string;
  contact: string;
  email: string;
  phone: string;
  address: string;
  rating: number;
}

export interface SaleLine {
  itemId: string;
  itemName: string;
  quantity: number;
  price: number;
  taxMode?: TaxMode;
  taxValue?: number;
  lineSubtotal?: number;
  taxAmount?: number;
  lineTotal?: number;
}

export interface Sale {
  id: string;
  items: SaleLine[];
  subtotal: number;
  taxTotal: number;
  grandTotal: number;
  total: number;
  customerName?: string;
  customerContact?: string;
  customerEmail?: string;
  date: string;
  status?: string;
  paymentMethod: "Cash" | "Card" | "Mobile";
  cashier: string;
}

export interface StoreMessage {
  id: string;
  storeId: string;
  threadKey: string;
  senderType: "customer" | "store";
  senderName?: string;
  senderContact?: string;
  recipientIdentity?: string;
  channel?: "in_app" | "whatsapp" | "sms" | "email";
  message: string;
  createdAt: string;
}

export interface StoreMessageThread {
  threadKey: string;
  customerLabel: string;
  lastMessage: string;
  lastMessageAt: string;
  messageCount: number;
  channel?: "in_app" | "whatsapp" | "sms" | "email";
  storeId?: string;
  storeName?: string;
}

export type NotificationChannel = "in_app" | "email" | "whatsapp" | "sms";

export interface NotificationPreferences {
  lowStockEnabled: boolean;
  expiringProductsEnabled: boolean;
  dailyReportEnabled: boolean;
  channels: Record<NotificationChannel, boolean>;
  channelPriority: NotificationChannel[];
  emails: string[];
  phones: string[];
  thresholdMode: "per_item_min" | "absolute";
  absoluteThreshold: number;
  fallbackEnabled: boolean;
  quietHoursStart: string;
  quietHoursEnd: string;
  timezone: string;
}

export interface DiscoveryReportSnapshot {
  views: number;
  calls: number;
  directions: number;
  saves: number;
  requests: number;
}

export type StoreVerification = "Unverified" | "Verified" | "Partner";
export type DateFormat = "dmy" | "mdy" | "ymd";

export interface StoreOpenHour {
  day: "Mon" | "Tue" | "Wed" | "Thu" | "Fri" | "Sat" | "Sun";
  open: string;
  close: string;
  closed?: boolean;
}

export interface StoreStaffAccount {
  id: string;
  name: string;
  email: string;
  role: "admin" | "manager" | "cashier" | "viewer";
  active: boolean;
}

export interface StoreProfile {
  storeId: string;
  name: string;
  description?: string;
  category: string;
  categories: string[];
  storeType: string;
  address: string;
  city?: string;
  region?: string;
  lat?: number;
  lng?: number;
  openHours: string;
  openHoursByDay: StoreOpenHour[];
  contactEmail: string;
  contactPhone: string;
  currency: string;
  language: string;
  timezone: string;
  dateFormat: DateFormat;
  logoUrl?: string;
  bannerUrl?: string;
  staffAccounts: StoreStaffAccount[];
  verification: StoreVerification;
  verificationSubmitted: boolean;
  discoverable: boolean;
  lastInventoryUpdate?: string;
}

export interface StoreVerificationDocument {
  id: string;
  storeId: string;
  docType: "business_document" | "national_id" | "other";
  label: string;
  fileUrl: string;
  uploadedAt: string;
  status: "submitted" | "approved" | "rejected";
  reviewNote?: string;
}
