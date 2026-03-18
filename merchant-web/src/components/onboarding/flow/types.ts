import type { Category, StoreOpenHour, StoreProfile } from "../../../state/types";

export interface MerchantOnboardingDraft {
  storeName: string;
  storeType: string;
  categories: string[];
  contactEmail: string;
  contactPhone: string;
  city: string;
  region: string;
  address: string;
  lat?: number;
  lng?: number;
  openHoursByDay: StoreOpenHour[];
  logoUrl?: string;
  bannerUrl?: string;
  inventorySetupMode: "manual" | "import";
  inventoryNotes: string;
  verificationTin: string;
  verificationNationalIdUrl?: string;
  verificationBusinessDocUrl?: string;
  verificationOtherDocUrl?: string;
  verificationSkipped?: boolean;
}

export const defaultOpenHoursByDay = (): StoreOpenHour[] => [
  { day: "Mon", open: "07:00", close: "21:00" },
  { day: "Tue", open: "07:00", close: "21:00" },
  { day: "Wed", open: "07:00", close: "21:00" },
  { day: "Thu", open: "07:00", close: "21:00" },
  { day: "Fri", open: "07:00", close: "21:00" },
  { day: "Sat", open: "07:00", close: "21:00" },
  { day: "Sun", open: "08:00", close: "18:00" }
];

export const createOnboardingDraft = (
  profile: StoreProfile,
  categories: Category[]
): MerchantOnboardingDraft => {
  const profileCategories =
    Array.isArray(profile.categories) && profile.categories.length > 0
      ? profile.categories
      : profile.category
        ? [profile.category]
        : categories[0]
          ? [categories[0].id]
          : [];

  return {
    storeName: profile.name || "",
    storeType: profile.storeType || "Retail Store",
    categories: profileCategories,
    contactEmail: profile.contactEmail || "",
    contactPhone: profile.contactPhone || "",
    city: profile.city || "",
    region: profile.region || "",
    address: profile.address || "",
    lat: profile.lat,
    lng: profile.lng,
    openHoursByDay:
      Array.isArray(profile.openHoursByDay) && profile.openHoursByDay.length > 0
        ? profile.openHoursByDay.map((entry) => ({ ...entry }))
        : defaultOpenHoursByDay(),
    logoUrl: profile.logoUrl,
    bannerUrl: profile.bannerUrl,
    inventorySetupMode: "manual",
    inventoryNotes: "",
    verificationTin: "",
    verificationSkipped: false
  };
};

export const applyOnboardingDraftToProfile = (
  profile: StoreProfile,
  draft: MerchantOnboardingDraft
): StoreProfile => {
  const openHours = draft.openHoursByDay
    .map((entry) =>
      entry.closed ? `${entry.day}: Closed` : `${entry.day}: ${entry.open}-${entry.close}`
    )
    .join(", ");

  return {
    ...profile,
    name: draft.storeName.trim() || profile.name,
    storeType: draft.storeType,
    categories: draft.categories.length > 0 ? draft.categories : profile.categories,
    category:
      draft.categories[0] ||
      profile.categories?.[0] ||
      profile.category,
    contactEmail: draft.contactEmail.trim(),
    contactPhone: draft.contactPhone.trim(),
    city: draft.city.trim(),
    region: draft.region.trim(),
    address: draft.address.trim(),
    lat: draft.lat,
    lng: draft.lng,
    openHoursByDay: draft.openHoursByDay.map((entry) => ({ ...entry })),
    openHours,
    logoUrl: draft.logoUrl,
    bannerUrl: draft.bannerUrl
  };
};
