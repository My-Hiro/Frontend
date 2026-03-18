import type {
  Category,
  DiscoveryReportSnapshot,
  InventoryItem,
  NotificationPreferences,
  Sale,
  StoreProfile,
  Supplier
} from "./types";

const SEED_SALE_DATE_ISO = "2026-01-15T10:00:00.000Z";
const SEED_LAST_INVENTORY_UPDATE_ISO = "2026-01-15T12:00:00.000Z";

export const initialItems: InventoryItem[] = [
  {
    id: "1",
    name: "Organic Whole Milk",
    sku: "MILK-001",
    barcode: "1234567890123",
    category: "groceries_food",
    subcategory: "Dairy & Eggs",
    placements: [{ categoryId: "groceries_food", subcategoryLabel: "Dairy & Eggs" }],
    quantity: 45,
    minQuantity: 20,
    maxQuantity: 100,
    unit: "liter",
    costPrice: 2.5,
    sellingPrice: 3.99,
    taxMode: "percent",
    taxValue: 0,
    supplier: "Fresh Farms Co.",
    location: "Main Store",
    status: "in-stock",
    description: "Fresh whole milk in 1L packs",
    imageUrl: "https://images.unsplash.com/photo-1563636619-e9143da7973b?w=400&q=80"
  },
  {
    id: "2",
    name: "Paracetamol 500mg",
    sku: "MED-001",
    barcode: "9876543210987",
    category: "pharmacy_health_wellness",
    subcategory: "Pain & Fever",
    placements: [{ categoryId: "pharmacy_health_wellness", subcategoryLabel: "Pain & Fever" }],
    quantity: 8,
    minQuantity: 15,
    maxQuantity: 50,
    unit: "box",
    costPrice: 3.0,
    sellingPrice: 5.99,
    taxMode: "percent",
    taxValue: 0,
    supplier: "PharmaCorp",
    location: "Main Store",
    status: "low-stock",
    description: "Pain relief tablets",
    imageUrl: "https://images.unsplash.com/photo-1626716493137-b67fe9501e76?w=400&q=80"
  },
  {
    id: "3",
    name: "Organic Brown Rice",
    sku: "RICE-001",
    barcode: "5432167890123",
    category: "groceries_food",
    subcategory: "Pantry Staples",
    placements: [{ categoryId: "groceries_food", subcategoryLabel: "Pantry Staples" }],
    quantity: 120,
    minQuantity: 30,
    maxQuantity: 200,
    unit: "kg",
    costPrice: 1.8,
    sellingPrice: 2.99,
    taxMode: "percent",
    taxValue: 0,
    supplier: "Fresh Farms Co.",
    location: "Warehouse A",
    status: "in-stock",
    description: "Premium organic brown rice",
    imageUrl: "https://images.unsplash.com/photo-1586201375761-83865001e17b?w=400&q=80"
  },
  {
    id: "4",
    name: "Vitamin C 1000mg",
    sku: "VIT-001",
    barcode: "7890123456789",
    category: "pharmacy_health_wellness",
    subcategory: "Vitamins & Supplements",
    placements: [{ categoryId: "pharmacy_health_wellness", subcategoryLabel: "Vitamins & Supplements" }],
    quantity: 0,
    minQuantity: 10,
    maxQuantity: 60,
    unit: "bottle",
    costPrice: 8,
    sellingPrice: 14.99,
    taxMode: "percent",
    taxValue: 0,
    supplier: "PharmaCorp",
    location: "Main Store",
    status: "out-of-stock",
    description: "Vitamin C supplements",
    imageUrl: "https://images.unsplash.com/photo-1585232351009-aa87416fca90?w=400&q=80"
  }
];

export const initialCategories: Category[] = [
  {
    id: "groceries_food",
    name: "Food & Groceries",
    shortName: "Food",
    subcategories: [
      "Fresh Produce",
      "Meat & Seafood",
      "Dairy & Eggs",
      "Bakery",
      "Pantry Staples",
      "Canned & Jarred",
      "Snacks & Confectionery",
      "Beverages (Non-alcoholic)",
      "Frozen",
      "Alcohol (Licensed)"
    ],
    color: "#2563EB",
    icon: "shopping-basket",
    imageUrl: "https://images.unsplash.com/photo-1542838132-92c53300491e?w=1200&q=70"
  },
  {
    id: "kids_babies",
    name: "Kids & Babies",
    shortName: "Kids",
    subcategories: [
      "Diapers & Wipes",
      "Baby Food & Formula",
      "Baby Bath & Skincare",
      "Feeding & Nursing",
      "Baby Accessories",
      "Toys & Learning",
      "Kids Clothing & Shoes",
      "Maternity & Postpartum",
      "School Kids Essentials"
    ],
    color: "#F97316",
    icon: "baby",
    imageUrl: "https://images.unsplash.com/photo-1520962397882-88f0b6c2f1f8?w=1200&q=70"
  },
  {
    id: "pharmacy_health_wellness",
    name: "Pharmacy, Health & Wellness",
    shortName: "Pharmacy",
    subcategories: [
      "Pain & Fever",
      "Cough/Cold & Allergy",
      "Digestive",
      "First Aid & Antiseptics",
      "Vitamins & Supplements",
      "Personal Health Devices"
    ],
    color: "#DC2626",
    icon: "pill",
    imageUrl: "https://images.unsplash.com/photo-1584362917165-526a968579e8?w=1200&q=70"
  },
  {
    id: "household_cleaning",
    name: "Home Decor, Household & Cleaning",
    shortName: "Home Decor",
    subcategories: ["Laundry", "Home Care", "Paper & Disposable", "Kitchen & Homeware"],
    color: "#16A34A",
    icon: "spray-can",
    imageUrl: "/images/categories/home-decor-household-cleaning.png"
  },
  {
    id: "personal_care_beauty",
    name: "Personal Care & Beauty",
    shortName: "Beauty",
    subcategories: [
      "Skin & Body",
      "Hair Care",
      "Oral Care",
      "Men's Grooming",
      "Fragrance & Makeup",
      "Local/Natural Brands"
    ],
    color: "#DB2777",
    icon: "sparkles",
    imageUrl: "https://images.unsplash.com/photo-1526045478516-99145907023c?w=1200&q=70"
  },
  {
    id: "electronics_appliances",
    name: "Electronics & Appliances",
    shortName: "Electronics",
    subcategories: [
      "Phones & Tablets",
      "Phone Accessories",
      "Computing",
      "TV & Audio",
      "Large Appliances",
      "Small Appliances"
    ],
    color: "#7C3AED",
    icon: "smartphone",
    imageUrl: "https://images.unsplash.com/photo-1518770660439-4636190af475?w=1200&q=70"
  },
  {
    id: "auto_spare_parts",
    name: "Auto & Spare Parts",
    shortName: "Auto Parts",
    subcategories: [
      "Brake Parts",
      "Engine Parts",
      "Filters",
      "Electrical",
      "Oils & Fluids",
      "Batteries",
      "Tires & Wheels",
      "Body Parts",
      "Tools & Accessories",
      "Motorcycle Parts"
    ],
    color: "#0D9488",
    icon: "wrench",
    imageUrl: "https://images.unsplash.com/photo-1602052793312-b99c2a9ee797?w=1200&q=70"
  },
  {
    id: "lighting_hardware",
    name: "Lighting, Building & Hardware",
    shortName: "Hardware",
    subcategories: ["Lighting", "Electricals", "Power Solutions", "Plumbing & Water", "Safety & Tools"],
    color: "#0EA5E9",
    icon: "hammer",
    imageUrl: "/images/categories/lighting-building-hardware.png"
  },
  {
    id: "office_school",
    name: "Office, Stationery, Books & School",
    shortName: "Stationery",
    subcategories: ["Writing & Paper", "Filing & Desk", "School Essentials", "Books", "Office Furniture"],
    color: "#B45309",
    icon: "notebook-pen",
    imageUrl: "https://images.unsplash.com/photo-1456735190827-d1262f71b8a3?w=1200&q=70"
  },
  {
    id: "fashion_clothing",
    name: "Fashion & Clothing",
    shortName: "Fashion",
    subcategories: [
      "Tops",
      "Bottoms",
      "Dresses & Jumpsuits",
      "Outerwear",
      "Sportswear",
      "Underwear & Sleepwear",
      "Schoolwear",
      "Footwear",
      "Jewellery and clothing accessories",
      "Fabrics",
      "Notions"
    ],
    color: "#7C2D92",
    icon: "shirt",
    imageUrl: "https://images.unsplash.com/photo-1441986300917-64674bd600d8?w=1200&q=70"
  },
  {
    id: "more",
    name: "More",
    shortName: "More",
    subcategories: [],
    color: "#64748B",
    icon: "more-horizontal",
    imageUrl: "https://images.unsplash.com/photo-1528698827591-e19ccd7bc23d?w=1200&q=70"
  }
];

export const initialSuppliers: Supplier[] = [
  {
    id: "s1",
    name: "Fresh Farms Co.",
    contact: "John Smith",
    email: "john@freshfarms.com",
    phone: "+233240000001",
    address: "Accra, Ghana",
    rating: 4.8
  },
  {
    id: "s2",
    name: "PharmaCorp",
    contact: "Dr. Sarah Johnson",
    email: "sarah@pharmacorp.com",
    phone: "+233240000002",
    address: "Kumasi, Ghana",
    rating: 4.9
  }
];

export const initialSales: Sale[] = [
  {
    id: "sale-1",
    items: [
      { itemId: "1", itemName: "Organic Whole Milk", quantity: 2, price: 3.99 },
      { itemId: "3", itemName: "Organic Brown Rice", quantity: 1, price: 2.99 }
    ],
    subtotal: 10.97,
    taxTotal: 0,
    grandTotal: 10.97,
    total: 10.97,
    date: SEED_SALE_DATE_ISO,
    paymentMethod: "Cash",
    cashier: "Store Manager"
  }
];

export const initialNotificationPreferences: NotificationPreferences = {
  lowStockEnabled: true,
  expiringProductsEnabled: true,
  dailyReportEnabled: false,
  channels: {
    in_app: true,
    email: true,
    whatsapp: false,
    sms: false
  },
  channelPriority: ["whatsapp", "sms", "email", "in_app"],
  emails: ["manager@mainstore.gh"],
  phones: ["+233240000100"],
  thresholdMode: "per_item_min",
  absoluteThreshold: 5,
  fallbackEnabled: true,
  quietHoursStart: "23:00",
  quietHoursEnd: "06:00",
  timezone: "Africa/Accra"
};

export const discoverySnapshot: DiscoveryReportSnapshot = {
  views: 1840,
  calls: 103,
  directions: 88,
  saves: 74,
  requests: 31
};

export const initialStoreProfile: StoreProfile = {
  storeId: "store-main-001",
  name: "Main Store",
  category: "groceries_food",
  categories: ["groceries_food"],
  storeType: "Supermarket",
  address: "Accra, Ghana",
  city: "Accra",
  region: "Greater Accra",
  lat: 5.5536,
  lng: -0.2066,
  openHours: "Mon-Sat: 7am - 9pm, Sun: 8am - 6pm",
  openHoursByDay: [
    { day: "Mon", open: "07:00", close: "21:00" },
    { day: "Tue", open: "07:00", close: "21:00" },
    { day: "Wed", open: "07:00", close: "21:00" },
    { day: "Thu", open: "07:00", close: "21:00" },
    { day: "Fri", open: "07:00", close: "21:00" },
    { day: "Sat", open: "07:00", close: "21:00" },
    { day: "Sun", open: "08:00", close: "18:00" }
  ],
  contactEmail: "manager@mainstore.gh",
  contactPhone: "+233240000100",
  currency: "GHS",
  language: "en",
  timezone: "Africa/Accra",
  dateFormat: "dmy",
  logoUrl: "",
  bannerUrl: "",
  staffAccounts: [
    {
      id: "acct-1",
      name: "Store Admin",
      email: "manager@mainstore.gh",
      role: "admin",
      active: true
    }
  ],
  verification: "Verified",
  verificationSubmitted: true,
  discoverable: true,
  lastInventoryUpdate: SEED_LAST_INVENTORY_UPDATE_ISO
};
