import type { ViewId } from "../state/types";
import type { TourName } from "./types";

export const TOUR_ORDER: TourName[] = [
  "merchant_global_intro",
  "merchant_page_dashboard",
  "merchant_page_inventory",
  "merchant_page_categories",
  "merchant_page_suppliers",
  "merchant_page_sales",
  "merchant_page_messages",
  "merchant_page_reports",
  "merchant_page_support",
  "merchant_page_settings"
];

export const TOUR_LABELS: Record<TourName, string> = {
  merchant_global_intro: "Global Intro",
  merchant_page_dashboard: "Dashboard",
  merchant_page_inventory: "Inventory",
  merchant_page_categories: "Categories",
  merchant_page_suppliers: "Suppliers",
  merchant_page_sales: "Sales",
  merchant_page_messages: "Messages",
  merchant_page_reports: "Reports",
  merchant_page_support: "Support",
  merchant_page_settings: "Settings"
};

const pageTourMap: Record<ViewId, TourName> = {
  dashboard: "merchant_page_dashboard",
  inventory: "merchant_page_inventory",
  categories: "merchant_page_categories",
  suppliers: "merchant_page_suppliers",
  sales: "merchant_page_sales",
  messages: "merchant_page_messages",
  reports: "merchant_page_reports",
  support: "merchant_page_support",
  settings: "merchant_page_settings"
};

export const getTourNameForView = (view: ViewId): TourName => pageTourMap[view];
