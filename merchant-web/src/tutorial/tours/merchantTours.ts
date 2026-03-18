import type { TutorialStepDefinition } from "../types";

export const merchantGlobalIntroTour: TutorialStepDefinition[] = [
  {
    id: "global-dashboard",
    target: '[data-tour="dashboard-overview"]',
    title: "Dashboard overview",
    content:
      "This dashboard gives you a quick view of stock, revenue, and alerts before you dive into operations.",
    placement: "bottom",
    route: "dashboard"
  },
  {
    id: "global-nav-dashboard",
    target: '[data-tour="nav-dashboard"]',
    title: "Dashboard tab",
    content: "Use Dashboard to monitor your store performance at a glance.",
    placement: "right",
    mobilePlacement: "bottom",
    route: "dashboard"
  },
  {
    id: "global-nav-inventory",
    target: '[data-tour="nav-inventory"]',
    title: "Inventory tab",
    content: "Inventory is where you add products, update stock, and manage product details.",
    placement: "right",
    mobilePlacement: "bottom",
    route: "dashboard"
  },
  {
    id: "global-nav-categories",
    target: '[data-tour="nav-categories"]',
    title: "Categories tab",
    content: "Categories shows product performance by category and subcategory.",
    placement: "right",
    mobilePlacement: "bottom",
    route: "dashboard"
  },
  {
    id: "global-nav-suppliers",
    target: '[data-tour="nav-suppliers"]',
    title: "Suppliers tab",
    content: "Suppliers helps you request restocks and manage supplier contact details.",
    placement: "right",
    mobilePlacement: "bottom",
    route: "dashboard"
  },
  {
    id: "global-nav-sales",
    target: '[data-tour="nav-sales"]',
    title: "Sales tab",
    content: "Sales is your POS and transaction history for completed purchases.",
    placement: "right",
    mobilePlacement: "bottom",
    route: "dashboard"
  },
  {
    id: "global-nav-messages",
    target: '[data-tour="nav-messages"]',
    title: "Messages tab",
    content: "Reply to customer conversations from discovery in one inbox.",
    placement: "right",
    mobilePlacement: "bottom",
    route: "dashboard"
  },
  {
    id: "global-nav-reports",
    target: '[data-tour="nav-reports"]',
    title: "Reports tab",
    content: "Reports gives you trend insights and exportable performance data.",
    placement: "right",
    mobilePlacement: "bottom",
    route: "dashboard"
  },
  {
    id: "global-nav-support",
    target: '[data-tour="nav-support"]',
    title: "Support tab",
    content: "Support connects you quickly to help channels when you need assistance.",
    placement: "right",
    mobilePlacement: "bottom",
    route: "dashboard"
  },
  {
    id: "global-nav-settings",
    target: '[data-tour="nav-settings"]',
    title: "Settings tab",
    content: "Settings is where you control store profile, location, alerts, and account setup.",
    placement: "right",
    mobilePlacement: "bottom",
    route: "dashboard"
  },
  {
    id: "global-nav-signout",
    target: '[data-tour="nav-signout"]',
    title: "Sign out",
    content: "Use this to sign out securely when you are done managing your store.",
    placement: "right",
    mobilePlacement: "bottom",
    route: "dashboard"
  },
  {
    id: "global-help",
    target: '[data-tour="help-tutorial"]',
    title: "Tutorial menu",
    content:
      "Use this help button anytime to reopen the global intro or run a tour for any module.",
    placement: "left",
    mobilePlacement: "bottom",
    route: "dashboard"
  }
];

export const merchantPageDashboardTour: TutorialStepDefinition[] = [
  {
    id: "dashboard-metrics",
    target: '[data-tour="dashboard-metrics"]',
    title: "Dashboard metrics",
    content: "Track total inventory, inventory value, revenue, and active alerts from this block.",
    placement: "bottom",
    route: "dashboard"
  },
  {
    id: "dashboard-alerts",
    target: '[data-tour="dashboard-alerts"]',
    title: "Inventory alerts",
    content: "This section shows products that are low in stock or already out of stock.",
    placement: "top",
    route: "dashboard"
  },
  {
    id: "dashboard-top-selling",
    target: '[data-tour="dashboard-top-selling"]',
    title: "Top selling products",
    content: "Review your best-performing products and their revenue contribution.",
    placement: "top",
    route: "dashboard"
  }
];

export const merchantPageInventoryTour: TutorialStepDefinition[] = [
  {
    id: "inventory-add-product",
    target: '[data-tour="add-product"]',
    title: "Add product",
    content: "Click Add Product to create a new item in inventory.",
    placement: "bottom",
    route: "inventory",
    requireClick: true
  },
  {
    id: "inventory-modal",
    target: '[data-tour="inventory-product-modal"]',
    title: "Product details form",
    content: "This form captures product identity, pricing, quantity, supplier, and visibility setup.",
    placement: "top",
    route: "inventory"
  },
  {
    id: "inventory-placements",
    target: '[data-tour="inventory-placements"]',
    title: "Audience and category placement",
    content:
      "Choose where this product appears by setting audience, category, and subcategory placements.",
    placement: "top",
    route: "inventory"
  },
  {
    id: "inventory-save",
    target: '[data-tour="inventory-save-product"]',
    title: "Save product",
    content: "Save here to publish or update the product in inventory and discovery.",
    placement: "top",
    route: "inventory"
  },
  {
    id: "inventory-close-modal",
    target: '[data-tour="inventory-close-product-modal"]',
    title: "Close the product form",
    content: "Click Cancel to return to the inventory page and continue this walkthrough.",
    placement: "top",
    route: "inventory",
    requireClick: true
  },
  {
    id: "inventory-filters",
    target: '[data-tour="inventory-filters"]',
    title: "Filter and search",
    content: "Use these controls to find products quickly by status, category, and sorting.",
    placement: "bottom",
    route: "inventory"
  },
  {
    id: "inventory-table",
    target: '[data-tour="inventory-table"]',
    title: "Inventory table",
    content: "This table is where you review stock and edit, adjust, or remove products.",
    placement: "top",
    route: "inventory"
  }
];

export const merchantPageCategoriesTour: TutorialStepDefinition[] = [
  {
    id: "categories-ring",
    target: '[data-tour="categories-ring"]',
    title: "Category distribution",
    content: "See stock value, product count, and units split across categories.",
    placement: "bottom",
    route: "categories"
  },
  {
    id: "categories-performance",
    target: '[data-tour="categories-performance"]',
    title: "Category performance",
    content: "Compare category performance lanes by revenue and stock value.",
    placement: "top",
    route: "categories"
  },
  {
    id: "categories-details",
    target: '[data-tour="categories-details"]',
    title: "Category details",
    content: "Inspect subcategory coverage, low stock risk, and sales details per category.",
    placement: "top",
    route: "categories"
  }
];

export const merchantPageSuppliersTour: TutorialStepDefinition[] = [
  {
    id: "suppliers-list",
    target: '[data-tour="suppliers-list"]',
    title: "Suppliers overview",
    content: "Each card shows supplier contacts, linked products, and current stock value.",
    placement: "bottom",
    route: "suppliers"
  },
  {
    id: "suppliers-request",
    target: '[data-tour="request-supply"]',
    title: "Open supply request",
    content: "Click Request Supply on a supplier card to start a restock request.",
    placement: "bottom",
    route: "suppliers",
    requireClick: true
  },
  {
    id: "suppliers-selected",
    target: '[data-tour="supplier-select"]',
    title: "Selected supplier",
    content: "Confirm the supplier before adding items and quantities.",
    placement: "bottom",
    route: "suppliers"
  },
  {
    id: "suppliers-items",
    target: '[data-tour="supply-items"]',
    title: "Items and quantities",
    content: "Add all products you want restocked and specify the required quantities.",
    placement: "top",
    route: "suppliers"
  },
  {
    id: "suppliers-send",
    target: '[data-tour="send-supply-request"]',
    title: "Send request",
    content: "Send the generated request quickly via WhatsApp when ready.",
    placement: "top",
    route: "suppliers"
  }
];

export const merchantPageSalesTour: TutorialStepDefinition[] = [
  {
    id: "sales-tabs",
    target: '[data-tour="sales-tab-pos"]',
    title: "Sales tabs",
    content: "Switch between Point of Sale and Sales History here.",
    placement: "bottom",
    route: "sales"
  },
  {
    id: "sales-products",
    target: '[data-tour="sales-product-grid"]',
    title: "Product picker",
    content: "Search and tap products to add them to the cart.",
    placement: "right",
    mobilePlacement: "bottom",
    route: "sales"
  },
  {
    id: "sales-cart",
    target: '[data-tour="sales-cart-panel"]',
    title: "Cart summary",
    content: "Adjust quantities, verify totals, and confirm customer details in this panel.",
    placement: "left",
    mobilePlacement: "bottom",
    route: "sales"
  },
  {
    id: "sales-payment",
    target: '[data-tour="sales-payment-methods"]',
    title: "Payment method",
    content: "Select how the customer paid before completing the sale.",
    placement: "top",
    route: "sales"
  },
  {
    id: "sales-complete",
    target: '[data-tour="sales-complete-sale"]',
    title: "Complete sale",
    content: "Finalize the transaction and generate a receipt from this button.",
    placement: "top",
    route: "sales"
  }
];

export const merchantPageMessagesTour: TutorialStepDefinition[] = [
  {
    id: "messages-channels",
    target: '[data-tour="messages-channels"]',
    title: "Channel filters",
    content: "Filter conversations by channel such as in-app, WhatsApp, SMS, or email.",
    placement: "bottom",
    route: "messages"
  },
  {
    id: "messages-threads",
    target: '[data-tour="messages-threads"]',
    title: "Conversation list",
    content: "Select a customer thread from this list to view and reply.",
    placement: "right",
    mobilePlacement: "bottom",
    route: "messages"
  },
  {
    id: "messages-timeline",
    target: '[data-tour="messages-timeline"]',
    title: "Message timeline",
    content: "Read message history and context before sending your reply.",
    placement: "left",
    mobilePlacement: "bottom",
    route: "messages"
  },
  {
    id: "messages-compose",
    target: '[data-tour="messages-compose"]',
    title: "Reply composer",
    content: "Type and send your response to the selected customer here.",
    placement: "top",
    route: "messages"
  }
];

export const merchantPageReportsTour: TutorialStepDefinition[] = [
  {
    id: "reports-range",
    target: '[data-tour="reports-range"]',
    title: "Date range",
    content: "Adjust reporting period to analyze recent or long-term performance.",
    placement: "bottom",
    route: "reports"
  },
  {
    id: "reports-kpis",
    target: '[data-tour="reports-kpis"]',
    title: "Key metrics",
    content: "Review revenue, inventory value, profit, and margin KPIs in one glance.",
    placement: "bottom",
    route: "reports"
  },
  {
    id: "reports-discovery",
    target: '[data-tour="reports-discovery-signals"]',
    title: "Discovery signals",
    content: "Track how customers interact with your discovery store profile.",
    placement: "left",
    mobilePlacement: "bottom",
    route: "reports"
  },
  {
    id: "reports-export",
    target: '[data-tour="reports-export"]',
    title: "Export reports",
    content: "Export report data for sharing, accounting, or deeper analysis.",
    placement: "bottom",
    route: "reports"
  }
];

export const merchantPageSupportTour: TutorialStepDefinition[] = [
  {
    id: "support-banner",
    target: '[data-tour="support-banner"]',
    title: "Support updates",
    content: "This banner highlights help updates and important support announcements.",
    placement: "bottom",
    route: "support"
  },
  {
    id: "support-contacts",
    target: '[data-tour="support-contacts"]',
    title: "Support channels",
    content: "Contact support quickly by phone, WhatsApp, or email from these cards.",
    placement: "top",
    route: "support"
  }
];

export const merchantPageSettingsTour: TutorialStepDefinition[] = [
  {
    id: "settings-store-info",
    target: '[data-tour="settings-store-info"]',
    title: "Store information",
    content: "Update your core store details, contact info, and category setup here.",
    placement: "bottom",
    route: "settings"
  },
  {
    id: "settings-location",
    target: '[data-tour="settings-location"]',
    title: "Business location",
    content: "Set precise store location to improve discovery ranking and directions accuracy.",
    placement: "top",
    route: "settings"
  },
  {
    id: "settings-use-current",
    target: '[data-tour="settings-use-current-location"]',
    title: "Use current location",
    content: "If you are at your primary business location, use this to set coordinates faster.",
    placement: "top",
    route: "settings"
  },
  {
    id: "settings-alerts",
    target: '[data-tour="low-stock-alerts"]',
    title: "Low stock alerts",
    content: "Enable and tune alerts so your team can restock before items run out.",
    placement: "top",
    route: "settings"
  },
  {
    id: "settings-save",
    target: '[data-tour="settings-save"]',
    title: "Save settings",
    content: "Save profile and settings changes from this button.",
    placement: "top",
    route: "settings"
  }
];
