import { useEffect, useMemo, useRef, useState } from "react";
import { AuthGate } from "./components/auth/AuthGate";
import { MobileNav } from "./components/layout/MobileNav";
import { Sidebar } from "./components/layout/Sidebar";
import { Topbar } from "./components/layout/Topbar";
import {
  OnboardingFlow,
  onboardingDoneKeyFor,
  onboardingRequiredKeyFor
} from "./components/onboarding/flow/OnboardingFlow";
import { formatDateTime, formatMoney, resolveLocale } from "./lib/format";
import { deriveInventoryStatus } from "./lib/inventoryStatus";
import { CategoriesPage } from "./pages/CategoriesPage";
import { DashboardPage } from "./pages/DashboardPage";
import { InventoryPage } from "./pages/InventoryPage";
import { MessagesPage } from "./pages/MessagesPage";
import { ReportsPage } from "./pages/ReportsPage";
import { SalesPage } from "./pages/SalesPage";
import { SettingsPage } from "./pages/SettingsPage";
import { SupportPage } from "./pages/SupportPage";
import { SuppliersPage } from "./pages/SuppliersPage";
import { MerchantProvider } from "./state/merchantContext";
import {
  discoverySnapshot,
  initialCategories,
  initialItems,
  initialNotificationPreferences,
  initialSales,
  initialStoreProfile,
  initialSuppliers
} from "./state/mockData";
import {
  type MerchantLiveStatus,
  readGoLivePromptPending,
  readLiveStatus,
  writeGoLivePromptPending,
  writeLiveStatus
} from "./state/liveStatus";
import { merchantApi, merchantAuthApi, type AuthSession } from "./state/api";
import type {
  Category,
  InventoryItem,
  MenuMode,
  NotificationPreferences,
  Sale,
  StoreProfile,
  Supplier,
  ViewId
} from "./state/types";
import { TutorialProvider } from "./tutorial/TutorialProvider";

type ThemeMode = "light" | "dark";
type BootstrapStatus = "idle" | "loading" | "ready" | "fallback";
type BootstrapSource = "api" | "fallback";

const THEME_KEY = "myhiro_theme_merchant";
const LEGACY_ONBOARDING_DONE_KEY = "merchant_onboarding_done_v1";
const LEGACY_ONBOARDING_DRAFT_KEY = "merchant_onboarding_draft_v1";
const MENU_MODE_KEY_PREFIX = "merchant_menu_mode_v1";
const DEMO_MERCHANT_PHONE = "+233240000101";
const BASIC_MENU_VIEWS: ViewId[] = ["dashboard", "inventory", "sales", "messages", "settings"];

const resolveStoreId = (session: AuthSession | null): string => {
  if (!session) return "store-main-001";
  if (session.user.phone_e164 === DEMO_MERCHANT_PHONE) {
    return "store-main-001";
  }
  return `store-${session.user.id}`;
};

const cloneItems = (source: InventoryItem[]): InventoryItem[] =>
  source.map((item) => ({
    ...item,
    placements: (item.placements ?? []).map((placement) => ({ ...placement }))
  }));

const cloneCategories = (source: Category[]): Category[] =>
  source.map((category) => ({
    ...category,
    subcategories: [...category.subcategories]
  }));

const cloneSuppliers = (source: Supplier[]): Supplier[] =>
  source.map((supplier) => ({ ...supplier }));

const cloneSales = (source: Sale[]): Sale[] =>
  source.map((sale) => ({
    ...sale,
    items: sale.items.map((line) => ({ ...line }))
  }));

const cloneNotificationPreferences = (
  source: NotificationPreferences
): NotificationPreferences => ({
  ...source,
  channels: { ...source.channels },
  channelPriority: [...source.channelPriority],
  emails: [...source.emails],
  phones: [...source.phones]
});

const cloneStoreProfile = (source: StoreProfile): StoreProfile => ({
  ...source,
  categories: [...source.categories],
  openHoursByDay: source.openHoursByDay.map((entry) => ({ ...entry })),
  staffAccounts: source.staffAccounts.map((entry) => ({ ...entry }))
});

const createDefaultStoreProfile = (session: AuthSession | null): StoreProfile => {
  const storeId = resolveStoreId(session);
  if (storeId === "store-main-001") {
    return cloneStoreProfile(initialStoreProfile);
  }
  return cloneStoreProfile({
    ...initialStoreProfile,
    storeId,
    name: "",
    storeType: "Retail Store",
    categories: [],
    category: "groceries_food",
    address: "",
    city: "",
    region: "",
    lat: undefined,
    lng: undefined,
    openHours: "",
    openHoursByDay: initialStoreProfile.openHoursByDay.map((entry) => ({ ...entry })),
    contactEmail: session?.user.email ?? "",
    contactPhone: session?.user.phone_e164 ?? "",
    logoUrl: "",
    bannerUrl: "",
    staffAccounts: [
      {
        id: `acct-${storeId}`,
        name: "Store Admin",
        email: session?.user.email ?? "",
        role: "admin",
        active: true
      }
    ],
    verification: "Unverified",
    verificationSubmitted: false,
    discoverable: true,
    lastInventoryUpdate: undefined
  });
};

export function App() {
  const [authSession, setAuthSession] = useState<AuthSession | null>(() => merchantAuthApi.getSession());
  const [theme, setTheme] = useState<ThemeMode>(() => {
    if (typeof window === "undefined") return "light";
    const stored = localStorage.getItem(THEME_KEY);
    if (stored === "light" || stored === "dark") return stored;
    return window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
  });
  const [onboardingComplete, setOnboardingComplete] = useState(false);
  const [onboardingRequired, setOnboardingRequired] = useState(false);
  const [view, setView] = useState<ViewId>("dashboard");
  const [menuMode, setMenuMode] = useState<MenuMode>("advanced");
  const [expanded, setExpanded] = useState(true);
  const [items, setItems] = useState<InventoryItem[]>(() => cloneItems(initialItems));
  const [categories, setCategories] = useState<Category[]>(() => cloneCategories(initialCategories));
  const [suppliers, setSuppliers] = useState<Supplier[]>(() => cloneSuppliers(initialSuppliers));
  const [sales, setSales] = useState<Sale[]>(() => cloneSales(initialSales));
  const [notificationPreferences, setNotificationPreferences] = useState<NotificationPreferences>(
    () => cloneNotificationPreferences(initialNotificationPreferences)
  );
  const [storeProfile, setStoreProfile] = useState<StoreProfile>(() =>
    createDefaultStoreProfile(merchantAuthApi.getSession())
  );
  const [bootstrapStatus, setBootstrapStatus] = useState<BootstrapStatus>("idle");
  const [bootstrapSource, setBootstrapSource] = useState<BootstrapSource>("fallback");
  const [storeLiveStatus, setStoreLiveStatus] = useState<MerchantLiveStatus>("offline");
  const [goLivePromptPending, setGoLivePromptPending] = useState(false);
  const [liveModeNotice, setLiveModeNotice] = useState("");
  const [liveModeNoticeTone, setLiveModeNoticeTone] = useState<"neutral" | "online" | "offline">(
    "neutral"
  );
  const [goLiveModalOpen, setGoLiveModalOpen] = useState(false);
  const [goLiveChallengeId, setGoLiveChallengeId] = useState<string | null>(null);
  const [goLiveCode, setGoLiveCode] = useState("");
  const [goLiveChannel, setGoLiveChannel] = useState<string | null>(null);
  const [goLiveBusy, setGoLiveBusy] = useState(false);
  const [goLiveError, setGoLiveError] = useState("");
  const liveNoticeTimerRef = useRef<number | null>(null);
  const storeId = useMemo(() => resolveStoreId(authSession), [authSession]);
  const onboardingDoneKey = useMemo(
    () => (authSession ? onboardingDoneKeyFor(authSession.user.id) : LEGACY_ONBOARDING_DONE_KEY),
    [authSession]
  );
  const onboardingRequiredKey = useMemo(
    () =>
      authSession
        ? onboardingRequiredKeyFor(authSession.user.id)
        : onboardingRequiredKeyFor("legacy"),
    [authSession]
  );
  const menuModeKey = useMemo(
    () =>
      authSession ? `${MENU_MODE_KEY_PREFIX}_${authSession.user.id}` : `${MENU_MODE_KEY_PREFIX}_legacy`,
    [authSession]
  );
  const locale = useMemo(() => resolveLocale(storeProfile.language), [storeProfile.language]);
  const timezone = storeProfile.timezone || "Africa/Accra";
  const showLiveBanner =
    view === "inventory" &&
    onboardingComplete &&
    goLivePromptPending &&
    storeLiveStatus === "offline";

  const showLiveNotice = (
    message: string,
    tone: "neutral" | "online" | "offline" = "neutral"
  ) => {
    setLiveModeNotice(message);
    setLiveModeNoticeTone(tone);
    if (typeof window === "undefined") return;
    if (liveNoticeTimerRef.current !== null) {
      window.clearTimeout(liveNoticeTimerRef.current);
    }
    liveNoticeTimerRef.current = window.setTimeout(() => {
      setLiveModeNotice("");
      setLiveModeNoticeTone("neutral");
      liveNoticeTimerRef.current = null;
    }, 2800);
  };

  useEffect(
    () => () => {
      if (typeof window === "undefined") return;
      if (liveNoticeTimerRef.current !== null) {
        window.clearTimeout(liveNoticeTimerRef.current);
      }
    },
    []
  );

  useEffect(() => {
    if (typeof window === "undefined") return;
    const params = new URLSearchParams(window.location.search);
    if (params.get("resetAuth") === "1") {
      void merchantAuthApi.clearSession();
      setAuthSession(null);
    }
    if (params.get("resetOnboarding") === "1") {
      localStorage.removeItem(LEGACY_ONBOARDING_DONE_KEY);
      localStorage.removeItem(LEGACY_ONBOARDING_DRAFT_KEY);
      if (authSession) {
        localStorage.removeItem(onboardingDoneKeyFor(authSession.user.id));
        localStorage.setItem(onboardingRequiredKeyFor(authSession.user.id), "1");
      }
      setOnboardingRequired(true);
      setOnboardingComplete(false);
    }
    if (params.get("resetAuth") === "1" || params.get("resetOnboarding") === "1") {
      params.delete("resetAuth");
      params.delete("resetOnboarding");
      const next = params.toString();
      window.history.replaceState(null, "", next ? `/?${next}` : "/");
    }
  }, [authSession]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const root = document.documentElement;
    root.setAttribute("data-theme", theme);
    root.style.colorScheme = theme;
    localStorage.setItem(THEME_KEY, theme);
  }, [theme]);

  const toggleTheme = () => {
    setTheme((current) => (current === "dark" ? "light" : "dark"));
  };

  useEffect(() => {
    if (!authSession) return;
    if (authSession.user.role === "merchant" || authSession.user.role === "admin") return;
    void merchantAuthApi.clearSession();
    setAuthSession(null);
  }, [authSession]);

  useEffect(() => {
    if (!authSession || typeof window === "undefined") {
      setOnboardingRequired(false);
      setOnboardingComplete(false);
      return;
    }
    const done = localStorage.getItem(onboardingDoneKey) === "1";
    const required = localStorage.getItem(onboardingRequiredKey) === "1";
    if (done && required) {
      localStorage.removeItem(onboardingRequiredKey);
      setOnboardingRequired(false);
      setOnboardingComplete(true);
      return;
    }
    setOnboardingRequired(required);
    setOnboardingComplete(done || !required);
  }, [authSession, onboardingDoneKey, onboardingRequiredKey]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const stored = localStorage.getItem(menuModeKey);
    setMenuMode(stored === "basic" ? "basic" : "advanced");
  }, [menuModeKey]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    localStorage.setItem(menuModeKey, menuMode);
  }, [menuMode, menuModeKey]);

  useEffect(() => {
    if (menuMode !== "basic") return;
    if (BASIC_MENU_VIEWS.includes(view)) return;
    setView("inventory");
  }, [menuMode, view]);

  useEffect(() => {
    if (!authSession || typeof window === "undefined") {
      setStoreLiveStatus("offline");
      setGoLivePromptPending(false);
      setGoLiveModalOpen(false);
      setGoLiveChallengeId(null);
      setGoLiveCode("");
      setGoLiveChannel(null);
      setGoLiveError("");
      return;
    }
    const scope = authSession.user.id;
    setStoreLiveStatus(readLiveStatus(scope));
    setGoLivePromptPending(readGoLivePromptPending(scope));
  }, [authSession]);

  useEffect(() => {
    let cancelled = false;
    const applyFallback = () => {
      setItems(cloneItems(initialItems));
      setCategories(cloneCategories(initialCategories));
      setSuppliers(cloneSuppliers(initialSuppliers));
      setSales(cloneSales(initialSales));
      setNotificationPreferences(cloneNotificationPreferences(initialNotificationPreferences));
      setStoreProfile(createDefaultStoreProfile(authSession));
      setBootstrapSource("fallback");
      setBootstrapStatus(authSession ? "fallback" : "idle");
    };

    if (!authSession) {
      applyFallback();
      return () => {
        cancelled = true;
      };
    }

    setBootstrapStatus("loading");

    const load = async () => {
      try {
        const [result, profile] = await Promise.all([
          merchantApi.bootstrap(storeId),
          merchantApi.getStoreProfile(storeId).catch(() => undefined)
        ]);
        if (cancelled) {
          return;
        }
        setItems(cloneItems(result.items));
        setCategories(
          result.categories.length > 0 ? cloneCategories(result.categories) : cloneCategories(initialCategories)
        );
        setSuppliers(
          result.suppliers.length > 0 ? cloneSuppliers(result.suppliers) : cloneSuppliers(initialSuppliers)
        );
        setSales(cloneSales(result.sales));
        setNotificationPreferences(
          result.prefs
            ? cloneNotificationPreferences(result.prefs)
            : cloneNotificationPreferences(initialNotificationPreferences)
        );
        setStoreProfile(profile ? cloneStoreProfile(profile) : createDefaultStoreProfile(authSession));
        setBootstrapSource("api");
        setBootstrapStatus("ready");
      } catch {
        if (cancelled) {
          return;
        }
        applyFallback();
      }
    };
    void load();
    return () => {
      cancelled = true;
    };
  }, [authSession, storeId]);

  const onSignOut = async () => {
    if (typeof window !== "undefined") {
      const confirmed = window.confirm("Are you sure you want to sign out?");
      if (!confirmed) {
        return;
      }
    }
    await merchantAuthApi.clearSession();
    setAuthSession(null);
    setOnboardingRequired(false);
    setOnboardingComplete(false);
    setStoreLiveStatus("offline");
    setGoLivePromptPending(false);
    setLiveModeNotice("");
    setLiveModeNoticeTone("neutral");
    setGoLiveModalOpen(false);
    setGoLiveChallengeId(null);
    setGoLiveCode("");
    setGoLiveChannel(null);
    setGoLiveError("");
    setItems(cloneItems(initialItems));
    setCategories(cloneCategories(initialCategories));
    setSuppliers(cloneSuppliers(initialSuppliers));
    setSales(cloneSales(initialSales));
    setNotificationPreferences(cloneNotificationPreferences(initialNotificationPreferences));
    setStoreProfile(createDefaultStoreProfile(null));
    setBootstrapStatus("idle");
    setBootstrapSource("fallback");
    setMenuMode("advanced");
    setView("dashboard");
  };

  const requestGoLiveOtp = async () => {
    if (!authSession) {
      return;
    }
    const identifier = authSession.user.phone_e164?.trim() || authSession.user.email?.trim();
    if (!identifier) {
      showLiveNotice("Add a phone or email in Settings before going live.");
      return;
    }

    setGoLiveBusy(true);
    setGoLiveError("");
    try {
      const otp = await merchantAuthApi.requestOtp({
        identifier,
        purpose: "signin"
      });
      if (!otp.challengeId) {
        throw new Error("Could not send OTP. Update your account contact and try again.");
      }
      setGoLiveChallengeId(otp.challengeId);
      setGoLiveCode("");
      setGoLiveChannel(otp.channel);
      setGoLiveModalOpen(true);
    } catch (cause) {
      const message = cause instanceof Error ? cause.message : "Could not send OTP.";
      setGoLiveError(message);
      showLiveNotice(message);
    } finally {
      setGoLiveBusy(false);
    }
  };

  const confirmGoLive = async () => {
    if (!authSession || !goLiveChallengeId) {
      return;
    }
    if (goLiveCode.trim().length !== 6) {
      setGoLiveError("Enter the 6-digit OTP code.");
      return;
    }

    setGoLiveBusy(true);
    setGoLiveError("");
    try {
      await merchantAuthApi.verifyOtp({
        challengeId: goLiveChallengeId,
        code: goLiveCode.trim(),
        purpose: "signin"
      });
      writeLiveStatus(authSession.user.id, "online");
      writeGoLivePromptPending(authSession.user.id, false);
      setStoreLiveStatus("online");
      setGoLivePromptPending(false);
      setStoreProfile((current) => ({ ...current, discoverable: true }));
      setGoLiveModalOpen(false);
      setGoLiveChallengeId(null);
      setGoLiveCode("");
      setGoLiveChannel(null);
      showLiveNotice("Store is now online.", "online");
    } catch (cause) {
      setGoLiveError(cause instanceof Error ? cause.message : "Could not verify OTP.");
    } finally {
      setGoLiveBusy(false);
    }
  };

  const handleStoreLiveStatusChange = (status: MerchantLiveStatus) => {
    if (!authSession) return;
    if (status === "online" && goLivePromptPending) {
      void requestGoLiveOtp();
      return;
    }
    writeLiveStatus(authSession.user.id, status);
    setStoreLiveStatus(status);
    setStoreProfile((current) => ({ ...current, discoverable: status === "online" }));
    showLiveNotice(
      status === "online" ? "Store is online." : "Store is offline.",
      status === "online" ? "online" : "offline"
    );
  };

  const onAddItem = (item: InventoryItem) => {
    void (async () => {
      try {
        const saved = await merchantApi.upsertItem(item);
        setItems((current) => [saved, ...current.filter((entry) => entry.id !== saved.id)]);
      } catch {
        setItems((current) => [{ ...item, status: deriveInventoryStatus(item) }, ...current]);
      }
    })();
  };

  const onUpdateItem = (itemId: string, next: Partial<InventoryItem>) => {
    const candidate = items.find((item) => item.id === itemId);
    if (!candidate) {
      return;
    }
    const merged = { ...candidate, ...next };
    void (async () => {
      try {
        const saved = await merchantApi.upsertItem(merged);
        setItems((current) =>
          current.map((item) =>
            item.id === itemId ? { ...saved, status: deriveInventoryStatus(saved) } : item
          )
        );
      } catch {
        setItems((current) =>
          current.map((item) => {
            if (item.id !== itemId) {
              return item;
            }
            const mergedLocal = { ...item, ...next };
            return { ...mergedLocal, status: deriveInventoryStatus(mergedLocal) };
          })
        );
      }
    })();
  };

  const onDeleteItem = (itemId: string) => {
    void merchantApi.deleteItem(storeId, itemId).catch(() => {
      // Keep local behavior if API call fails.
    });
    setItems((current) => current.filter((item) => item.id !== itemId));
  };

  const onDeleteMany = (itemIds: string[]) => {
    itemIds.forEach((itemId) => {
      void merchantApi.deleteItem(storeId, itemId).catch(() => {
        // Keep local behavior if API call fails.
      });
    });
    setItems((current) => current.filter((item) => !itemIds.includes(item.id)));
  };

  const onAdjustStock = async (input: {
    itemId: string;
    quantity: number;
    reason: string;
    warehouse: string;
  }): Promise<InventoryItem | undefined> => {
    try {
      const saved = await merchantApi.adjustStock(storeId, input);
      setItems((current) =>
        current.map((item) =>
          item.id === saved.id ? { ...saved, status: deriveInventoryStatus(saved) } : item
        )
      );
      return saved;
    } catch {
      setItems((current) =>
        current.map((entry) => {
          if (entry.id !== input.itemId) {
            return entry;
          }
          const mergedLocal = {
            ...entry,
            quantity: Math.max(0, entry.quantity + input.quantity),
            location: input.warehouse
          };
          return { ...mergedLocal, status: deriveInventoryStatus(mergedLocal) };
        })
      );
      return undefined;
    }
  };

  const onImportCsv = async (csv: string): Promise<{ imported: number; skipped: number }> => {
    const result = await merchantApi.importInventoryCsv(storeId, csv);
    const updated = await merchantApi.listInventory(storeId, 200);
    setItems(updated);
    return result;
  };

  const onSaveStoreProfile = async (next: StoreProfile): Promise<void> => {
    try {
      await merchantApi.updateStoreProfile(storeId, next);
    } catch {
      // Keep local settings when API is temporarily unavailable.
    }
    setStoreProfile(next);
  };

  const onCompleteSale = async (sale: Omit<Sale, "id" | "date">): Promise<Sale> => {
    try {
      const saved = await merchantApi.completeSale(storeId, sale);
      setSales((current) => [saved, ...current]);
      setItems((current) =>
        current.map((item) => {
          const line = saved.items.find((entry) => entry.itemId === item.id);
          if (!line) {
            return item;
          }
          const quantity = Math.max(0, item.quantity - line.quantity);
          return {
            ...item,
            quantity,
            status: deriveInventoryStatus({
              quantity,
              minQuantity: item.minQuantity,
              expiryDate: item.expiryDate
            })
          };
        })
      );
      return saved;
    } catch {
      const nextSale: Sale = {
        ...sale,
        id: String(Date.now()),
        date: new Date().toISOString()
      };
      setSales((current) => [nextSale, ...current]);
      setItems((current) =>
        current.map((item) => {
          const line = sale.items.find((entry) => entry.itemId === item.id);
          if (!line) {
            return item;
          }
          const quantity = Math.max(0, item.quantity - line.quantity);
          return {
            ...item,
            quantity,
            status: deriveInventoryStatus({
              quantity,
              minQuantity: item.minQuantity,
              expiryDate: item.expiryDate
            })
          };
        })
      );
      return nextSale;
    }
  };

  const onAddSupplier = (supplier: Supplier) => {
    setSuppliers((current) => [supplier, ...current]);
  };

  const onPreferencesChange = (next: typeof notificationPreferences) => {
    setNotificationPreferences(next);
    void merchantApi.updatePreferences(storeId, next).catch(() => {
      // Keep local settings if API is unavailable.
    });
  };

  const mainView = useMemo(() => {
    if (view === "dashboard") {
      return <DashboardPage items={items} sales={sales} categories={categories} />;
    }
    if (view === "inventory") {
      return (
        <InventoryPage
          items={items}
          categories={categories}
          suppliers={suppliers}
          onAdd={onAddItem}
          onUpdate={onUpdateItem}
          onDelete={onDeleteItem}
          onDeleteMany={onDeleteMany}
          onAdjustStock={onAdjustStock}
          onImportCsv={onImportCsv}
        />
      );
    }
    if (view === "categories") {
      return <CategoriesPage categories={categories} items={items} sales={sales} />;
    }
    if (view === "suppliers") {
      return <SuppliersPage suppliers={suppliers} items={items} onAddSupplier={onAddSupplier} />;
    }
    if (view === "sales") {
      return <SalesPage items={items} sales={sales} onCompleteSale={onCompleteSale} />;
    }
    if (view === "messages") {
      return <MessagesPage storeId={storeId} storeName={storeProfile.name} />;
    }
    if (view === "reports") {
      return (
        <ReportsPage
          items={items}
          sales={sales}
          categories={categories}
          discovery={discoverySnapshot}
        />
      );
    }
    if (view === "support") {
      return <SupportPage />;
    }
    return (
      <SettingsPage
        preferences={notificationPreferences}
        onChange={onPreferencesChange}
        storeProfile={storeProfile}
        onSaveStoreProfile={onSaveStoreProfile}
        items={items}
        categories={categories}
        onImportCsv={onImportCsv}
      />
    );
  }, [
    view,
    items,
    sales,
    categories,
    suppliers,
    notificationPreferences,
    onPreferencesChange,
    onAdjustStock,
    onImportCsv,
    storeProfile,
    storeId
  ]);

  const merchantContext = useMemo(
    () => ({
      storeId,
      storeName: storeProfile.name,
      currency: storeProfile.currency,
      language: storeProfile.language,
      locale,
      timezone,
      formatMoney: (amount: number) => formatMoney(amount, locale, storeProfile.currency),
      formatDateTime: (iso: string) =>
        formatDateTime(iso, locale, timezone, storeProfile.dateFormat)
    }),
    [
      storeId,
      storeProfile.currency,
      storeProfile.language,
      storeProfile.name,
      storeProfile.dateFormat,
      locale,
      timezone
    ]
  );

  if (!authSession) {
    return (
      <>
        <button
          type="button"
          className="theme-fab"
          onClick={toggleTheme}
          aria-label={theme === "dark" ? "Switch to light mode" : "Switch to dark mode"}
        >
          {theme === "dark" ? "Light view" : "Night view"}
        </button>
        <AuthGate onAuthenticated={setAuthSession} />
      </>
    );
  }

  if (onboardingRequired && !onboardingComplete) {
    return (
      <>
        <button
          type="button"
          className="theme-fab"
          onClick={toggleTheme}
          aria-label={theme === "dark" ? "Switch to light mode" : "Switch to dark mode"}
        >
          {theme === "dark" ? "Light view" : "Night view"}
        </button>
        <OnboardingFlow
          storageScope={authSession.user.id}
          storeProfile={storeProfile}
          categories={categories}
          onSave={onSaveStoreProfile}
          onComplete={() => {
            localStorage.setItem(onboardingDoneKey, "1");
            localStorage.removeItem(onboardingRequiredKey);
            setOnboardingRequired(false);
            setOnboardingComplete(true);
          }}
        />
      </>
    );
  }

  if (bootstrapStatus === "loading") {
    return (
      <div className="app-root" data-bootstrap-status={bootstrapStatus} data-bootstrap-source={bootstrapSource}>
        <div className="main-shell">
          <main className="main-content">
            <section className="panel">
              <h3>Loading store data...</h3>
              <p className="muted">Preparing your inventory, sales, and reports.</p>
            </section>
          </main>
        </div>
      </div>
    );
  }

  return (
    <TutorialProvider
      userId={authSession.user.id}
      currentView={view}
      onNavigate={setView}
      autoStartTourName={onboardingComplete ? "merchant_global_intro" : null}
    >
      <MerchantProvider value={merchantContext}>
        <div className="app-root" data-bootstrap-status={bootstrapStatus} data-bootstrap-source={bootstrapSource}>
          <Sidebar
            currentView={view}
            onChange={setView}
            menuMode={menuMode}
            onMenuModeChange={setMenuMode}
            expanded={expanded}
            onToggle={() => setExpanded((prev) => !prev)}
            onSignOut={() => {
              void onSignOut();
            }}
          />
          <div className="main-shell">
            {liveModeNotice && (
              <div
                className={`top-status-notice${
                  liveModeNoticeTone === "neutral" ? "" : ` is-${liveModeNoticeTone}`
                }`}
              >
                {liveModeNotice}
              </div>
            )}
            {showLiveBanner && (
              <section className="go-live-banner">
                <div>
                  <strong>Go live when you are ready</strong>
                  <p>
                    Your store is currently offline. Confirm with OTP to publish your inventory to discovery.
                  </p>
                </div>
                <button
                  type="button"
                  className="btn btn-primary"
                  onClick={() => {
                    void requestGoLiveOtp();
                  }}
                  disabled={goLiveBusy}
                >
                  {goLiveBusy ? "Sending..." : "Go Live"}
                </button>
              </section>
            )}
            <Topbar
              view={view}
              theme={theme}
              onToggleTheme={toggleTheme}
              storeLiveStatus={storeLiveStatus}
              onStoreLiveStatusChange={handleStoreLiveStatusChange}
              storeStatusBusy={goLiveBusy}
            />
            <MobileNav
              currentView={view}
              onChange={setView}
              menuMode={menuMode}
              onMenuModeChange={setMenuMode}
              onSignOut={() => {
                void onSignOut();
              }}
            />
            <main className="main-content">{mainView}</main>
          </div>
        </div>
        {goLiveModalOpen && (
          <div className="modal-backdrop">
            <div className="modal">
              <header>
                <h3>Confirm going live</h3>
                <button
                  className="icon-btn"
                  onClick={() => {
                    if (goLiveBusy) return;
                    setGoLiveModalOpen(false);
                    setGoLiveError("");
                  }}
                >
                  X
                </button>
              </header>
              <div className="modal-body">
                <p className="muted">
                  Enter the verification code sent to your account
                  {goLiveChannel ? ` via ${goLiveChannel}` : ""}.
                </p>
                <label>
                  OTP code
                  <input
                    value={goLiveCode}
                    onChange={(event) => setGoLiveCode(event.target.value)}
                    maxLength={6}
                    placeholder="000000"
                  />
                </label>
                {goLiveError && <p className="danger-text">{goLiveError}</p>}
              </div>
              <footer>
                <button
                  className="btn btn-outline"
                  onClick={() => {
                    void requestGoLiveOtp();
                  }}
                  disabled={goLiveBusy}
                >
                  Resend code
                </button>
                <button
                  className="btn btn-primary"
                  onClick={() => {
                    void confirmGoLive();
                  }}
                  disabled={goLiveBusy || goLiveCode.trim().length !== 6}
                >
                  {goLiveBusy ? "Verifying..." : "Go live now"}
                </button>
              </footer>
            </div>
          </div>
        )}
      </MerchantProvider>
    </TutorialProvider>
  );
}
