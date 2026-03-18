import {
  AlertTriangle,
  ArrowDown,
  ArrowUp,
  BarChart3,
  Building2,
  Megaphone,
  Moon,
  Trash2,
  Search,
  ShieldCheck,
  MapPinned,
  Store,
  Sun,
  Upload,
  UserCog
} from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { AuthGate } from "./components/auth/AuthGate";
import { GeoRadiusMap } from "./components/GeoRadiusMap";
import { ImageCropModal } from "./components/media/ImageCropModal";
import { adminApi, adminAuthApi, type AdminAuthSession, type RangePreset } from "./state/api";

type Tab = "platform" | "overlap" | "ads" | "accounts" | "merchant-health" | "stores" | "moderation";
type Scope = "overall" | "area";
type RangeMode = RangePreset | "custom";
type PlatformRankingView =
  | "ranked-searches"
  | "top-stores"
  | "full-store-ranking"
  | "product-sales-ranking"
  | "sales-dimension-ranking"
  | "customer-purchase-intelligence";

const tabs: { id: Tab; label: string; icon: JSX.Element }[] = [
  { id: "platform", label: "Platform", icon: <BarChart3 size={16} /> },
  { id: "overlap", label: "Overlap", icon: <AlertTriangle size={16} /> },
  { id: "ads", label: "Ads", icon: <Megaphone size={16} /> },
  { id: "accounts", label: "Accounts", icon: <UserCog size={16} /> },
  { id: "merchant-health", label: "Merchant Health", icon: <Building2 size={16} /> },
  { id: "stores", label: "Stores", icon: <Store size={16} /> },
  { id: "moderation", label: "Moderation", icon: <ShieldCheck size={16} /> }
];

const formatPercent = (value: number): string => `${(value * 100).toFixed(2)}%`;
type ThemeMode = "light" | "dark";
const THEME_KEY = "myhiro_theme_admin";

const isoFromDateInput = (value: string): string | undefined => {
  const trimmed = value.trim();
  if (!trimmed) return undefined;
  // "YYYY-MM-DD" is parsed as UTC midnight by Date in modern runtimes.
  const ms = new Date(trimmed).getTime();
  if (!Number.isFinite(ms)) return undefined;
  return new Date(ms).toISOString();
};

export function App() {
  const [authSession, setAuthSession] = useState<AdminAuthSession | null>(() => adminAuthApi.getSession());
  const [theme, setTheme] = useState<ThemeMode>(() => {
    if (typeof window === "undefined") return "light";
    const stored = localStorage.getItem(THEME_KEY);
    if (stored === "light" || stored === "dark") return stored;
    return window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
  });
  const [tab, setTab] = useState<Tab>("platform");
  const [rangeMode, setRangeMode] = useState<RangeMode>("30days");
  const [customStart, setCustomStart] = useState("");
  const [customEnd, setCustomEnd] = useState("");
  const [scope, setScope] = useState<Scope>("overall");
  const [platformRankingView, setPlatformRankingView] = useState<PlatformRankingView>("ranked-searches");
  const [center, setCenter] = useState({ lat: 5.6037, lng: -0.1870 }); // Accra
  const [radiusKm, setRadiusKm] = useState(8);

  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string>("");

  const [platform, setPlatform] = useState<Awaited<ReturnType<typeof adminApi.getPlatform>> | null>(null);
  const [overlap, setOverlap] = useState<Awaited<ReturnType<typeof adminApi.getOverlap>> | null>(null);
  const [ads, setAds] = useState<Awaited<ReturnType<typeof adminApi.getAds>> | null>(null);
  const [missedDemand, setMissedDemand] = useState<Awaited<ReturnType<typeof adminApi.getMissedDemand>>>([]);
  const [merchantHealth, setMerchantHealth] = useState<Awaited<ReturnType<typeof adminApi.getMerchantHealth>>>([]);
  const [topSearches, setTopSearches] = useState<Awaited<ReturnType<typeof adminApi.getTopSearches>> | null>(null);
  const [topStores, setTopStores] = useState<Awaited<ReturnType<typeof adminApi.getTopStores>> | null>(null);
  const [storeRankings, setStoreRankings] = useState<Awaited<ReturnType<typeof adminApi.getStoreRankings>> | null>(
    null
  );
  const [productSalesRanking, setProductSalesRanking] = useState<
    Awaited<ReturnType<typeof adminApi.getProductSalesRanking>> | null
  >(null);
  const [salesDimensionRanking, setSalesDimensionRanking] = useState<
    Awaited<ReturnType<typeof adminApi.getSalesDimensionRanking>> | null
  >(null);
  const [customerPurchases, setCustomerPurchases] = useState<
    Awaited<ReturnType<typeof adminApi.getCustomerPurchases>> | null
  >(null);
  const [customerContactFilter, setCustomerContactFilter] = useState("");
  const [customerEmailFilter, setCustomerEmailFilter] = useState("");
  const [moderation, setModeration] = useState<Awaited<ReturnType<typeof adminApi.getModerationOverview>> | null>(null);
  const [abuseStatus, setAbuseStatus] = useState<"all" | "open" | "resolved">("open");
  const [abuseReports, setAbuseReports] = useState<Awaited<ReturnType<typeof adminApi.listAbuseReports>>["rows"]>([]);
  const [storesRows, setStoresRows] = useState<Awaited<ReturnType<typeof adminApi.listStores>>["rows"]>([]);
  const [storeQuery, setStoreQuery] = useState("");
  const [storeVerificationFilter, setStoreVerificationFilter] = useState<
    "all" | "Unverified" | "Verified" | "Partner"
  >("all");
  const [storeFlaggedOnly, setStoreFlaggedOnly] = useState(false);
  const [storeSubmittedOnly, setStoreSubmittedOnly] = useState(false);
  const [selectedVerificationStoreId, setSelectedVerificationStoreId] = useState("");
  const [verificationDocsRows, setVerificationDocsRows] = useState<
    Awaited<ReturnType<typeof adminApi.listStoreVerificationDocuments>>["rows"]
  >([]);
  const [verificationDocsBusy, setVerificationDocsBusy] = useState(false);
  const [adPlacements, setAdPlacements] = useState<Awaited<ReturnType<typeof adminApi.listAdPlacements>>>([]);
  const [sponsorshipRows, setSponsorshipRows] = useState<Awaited<ReturnType<typeof adminApi.listSponsorships>>>([]);
  const [accountsRows, setAccountsRows] = useState<Awaited<ReturnType<typeof adminApi.listAccounts>>["rows"]>([]);
  const [signupsRows, setSignupsRows] = useState<Awaited<ReturnType<typeof adminApi.listSignups>>["rows"]>([]);
  const [accountPlatformFilter, setAccountPlatformFilter] = useState<"all" | "merchant" | "discovery" | "admin">("all");
  const [accountStatusFilter, setAccountStatusFilter] = useState<"all" | "active" | "disabled" | "deleted">("all");
  const [accountQuery, setAccountQuery] = useState("");

  const [newAdTitle, setNewAdTitle] = useState("");
  const [newAdSubtitle, setNewAdSubtitle] = useState("");
  const [newAdImageUrl, setNewAdImageUrl] = useState("");
  const [newAdLinkType, setNewAdLinkType] = useState<
    | "none"
    | "custom_url"
    | "discovery_page"
    | "discovery_store"
    | "discovery_product"
    | "merchant_page"
  >("none");
  const [newAdLinkTarget, setNewAdLinkTarget] = useState("");
  const [adLinkTargets, setAdLinkTargets] = useState<
    Array<{ id: string; label: string; store_id?: string; store_name?: string }>
  >([]);
  const [adLinkTargetSearch, setAdLinkTargetSearch] = useState("");
  const [newAdPlacement, setNewAdPlacement] = useState<
    "homepage_hero" | "store_profile" | "product_page" | "store_page" | "merchant_support"
  >("homepage_hero");
  const [newAdPriority, setNewAdPriority] = useState(100);
  const [adUploading, setAdUploading] = useState(false);
  const [pendingAdFile, setPendingAdFile] = useState<File | null>(null);

  const [newSponsorshipType, setNewSponsorshipType] = useState<"store" | "product">("store");
  const [newSponsorshipTargetId, setNewSponsorshipTargetId] = useState("");
  const [sponsorshipTargets, setSponsorshipTargets] = useState<
    Array<{ id: string; label: string; store_id?: string; store_name?: string }>
  >([]);
  const [sponsorshipTargetSearch, setSponsorshipTargetSearch] = useState("");
  const [newSponsorshipPriority, setNewSponsorshipPriority] = useState(100);
  const [newSponsorshipLabel, setNewSponsorshipLabel] = useState("Sponsored");

  useEffect(() => {
    if (typeof window === "undefined") return;
    const params = new URLSearchParams(window.location.search);
    if (params.get("resetAuth") !== "1") return;
    void adminAuthApi.clearSession();
    setAuthSession(null);
    params.delete("resetAuth");
    const next = params.toString();
    window.history.replaceState(null, "", next ? `/?${next}` : "/");
  }, []);

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

  const handleSignOut = () => {
    if (typeof window !== "undefined") {
      const confirmed = window.confirm("Are you sure you want to sign out?");
      if (!confirmed) {
        return;
      }
    }
    void adminAuthApi.clearSession().finally(() => {
      setAuthSession(null);
    });
  };

  useEffect(() => {
    if (!authSession) return;
    if (authSession.user.role === "admin") return;
    void adminAuthApi.clearSession();
    setAuthSession(null);
  }, [authSession]);

  const rangeInput = useMemo(() => {
    if (rangeMode === "custom") {
      const start = isoFromDateInput(customStart);
      const end = isoFromDateInput(customEnd);
      return { start, end };
    }
    return { range: rangeMode };
  }, [rangeMode, customStart, customEnd]);

  const geoInput = useMemo(() => {
    if (scope !== "area") return {};
    return { center_lat: center.lat, center_lng: center.lng, radius_km: radiusKm };
  }, [scope, center, radiusKm]);

  useEffect(() => {
    if (!authSession) {
      return;
    }
    let mounted = true;
    setBusy(true);
    setError("");

    const load = async () => {
      if (tab === "platform") {
        const [platformRes, searchesRes, storesRes, rankingsRes, productRes, dimensionsRes, customerRes] = await Promise.all([
          adminApi.getPlatform(rangeInput),
          adminApi.getTopSearches({ ...rangeInput, ...geoInput }),
          adminApi.getTopStores({ ...rangeInput, ...geoInput }),
          adminApi.getStoreRankings({
            ...rangeInput,
            ...geoInput,
            scope: scope === "area" ? "geo" : "overall"
          }),
          adminApi.getProductSalesRanking(rangeInput),
          adminApi.getSalesDimensionRanking(rangeInput),
          adminApi.getCustomerPurchases({
            ...rangeInput,
            contact: customerContactFilter.trim() || undefined,
            email: customerEmailFilter.trim() || undefined
          })
        ]);
        if (!mounted) return;
        setPlatform(platformRes);
        setTopSearches(searchesRes);
        setTopStores(storesRes);
        setStoreRankings(rankingsRes);
        setProductSalesRanking(productRes);
        setSalesDimensionRanking(dimensionsRes);
        setCustomerPurchases(customerRes);
        return;
      }

      if (tab === "overlap") {
        const [overlapRes, missedRes] = await Promise.all([
          adminApi.getOverlap(rangeInput),
          adminApi.getMissedDemand(rangeInput)
        ]);
        if (!mounted) return;
        setOverlap(overlapRes);
        setMissedDemand(missedRes);
        return;
      }

      if (tab === "ads") {
        const [adsRes, placementsRes, sponsorshipRes] = await Promise.all([
          adminApi.getAds(rangeInput),
          adminApi.listAdPlacements(),
          adminApi.listSponsorships()
        ]);
        if (!mounted) return;
        setAds(adsRes);
        setAdPlacements(placementsRes);
        setSponsorshipRows(sponsorshipRes);
        return;
      }

      if (tab === "accounts") {
        const [accountsRes, signupsRes] = await Promise.all([
          adminApi.listAccounts({
            platform: accountPlatformFilter === "all" ? undefined : accountPlatformFilter,
            status: accountStatusFilter === "all" ? undefined : accountStatusFilter,
            q: accountQuery.trim() || undefined
          }),
          adminApi.listSignups({
            platform: accountPlatformFilter === "all" ? undefined : accountPlatformFilter,
            start: rangeInput.start,
            end: rangeInput.end
          })
        ]);
        if (!mounted) return;
        setAccountsRows(accountsRes.rows);
        setSignupsRows(signupsRes.rows);
        return;
      }

      if (tab === "merchant-health") {
        const rows = await adminApi.getMerchantHealth(rangeInput);
        if (!mounted) return;
        setMerchantHealth(rows);
        return;
      }

      if (tab === "stores") {
        const res = await adminApi.listStores();
        if (!mounted) return;
        setStoresRows(res.rows);
        setSelectedVerificationStoreId((current) => {
          if (current && res.rows.some((row) => row.store_id === current)) {
            return current;
          }
          return (
            res.rows.find((row) => row.verification_submitted)?.store_id ??
            res.rows[0]?.store_id ??
            ""
          );
        });
        return;
      }

      if (tab === "moderation") {
        const [overview, reports] = await Promise.all([
          adminApi.getModerationOverview(),
          adminApi.listAbuseReports(abuseStatus === "all" ? undefined : abuseStatus)
        ]);
        if (!mounted) return;
        setModeration(overview);
        setAbuseReports(reports.rows);
      }
    };

    load()
      .catch((err) => {
        if (!mounted) return;
        setError(err instanceof Error ? err.message : "Failed to load admin analytics");
      })
      .finally(() => {
        if (!mounted) return;
        setBusy(false);
      });

    return () => {
      mounted = false;
    };
  }, [
    tab,
    rangeInput,
    geoInput,
    abuseStatus,
    scope,
    customerContactFilter,
    customerEmailFilter,
    accountPlatformFilter,
    accountStatusFilter,
    accountQuery,
    authSession
  ]);

  const scopeLabel = scope === "overall" ? "Overall" : "This area";

  const verificationQueue = useMemo(() => {
    return storesRows.filter((row) => row.verification === "Unverified" && row.verification_submitted);
  }, [storesRows]);

  const flaggedStores = useMemo(() => {
    return storesRows.filter((row) => row.open_reports > 0);
  }, [storesRows]);

  const filteredStores = useMemo(() => {
    const q = storeQuery.trim().toLowerCase();
    return storesRows.filter((row) => {
      if (q) {
        const name = row.store_name.toLowerCase();
        const id = row.store_id.toLowerCase();
        if (!name.includes(q) && !id.includes(q)) return false;
      }
      if (storeVerificationFilter !== "all" && row.verification !== storeVerificationFilter) {
        return false;
      }
      if (storeFlaggedOnly && row.open_reports === 0) return false;
      if (storeSubmittedOnly && !row.verification_submitted) return false;
      return true;
    });
  }, [storesRows, storeQuery, storeFlaggedOnly, storeSubmittedOnly, storeVerificationFilter]);

  useEffect(() => {
    if (tab !== "stores" || !selectedVerificationStoreId) {
      setVerificationDocsRows([]);
      return;
    }

    let mounted = true;
    setVerificationDocsBusy(true);
    adminApi
      .listStoreVerificationDocuments(selectedVerificationStoreId)
      .then((payload) => {
        if (!mounted) return;
        setVerificationDocsRows(payload.rows);
      })
      .catch((err) => {
        if (!mounted) return;
        setError(err instanceof Error ? err.message : "Failed to load verification documents");
      })
      .finally(() => {
        if (!mounted) return;
        setVerificationDocsBusy(false);
      });

    return () => {
      mounted = false;
    };
  }, [tab, selectedVerificationStoreId]);

  const setStoreVerification = (storeId: string, verification: "Unverified" | "Verified" | "Partner") => {
    void adminApi
      .updateStoreVerification(storeId, verification)
      .then((result) => {
        setStoresRows((current) =>
          current.map((row) => (row.store_id === storeId ? { ...row, ...result.row } : row))
        );
      })
      .catch((err) => {
        setError(err instanceof Error ? err.message : "Failed to update store verification");
      });
  };

  const refreshAdsData = () => {
    void Promise.all([adminApi.listAdPlacements(), adminApi.listSponsorships()])
      .then(([placements, sponsors]) => {
        setAdPlacements(placements);
        setSponsorshipRows(sponsors);
      })
      .catch((err) => {
        setError(err instanceof Error ? err.message : "Failed to reload ad data");
      });
  };

  useEffect(() => {
    if (tab !== "ads") {
      return;
    }
    let mounted = true;
    const timer = window.setTimeout(() => {
      void adminApi
        .listSponsorshipTargets({
          type: newSponsorshipType,
          q: sponsorshipTargetSearch.trim() || undefined
        })
        .then((payload) => {
          if (!mounted) return;
          setSponsorshipTargets(payload.rows);
          if (
            newSponsorshipTargetId &&
            !payload.rows.some((entry) => entry.id === newSponsorshipTargetId)
          ) {
            setNewSponsorshipTargetId("");
          }
        })
        .catch((err) => {
          if (!mounted) return;
          setError(err instanceof Error ? err.message : "Failed to load sponsorship targets");
        });
    }, 150);

    return () => {
      mounted = false;
      window.clearTimeout(timer);
    };
  }, [tab, newSponsorshipType, sponsorshipTargetSearch, newSponsorshipTargetId]);

  const adLinkTargetType = useMemo(() => {
    if (newAdLinkType === "discovery_store") {
      return "store" as const;
    }
    if (newAdLinkType === "discovery_product") {
      return "product" as const;
    }
    return null;
  }, [newAdLinkType]);

  useEffect(() => {
    if (!adLinkTargetType) {
      setAdLinkTargets([]);
      return;
    }
    if (tab !== "ads") {
      return;
    }
    let mounted = true;
    const timer = window.setTimeout(() => {
      void adminApi
        .listSponsorshipTargets({
          type: adLinkTargetType,
          q: adLinkTargetSearch.trim() || undefined
        })
        .then((payload) => {
          if (!mounted) return;
          setAdLinkTargets(payload.rows);
          if (
            newAdLinkTarget &&
            !payload.rows.some((entry) => entry.id === newAdLinkTarget)
          ) {
            setNewAdLinkTarget("");
          }
        })
        .catch((err) => {
          if (!mounted) return;
          setError(err instanceof Error ? err.message : "Failed to load ad link targets");
        });
    }, 150);

    return () => {
      mounted = false;
      window.clearTimeout(timer);
    };
  }, [tab, adLinkTargetType, adLinkTargetSearch, newAdLinkTarget]);

  const createAdPlacement = () => {
    if (!newAdTitle.trim() || !newAdImageUrl.trim()) {
      setError("Ad title and image URL are required.");
      return;
    }
    if (newAdLinkType !== "none" && !newAdLinkTarget.trim()) {
      setError("Link target is required for the selected link behavior.");
      return;
    }
    void adminApi
      .createAdPlacement({
        title: newAdTitle.trim(),
        subtitle: newAdSubtitle.trim() || undefined,
        image_url: newAdImageUrl.trim(),
        link_type: newAdLinkType,
        link_target: newAdLinkType === "none" ? undefined : newAdLinkTarget.trim(),
        link_url:
          newAdLinkType === "custom_url" && newAdLinkTarget.trim()
            ? newAdLinkTarget.trim()
            : undefined,
        placements: [newAdPlacement],
        priority: newAdPriority,
        active: true
      })
      .then(() => {
        setNewAdTitle("");
        setNewAdSubtitle("");
        setNewAdImageUrl("");
        setNewAdLinkType("none");
        setNewAdLinkTarget("");
        setAdLinkTargetSearch("");
        setNewAdPriority(100);
        refreshAdsData();
      })
      .catch((err) => {
        setError(err instanceof Error ? err.message : "Failed to create ad placement");
      });
  };

  const uploadAdImage = (file: File | undefined) => {
    if (!file) return;
    if (!String(file.type ?? "").toLowerCase().startsWith("image/")) {
      setError("Please choose an image file for ad banner upload.");
      return;
    }
    setError("");
    setPendingAdFile(file);
  };

  const closeAdCrop = () => {
    if (adUploading) return;
    setPendingAdFile(null);
  };

  const applyAdCrop = async (blob: Blob) => {
    setAdUploading(true);
    setError("");
    const file = new File([blob], `ad-banner-${Date.now()}.webp`, { type: "image/webp" });
    void adminApi
      .uploadAdImage(file, { preset: "ad_banner" })
      .then((url) => setNewAdImageUrl(url))
      .catch((err) => {
        setError(err instanceof Error ? err.message : "Image upload failed");
      })
      .finally(() => {
        setAdUploading(false);
        setPendingAdFile(null);
      });
  };

  const createSponsorship = () => {
    if (!newSponsorshipTargetId.trim()) {
      setError("Sponsorship target ID is required.");
      return;
    }
    void adminApi
      .createSponsorship({
        target_type: newSponsorshipType,
        target_id: newSponsorshipTargetId.trim(),
        priority: newSponsorshipPriority,
        label: newSponsorshipLabel.trim() || "Sponsored",
        active: true
      })
      .then(() => {
        setNewSponsorshipTargetId("");
        setNewSponsorshipPriority(100);
        setNewSponsorshipLabel("Sponsored");
        refreshAdsData();
      })
      .catch((err) => {
        setError(err instanceof Error ? err.message : "Failed to create sponsorship");
      });
  };

  const updateAccountStatus = (id: string, status: "active" | "disabled" | "deleted") => {
    void adminApi
      .updateAccountStatus(id, status)
      .then(() => {
        return adminApi.listAccounts({
          platform: accountPlatformFilter === "all" ? undefined : accountPlatformFilter,
          status: accountStatusFilter === "all" ? undefined : accountStatusFilter,
          q: accountQuery.trim() || undefined
        });
      })
      .then((payload) => {
        setAccountsRows(payload.rows);
      })
      .catch((err) => {
        setError(err instanceof Error ? err.message : "Failed to update account status");
      });
  };

  const updateVerificationDocumentStatus = (
    docId: string,
    status: "submitted" | "approved" | "rejected"
  ) => {
    if (!selectedVerificationStoreId) return;
    void adminApi
      .updateStoreVerificationDocument(selectedVerificationStoreId, docId, { status })
      .then(() => adminApi.listStoreVerificationDocuments(selectedVerificationStoreId))
      .then((payload) => {
        setVerificationDocsRows(payload.rows);
      })
      .catch((err) => {
        setError(err instanceof Error ? err.message : "Failed to update document status");
      });
  };

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

  return (
    <div className="admin-shell">
      <header className="admin-top">
        <div>
          <h1>myHiro Admin</h1>
          <p>Inventory + discovery oversight with analytics, geography, and moderation</p>
        </div>
        <div className="toolbar">
          <label className="search-wrap">
            <Search size={16} />
            <input placeholder="Search stores, queries, or metrics..." />
          </label>

          <select value={rangeMode} onChange={(event) => setRangeMode(event.target.value as RangeMode)}>
            <option value="7days">Last 7 days</option>
            <option value="30days">Last 30 days</option>
            <option value="3months">Last 3 months</option>
            <option value="6months">Last 6 months</option>
            <option value="1year">Last year</option>
            <option value="custom">Custom</option>
          </select>
          {tab === "platform" && (
            <select
              value={platformRankingView}
              onChange={(event) => setPlatformRankingView(event.target.value as PlatformRankingView)}
            >
              <option value="ranked-searches">Ranked searches</option>
              <option value="top-stores">Top stores</option>
              <option value="full-store-ranking">Full store ranking</option>
              <option value="product-sales-ranking">Product sales ranking</option>
              <option value="sales-dimension-ranking">Audience/category ranking</option>
              <option value="customer-purchase-intelligence">Customer purchase intelligence</option>
            </select>
          )}
          <button
            type="button"
            className="action theme-toggle-btn"
            onClick={toggleTheme}
            aria-label={theme === "dark" ? "Switch to light mode" : "Switch to dark mode"}
          >
            {theme === "dark" ? <Sun size={15} /> : <Moon size={15} />}
            {theme === "dark" ? "Light" : "Night"}
          </button>
          <button
            type="button"
            className="action"
            onClick={handleSignOut}
          >
            Sign out
          </button>
        </div>

        {rangeMode === "custom" && (
          <div className="toolbar toolbar--dates">
            <label className="date-field">
              <span>Start</span>
              <input type="date" value={customStart} onChange={(e) => setCustomStart(e.target.value)} />
            </label>
            <label className="date-field">
              <span>End</span>
              <input type="date" value={customEnd} onChange={(e) => setCustomEnd(e.target.value)} />
            </label>
          </div>
        )}
      </header>

      <nav className="tab-nav" aria-label="Admin sections">
        {tabs.map((entry) => (
          <button
            key={entry.id}
            className={entry.id === tab ? "tab active" : "tab"}
            onClick={() => setTab(entry.id)}
          >
            {entry.icon} {entry.label}
          </button>
        ))}
      </nav>

      <main className="stack">
        {error && (
          <section className="panel">
            <strong>Could not load</strong>
            <p style={{ color: "var(--muted)" }}>{error}</p>
          </section>
        )}

        {tab === "platform" && (
          <>
          <section className="panel">
            <div className="panel-head">
              <div>
                <h3>Geography filter</h3>
                <p>Scope: {scopeLabel}. Use this to rank searches and stores for a radius.</p>
              </div>
              <div className="scope-toggle" role="tablist" aria-label="Scope">
                <button
                  className={scope === "overall" ? "scope active" : "scope"}
                  onClick={() => setScope("overall")}
                  role="tab"
                  aria-selected={scope === "overall"}
                >
                  Overall
                </button>
                <button
                  className={scope === "area" ? "scope active" : "scope"}
                  onClick={() => setScope("area")}
                  role="tab"
                  aria-selected={scope === "area"}
                >
                  <MapPinned size={14} /> This area
                </button>
              </div>
            </div>
            {scope === "area" ? (
              <GeoRadiusMap center={center} radiusKm={radiusKm} onCenterChange={setCenter} onRadiusChange={setRadiusKm} />
            ) : (
              <div className="geo-muted">
                Switch to <strong>This area</strong> to set center + radius on the map.
              </div>
            )}
          </section>

          <section className="kpi-grid" aria-label="Platform KPIs">
            <article className="kpi">
              <small>Total Stores</small>
              <h3>{platform?.total_stores?.toLocaleString?.() ?? "..."}</h3>
            </article>
            <article className="kpi">
              <small>Active Stores</small>
              <h3>{platform?.active_stores?.toLocaleString?.() ?? "..."}</h3>
            </article>
            <article className="kpi">
              <small>Total SKUs</small>
              <h3>{platform?.total_skus?.toLocaleString?.() ?? "..."}</h3>
            </article>
            <article className="kpi">
              <small>Low-stock Incidents</small>
              <h3>{platform?.low_stock_incidents?.toLocaleString?.() ?? "..."}</h3>
            </article>
            <article className="kpi">
              <small>Discovery Searches</small>
              <h3>{platform?.discovery_searches?.toLocaleString?.() ?? "..."}</h3>
            </article>
            <article className="kpi">
              <small>No-result Rate</small>
              <h3>{platform ? formatPercent(platform.no_result_rate) : "..."}</h3>
            </article>
          </section>

          {platformRankingView === "ranked-searches" && (
          <section className="panel">
            <h3>Ranked searches ({scopeLabel})</h3>
            <p style={{ color: "var(--muted)", marginTop: 0 }}>
              Overall is based on search views/no-results; Area is based on store clicks within the radius.
            </p>
            <div className="table-wrap">
              <table>
                <thead>
                  <tr>
                    <th>Query</th>
                    <th>Searches</th>
                    <th>Clicks</th>
                    {scope === "area" && <th>Area clicks</th>}
                    {scope === "area" && <th>Stores clicked</th>}
                    <th>No-result rate</th>
                  </tr>
                </thead>
                <tbody>
                  {(topSearches?.rows ?? []).map((row) => (
                    <tr key={row.query}>
                      <td>{row.query}</td>
                      <td>{row.searches}</td>
                      <td>{row.clicks}</td>
                      {scope === "area" && <td>{row.area_clicks ?? 0}</td>}
                      {scope === "area" && <td>{row.stores_clicked ?? 0}</td>}
                      <td>{formatPercent(row.no_result_rate)}</td>
                    </tr>
                  ))}
                  {!busy && (topSearches?.rows?.length ?? 0) === 0 && (
                    <tr>
                      <td colSpan={scope === "area" ? 6 : 4} style={{ color: "var(--muted)" }}>
                        No search data yet. Use Discovery search to generate events.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </section>
          )}

          {platformRankingView === "top-stores" && (
          <section className="panel">
            <h3>Top stores ({scopeLabel})</h3>
            <p style={{ color: "var(--muted)", marginTop: 0 }}>
              Ranked by a weighted score (views, clicks, saves, requests, calls, directions).
            </p>
            <div className="table-wrap">
              <table>
                <thead>
                  <tr>
                    <th>Store</th>
                    <th>Region</th>
                    {scope === "area" && <th>Distance (km)</th>}
                    <th>Score</th>
                    <th>Calls</th>
                    <th>Directions</th>
                    <th>Saves</th>
                    <th>Requests</th>
                  </tr>
                </thead>
                <tbody>
                  {(topStores?.rows ?? []).map((row) => (
                    <tr key={row.store_id}>
                      <td>
                        {row.store_name} <span style={{ color: "var(--muted)" }}>({row.verification})</span>
                      </td>
                      <td>
                        {row.city ? `${row.city}, ` : ""}
                        {row.region}
                      </td>
                      {scope === "area" && <td>{row.distance_km ?? ""}</td>}
                      <td>{row.score}</td>
                      <td>{row.calls}</td>
                      <td>{row.directions}</td>
                      <td>{row.saves}</td>
                      <td>{row.requests}</td>
                    </tr>
                  ))}
                  {!busy && (topStores?.rows?.length ?? 0) === 0 && (
                    <tr>
                      <td colSpan={scope === "area" ? 8 : 7} style={{ color: "var(--muted)" }}>
                        No store performance yet. Open stores and use Call/Directions in Discovery.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </section>
          )}

          {platformRankingView === "full-store-ranking" && (
          <section className="panel">
            <h3>Full Store Ranking ({scopeLabel})</h3>
            <p style={{ color: "var(--muted)", marginTop: 0 }}>
              All stores ranked by engagement score. This includes every store, not only top results.
            </p>
            <div className="table-wrap">
              <table>
                <thead>
                  <tr>
                    <th>Rank</th>
                    <th>Store</th>
                    <th>Verification</th>
                    <th>Region</th>
                    {scope === "area" && <th>Distance (km)</th>}
                    <th>Score</th>
                    <th>Views</th>
                    <th>Clicks</th>
                    <th>Calls</th>
                  </tr>
                </thead>
                <tbody>
                  {(storeRankings?.rows ?? []).map((row) => (
                    <tr key={`ranking-${row.store_id}`}>
                      <td>#{row.rank}</td>
                      <td>{row.store_name}</td>
                      <td>{row.verification}</td>
                      <td>
                        {row.city ? `${row.city}, ` : ""}
                        {row.region}
                      </td>
                      {scope === "area" && <td>{row.distance_km ?? ""}</td>}
                      <td>{row.score}</td>
                      <td>{row.views}</td>
                      <td>{row.clicks}</td>
                      <td>{row.calls}</td>
                    </tr>
                  ))}
                  {!busy && (storeRankings?.rows?.length ?? 0) === 0 && (
                    <tr>
                      <td colSpan={scope === "area" ? 9 : 8} style={{ color: "var(--muted)" }}>
                        No ranking data available yet.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </section>
          )}

          {platformRankingView === "product-sales-ranking" && (
          <section className="panel">
            <h3>Product Sales Ranking</h3>
            <p style={{ color: "var(--muted)", marginTop: 0 }}>
              Platform-wide product sales ranking by revenue and margin.
            </p>
            <div className="table-wrap">
              <table>
                <thead>
                  <tr>
                    <th>Rank</th>
                    <th>Product</th>
                    <th>Units sold</th>
                    <th>Revenue</th>
                    <th>Profit</th>
                    <th>Margin</th>
                  </tr>
                </thead>
                <tbody>
                  {(productSalesRanking?.rows ?? []).map((row) => (
                    <tr key={`product-rank-${row.product_id}`}>
                      <td>#{row.rank}</td>
                      <td>{row.product_name}</td>
                      <td>{row.units_sold}</td>
                      <td>{row.revenue.toLocaleString("en-GH", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
                      <td>{row.profit.toLocaleString("en-GH", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
                      <td>{row.margin.toFixed(1)}%</td>
                    </tr>
                  ))}
                  {!busy && (productSalesRanking?.rows?.length ?? 0) === 0 && (
                    <tr>
                      <td colSpan={6} style={{ color: "var(--muted)" }}>
                        No product sales ranking yet.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </section>
          )}

          {platformRankingView === "sales-dimension-ranking" && (
          <section className="panel">
            <h3>Audience, Category and Subcategory Ranking</h3>
            <p style={{ color: "var(--muted)", marginTop: 0 }}>
              What is selling most by audience label, category and subcategory.
            </p>

            <div className="table-wrap">
              <table>
                <thead>
                  <tr>
                    <th>Rank</th>
                    <th>Audience</th>
                    <th>Units sold</th>
                    <th>Revenue</th>
                  </tr>
                </thead>
                <tbody>
                  {(salesDimensionRanking?.audience.rows ?? []).map((row) => (
                    <tr key={`audience-rank-${row.audience_label}`}>
                      <td>#{row.rank}</td>
                      <td>{row.audience_label}</td>
                      <td>{row.units_sold}</td>
                      <td>{row.revenue.toLocaleString("en-GH", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
                    </tr>
                  ))}
                  {!busy && (salesDimensionRanking?.audience.rows?.length ?? 0) === 0 && (
                    <tr>
                      <td colSpan={4} style={{ color: "var(--muted)" }}>
                        No audience ranking data yet.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>

            <div className="table-wrap" style={{ marginTop: 14 }}>
              <table>
                <thead>
                  <tr>
                    <th>Rank</th>
                    <th>Category</th>
                    <th>Units sold</th>
                    <th>Revenue</th>
                  </tr>
                </thead>
                <tbody>
                  {(salesDimensionRanking?.categories.rows ?? []).map((row) => (
                    <tr key={`category-rank-${row.category_id}`}>
                      <td>#{row.rank}</td>
                      <td>{row.category_name}</td>
                      <td>{row.units_sold}</td>
                      <td>{row.revenue.toLocaleString("en-GH", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
                    </tr>
                  ))}
                  {!busy && (salesDimensionRanking?.categories.rows?.length ?? 0) === 0 && (
                    <tr>
                      <td colSpan={4} style={{ color: "var(--muted)" }}>
                        No category ranking data yet.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>

            <div className="table-wrap" style={{ marginTop: 14 }}>
              <table>
                <thead>
                  <tr>
                    <th>Rank</th>
                    <th>Category</th>
                    <th>Subcategory</th>
                    <th>Units sold</th>
                    <th>Revenue</th>
                  </tr>
                </thead>
                <tbody>
                  {(salesDimensionRanking?.subcategories.rows ?? []).map((row) => (
                    <tr key={`subcategory-rank-${row.category_id}-${row.subcategory_label}`}>
                      <td>#{row.rank}</td>
                      <td>{row.category_name}</td>
                      <td>{row.subcategory_label}</td>
                      <td>{row.units_sold}</td>
                      <td>{row.revenue.toLocaleString("en-GH", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
                    </tr>
                  ))}
                  {!busy && (salesDimensionRanking?.subcategories.rows?.length ?? 0) === 0 && (
                    <tr>
                      <td colSpan={5} style={{ color: "var(--muted)" }}>
                        No subcategory ranking data yet.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </section>
          )}

          {platformRankingView === "customer-purchase-intelligence" && (
          <section className="panel">
            <div className="panel-head">
              <div>
                <h3>Customer Purchase Intelligence</h3>
                <p style={{ color: "var(--muted)", marginTop: 0 }}>
                  Track repeat buyers and purchased products by contact or email.
                </p>
              </div>
              <div className="toolbar">
                <label className="search-wrap" style={{ minWidth: 220 }}>
                  <Search size={16} />
                  <input
                    placeholder="Contact (+233...)"
                    value={customerContactFilter}
                    onChange={(event) => setCustomerContactFilter(event.target.value)}
                  />
                </label>
                <label className="search-wrap" style={{ minWidth: 240 }}>
                  <Search size={16} />
                  <input
                    placeholder="Email"
                    value={customerEmailFilter}
                    onChange={(event) => setCustomerEmailFilter(event.target.value)}
                  />
                </label>
              </div>
            </div>

            <div className="table-wrap">
              <table>
                <thead>
                  <tr>
                    <th>Contact</th>
                    <th>Email</th>
                    <th>Transactions</th>
                    <th>Total spend</th>
                    <th>Products purchased</th>
                  </tr>
                </thead>
                <tbody>
                  {(customerPurchases?.rows ?? []).map((row, index) => (
                    <tr key={`customer-${index}`}>
                      <td>{row.customer_contact ?? "-"}</td>
                      <td>{row.customer_email ?? "-"}</td>
                      <td>{row.transactions}</td>
                      <td>
                        {row.total_spend.toLocaleString("en-GH", {
                          minimumFractionDigits: 2,
                          maximumFractionDigits: 2
                        })}
                      </td>
                      <td>
                        {row.products
                          .slice(0, 3)
                          .map((entry) => `${entry.name} x${entry.quantity}`)
                          .join(", ") || "-"}
                      </td>
                    </tr>
                  ))}
                  {!busy && (customerPurchases?.rows?.length ?? 0) === 0 && (
                    <tr>
                      <td colSpan={5} style={{ color: "var(--muted)" }}>
                        No customer purchase records yet.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </section>
          )}
          </>
        )}

        {tab === "stores" && (
          <>
            <section className="kpi-grid kpi-grid--compact" aria-label="Store assessment KPIs">
              <article className="kpi">
                <small>Total stores</small>
                <h3>{storesRows.length.toLocaleString()}</h3>
              </article>
              <article className="kpi">
                <small>Verification queue</small>
                <h3>{verificationQueue.length.toLocaleString()}</h3>
              </article>
              <article className="kpi">
                <small>Flagged stores</small>
                <h3>{flaggedStores.length.toLocaleString()}</h3>
              </article>
              <article className="kpi">
                <small>Partners</small>
                <h3>{storesRows.filter((row) => row.verification === "Partner").length.toLocaleString()}</h3>
              </article>
              <article className="kpi">
                <small>Verified</small>
                <h3>{storesRows.filter((row) => row.verification === "Verified").length.toLocaleString()}</h3>
              </article>
            </section>

            <section className="panel">
              <div className="panel-head">
                <div>
                  <h3>Verification queue</h3>
                  <p style={{ color: "var(--muted)", marginTop: 0 }}>
                    Submitted stores awaiting review.
                  </p>
                </div>
              </div>

              <div className="table-wrap">
                <table>
                  <thead>
                    <tr>
                      <th>Store</th>
                      <th>Region</th>
                      <th>Open reports</th>
                      <th>Last update</th>
                      <th />
                    </tr>
                  </thead>
                  <tbody>
                    {verificationQueue.map((row) => (
                      <tr key={row.store_id}>
                        <td>{row.store_name}</td>
                        <td>
                          {row.city ? `${row.city}, ` : ""}
                          {row.region}
                        </td>
                        <td>{row.open_reports}</td>
                        <td>{new Date(row.last_inventory_update).toLocaleString()}</td>
                        <td>
                          <div className="actions">
                            <button
                              className="action"
                              onClick={() => setStoreVerification(row.store_id, "Verified")}
                              disabled={row.verification === "Verified"}
                            >
                              Set Verified
                            </button>
                            <button
                              className="action"
                              onClick={() => setStoreVerification(row.store_id, "Partner")}
                              disabled={row.verification === "Partner"}
                            >
                              Set Partner
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                    {!busy && verificationQueue.length === 0 && (
                      <tr>
                        <td colSpan={5} style={{ color: "var(--muted)" }}>
                          No submitted stores awaiting verification.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </section>

            <section className="panel">
              <div className="panel-head">
                <div>
                  <h3>Verification Documents</h3>
                  <p style={{ color: "var(--muted)", marginTop: 0 }}>
                    Review business and identity documents submitted by stores.
                  </p>
                </div>
                <div className="toolbar">
                  <select
                    value={selectedVerificationStoreId}
                    onChange={(event) => setSelectedVerificationStoreId(event.target.value)}
                  >
                    {storesRows.map((row) => (
                      <option key={`doc-store-${row.store_id}`} value={row.store_id}>
                        {row.store_name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="table-wrap">
                <table>
                  <thead>
                    <tr>
                      <th>Type</th>
                      <th>Label</th>
                      <th>Status</th>
                      <th>Uploaded</th>
                      <th>Document</th>
                      <th />
                    </tr>
                  </thead>
                  <tbody>
                    {verificationDocsRows.map((row) => (
                      <tr key={row.id}>
                        <td>{row.doc_type}</td>
                        <td>{row.label}</td>
                        <td>{row.status}</td>
                        <td>{new Date(row.uploaded_at).toLocaleString()}</td>
                        <td>
                          <a href={row.file_url} target="_blank" rel="noreferrer">
                            Open document
                          </a>
                        </td>
                        <td>
                          <div className="actions">
                            <button
                              className="action"
                              onClick={() => updateVerificationDocumentStatus(row.id, "submitted")}
                              disabled={row.status === "submitted"}
                            >
                              Submitted
                            </button>
                            <button
                              className="action"
                              onClick={() => updateVerificationDocumentStatus(row.id, "approved")}
                              disabled={row.status === "approved"}
                            >
                              Approve
                            </button>
                            <button
                              className="action"
                              onClick={() => updateVerificationDocumentStatus(row.id, "rejected")}
                              disabled={row.status === "rejected"}
                            >
                              Reject
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                    {!verificationDocsBusy && verificationDocsRows.length === 0 && (
                      <tr>
                        <td colSpan={6} style={{ color: "var(--muted)" }}>
                          No documents uploaded for this store yet.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </section>

            <section className="panel">
              <div className="panel-head">
                <div>
                  <h3>Flagged stores</h3>
                  <p style={{ color: "var(--muted)", marginTop: 0 }}>
                    Stores with open abuse reports from Discovery.
                  </p>
                </div>
              </div>

              <div className="table-wrap">
                <table>
                  <thead>
                    <tr>
                      <th>Store</th>
                      <th>Region</th>
                      <th>Open reports</th>
                      <th>Verification</th>
                      <th />
                    </tr>
                  </thead>
                  <tbody>
                    {flaggedStores.map((row) => (
                      <tr key={row.store_id}>
                        <td>{row.store_name}</td>
                        <td>
                          {row.city ? `${row.city}, ` : ""}
                          {row.region}
                        </td>
                        <td>{row.open_reports}</td>
                        <td>{row.verification}</td>
                        <td>
                          <div className="actions">
                            <button
                              className="action"
                              onClick={() => {
                                setTab("moderation");
                                setAbuseStatus("open");
                              }}
                            >
                              View reports
                            </button>
                            <button
                              className="action"
                              onClick={() => setStoreVerification(row.store_id, "Unverified")}
                              disabled={row.verification === "Unverified"}
                            >
                              Unverify
                            </button>
                            <button
                              className="action"
                              onClick={() => setStoreVerification(row.store_id, "Verified")}
                              disabled={row.verification === "Verified"}
                            >
                              Verify
                            </button>
                            <button
                              className="action"
                              onClick={() => setStoreVerification(row.store_id, "Partner")}
                              disabled={row.verification === "Partner"}
                            >
                              Partner
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                    {!busy && flaggedStores.length === 0 && (
                      <tr>
                        <td colSpan={5} style={{ color: "var(--muted)" }}>
                          No flagged stores yet.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </section>

            <section className="panel">
              <div className="panel-head">
                <div>
                  <h3>All stores</h3>
                  <p style={{ color: "var(--muted)", marginTop: 0 }}>
                    Search and manage verification states.
                  </p>
                </div>
                <div className="toolbar">
                  <label className="search-wrap" style={{ minWidth: 220 }}>
                    <Search size={16} />
                    <input
                      placeholder="Search stores..."
                      value={storeQuery}
                      onChange={(event) => setStoreQuery(event.target.value)}
                    />
                  </label>
                  <select
                    value={storeVerificationFilter}
                    onChange={(event) => setStoreVerificationFilter(event.target.value as any)}
                  >
                    <option value="all">All</option>
                    <option value="Unverified">Unverified</option>
                    <option value="Verified">Verified</option>
                    <option value="Partner">Partner</option>
                  </select>
                  <label className="check">
                    <input
                      type="checkbox"
                      checked={storeFlaggedOnly}
                      onChange={(event) => setStoreFlaggedOnly(event.target.checked)}
                    />
                    Flagged only
                  </label>
                  <label className="check">
                    <input
                      type="checkbox"
                      checked={storeSubmittedOnly}
                      onChange={(event) => setStoreSubmittedOnly(event.target.checked)}
                    />
                    Submitted only
                  </label>
                </div>
              </div>

              <div className="table-wrap">
                <table>
                  <thead>
                    <tr>
                      <th>Store</th>
                      <th>Region</th>
                      <th>Submitted</th>
                      <th>Open reports</th>
                      <th>Verification</th>
                      <th>Last update</th>
                      <th />
                    </tr>
                  </thead>
                  <tbody>
                    {filteredStores.map((row) => (
                      <tr key={row.store_id}>
                        <td>{row.store_name}</td>
                        <td>
                          {row.city ? `${row.city}, ` : ""}
                          {row.region}
                        </td>
                        <td>{row.verification_submitted ? "Yes" : "No"}</td>
                        <td>{row.open_reports}</td>
                        <td>{row.verification}</td>
                        <td>{new Date(row.last_inventory_update).toLocaleString()}</td>
                        <td>
                          <div className="actions">
                            <button
                              className="action"
                              onClick={() => setStoreVerification(row.store_id, "Unverified")}
                              disabled={row.verification === "Unverified"}
                            >
                              Unverified
                            </button>
                            <button
                              className="action"
                              onClick={() => setStoreVerification(row.store_id, "Verified")}
                              disabled={row.verification === "Verified"}
                            >
                              Verified
                            </button>
                            <button
                              className="action"
                              onClick={() => setStoreVerification(row.store_id, "Partner")}
                              disabled={row.verification === "Partner"}
                            >
                              Partner
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                    {!busy && filteredStores.length === 0 && (
                      <tr>
                        <td colSpan={7} style={{ color: "var(--muted)" }}>
                          No stores match your filters.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </section>
          </>
        )}

        {tab === "overlap" && (
          <>
          <section className="panel">
            <h3>Freshness and mismatch</h3>
            <p style={{ color: "var(--muted)", marginTop: 0 }}>
              SLA target is under 10 seconds for inventory propagation.
            </p>
            <div className="kpi-grid kpi-grid--compact">
              <article className="kpi">
                <small>Total inventory events</small>
                <h3>{overlap?.total_events ?? "..."}</h3>
              </article>
              <article className="kpi">
                <small>Stale events (&gt;10s)</small>
                <h3>{overlap?.stale_events ?? "..."}</h3>
              </article>
              <article className="kpi">
                <small>Avg lag</small>
                <h3>{overlap ? `${Math.round(overlap.freshness_lag_avg_ms / 1000)}s` : "..."}</h3>
              </article>
              <article className="kpi">
                <small>Mismatch rate</small>
                <h3>{overlap ? formatPercent(overlap.mismatch_rate) : "..."}</h3>
              </article>
              <article className="kpi">
                <small>Stale merchants</small>
                <h3>{overlap?.stale_update_merchants?.length ?? "..."}</h3>
              </article>
            </div>
          </section>

          <section className="panel">
            <h3>Missed demand queries</h3>
            <table>
              <thead>
                <tr>
                  <th>Query</th>
                  <th>Count</th>
                </tr>
              </thead>
              <tbody>
                {missedDemand.map((row) => (
                  <tr key={row.query}>
                    <td>{row.query}</td>
                    <td>{row.count}</td>
                  </tr>
                ))}
                {!busy && missedDemand.length === 0 && (
                  <tr>
                    <td colSpan={2} style={{ color: "var(--muted)" }}>
                      No missed demand yet.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </section>
          </>
        )}

        {tab === "ads" && (
          <>
            <section className="panel">
              <h3>Ads transparency</h3>
              <div className="kpi-grid kpi-grid--compact">
                <article className="kpi">
                  <small>Impressions</small>
                  <h3>{ads?.impressions?.toLocaleString?.() ?? "..."}</h3>
                </article>
                <article className="kpi">
                  <small>CTR</small>
                  <h3>{ads ? formatPercent(ads.ctr) : "..."}</h3>
                </article>
                <article className="kpi">
                  <small>Calls</small>
                  <h3>{ads?.calls ?? "..."}</h3>
                </article>
                <article className="kpi">
                  <small>Directions</small>
                  <h3>{ads?.directions ?? "..."}</h3>
                </article>
              </div>
            </section>

            <section className="panel">
              <div className="panel-head">
                <div>
                  <h3>Create Advertisement Banner</h3>
                  <p style={{ color: "var(--muted)", marginTop: 0 }}>
                    Upload and manage banner placements for homepage, store profile, store page, product page, and merchant support.
                  </p>
                </div>
              </div>
              <div className="toolbar" style={{ flexWrap: "wrap", alignItems: "flex-end" }}>
                <label className="date-field" style={{ minWidth: 220 }}>
                  <span>Title</span>
                  <input value={newAdTitle} onChange={(e) => setNewAdTitle(e.target.value)} placeholder="Banner title" />
                </label>
                <label className="date-field" style={{ minWidth: 220 }}>
                  <span>Subtitle</span>
                  <input value={newAdSubtitle} onChange={(e) => setNewAdSubtitle(e.target.value)} placeholder="Banner subtitle" />
                </label>
                <label className="date-field" style={{ minWidth: 220 }}>
                  <span>Image URL</span>
                  <input value={newAdImageUrl} onChange={(e) => setNewAdImageUrl(e.target.value)} placeholder="https://..." />
                </label>
                <label className="date-field" style={{ minWidth: 220 }}>
                  <span>Link behavior</span>
                  <select
                    value={newAdLinkType}
                    onChange={(e) =>
                      setNewAdLinkType(
                        e.target.value as
                          | "none"
                          | "custom_url"
                          | "discovery_page"
                          | "discovery_store"
                          | "discovery_product"
                          | "merchant_page"
                      )
                    }
                  >
                    <option value="none">No link</option>
                    <option value="discovery_page">Discovery page</option>
                    <option value="discovery_store">Discovery store</option>
                    <option value="discovery_product">Discovery product</option>
                    <option value="merchant_page">Merchant page</option>
                    <option value="custom_url">Custom URL</option>
                  </select>
                </label>
                {(newAdLinkType === "discovery_store" || newAdLinkType === "discovery_product") && (
                  <label className="date-field" style={{ minWidth: 260 }}>
                    <span>Search target</span>
                    <input
                      value={adLinkTargetSearch}
                      onChange={(e) => setAdLinkTargetSearch(e.target.value)}
                      placeholder={newAdLinkType === "discovery_store" ? "Search store..." : "Search product..."}
                    />
                  </label>
                )}
                {(newAdLinkType === "discovery_store" || newAdLinkType === "discovery_product") && (
                  <label className="date-field" style={{ minWidth: 300 }}>
                    <span>{newAdLinkType === "discovery_store" ? "Store" : "Product"}</span>
                    <select
                      value={newAdLinkTarget}
                      onChange={(e) => setNewAdLinkTarget(e.target.value)}
                    >
                      <option value="">Select target...</option>
                      {adLinkTargets.map((entry) => (
                        <option key={entry.id} value={entry.id}>
                          {entry.label}
                        </option>
                      ))}
                    </select>
                  </label>
                )}
                {newAdLinkType !== "none" &&
                  newAdLinkType !== "discovery_store" &&
                  newAdLinkType !== "discovery_product" && (
                  <label className="date-field" style={{ minWidth: 220 }}>
                    <span>
                      {newAdLinkType === "custom_url"
                        ? "URL"
                        : "Page target"}
                    </span>
                    <input
                      value={newAdLinkTarget}
                      onChange={(e) => setNewAdLinkTarget(e.target.value)}
                      placeholder={
                        newAdLinkType === "custom_url"
                          ? "https://..."
                          : newAdLinkType === "merchant_page"
                            ? "support"
                            : "search"
                      }
                    />
                  </label>
                )}
                <label className="date-field">
                  <span>Placement</span>
                  <select value={newAdPlacement} onChange={(e) => setNewAdPlacement(e.target.value as any)}>
                    <option value="homepage_hero">Homepage Hero</option>
                    <option value="store_profile">Store Profile</option>
                    <option value="store_page">Store Page</option>
                    <option value="product_page">Product Page</option>
                    <option value="merchant_support">Merchant Support</option>
                  </select>
                </label>
                <label className="date-field" style={{ width: 120 }}>
                  <span>Priority</span>
                  <input
                    type="number"
                    value={newAdPriority}
                    onChange={(e) => setNewAdPriority(Number(e.target.value) || 0)}
                  />
                </label>
                <label className="action" style={{ display: "inline-flex", gap: 6, alignItems: "center" }}>
                  <Upload size={14} />
                  Upload image
                  <input
                    type="file"
                    accept="image/*"
                    style={{ display: "none" }}
                    onChange={(event) => {
                      uploadAdImage(event.target.files?.[0]);
                      event.currentTarget.value = "";
                    }}
                  />
                </label>
                <button className="action" type="button" onClick={createAdPlacement} disabled={adUploading}>
                  {adUploading ? "Uploading..." : "Add banner"}
                </button>
              </div>
              <div className="table-wrap" style={{ marginTop: 12 }}>
                <table>
                  <thead>
                    <tr>
                      <th>Title</th>
                      <th>Placements</th>
                      <th>Link</th>
                      <th>Priority</th>
                      <th>Status</th>
                      <th />
                    </tr>
                  </thead>
                  <tbody>
                    {adPlacements.map((row, index) => (
                      <tr key={row.id}>
                        <td>
                          <div style={{ fontWeight: 600 }}>{row.title}</div>
                          {row.subtitle && <div style={{ color: "var(--muted)", fontSize: 12 }}>{row.subtitle}</div>}
                        </td>
                        <td>{row.placements.join(", ")}</td>
                        <td>
                          {row.link_type === "none"
                            ? "No link"
                            : `${row.link_type}${row.link_target ? `: ${row.link_target}` : ""}`}
                        </td>
                        <td>{row.priority}</td>
                        <td>{row.active ? "active" : "disabled"}</td>
                        <td>
                          <div className="actions">
                            <button
                              className="action"
                              type="button"
                              onClick={() => {
                                void adminApi.updateAdPlacement(row.id, { active: !row.active }).then(refreshAdsData);
                              }}
                            >
                              {row.active ? "Disable" : "Enable"}
                            </button>
                            <button
                              className="action"
                              type="button"
                              onClick={() => {
                                const previous = adPlacements[index - 1];
                                if (!previous) return;
                                const nextIds = [...adPlacements.map((entry) => entry.id)];
                                nextIds[index - 1] = row.id;
                                nextIds[index] = previous.id;
                                void adminApi.reorderAdPlacements(nextIds).then(refreshAdsData);
                              }}
                            >
                              <ArrowUp size={13} />
                            </button>
                            <button
                              className="action"
                              type="button"
                              onClick={() => {
                                const next = adPlacements[index + 1];
                                if (!next) return;
                                const nextIds = [...adPlacements.map((entry) => entry.id)];
                                nextIds[index + 1] = row.id;
                                nextIds[index] = next.id;
                                void adminApi.reorderAdPlacements(nextIds).then(refreshAdsData);
                              }}
                            >
                              <ArrowDown size={13} />
                            </button>
                            <button
                              className="action"
                              type="button"
                              onClick={() => {
                                void adminApi.deleteAdPlacement(row.id).then(refreshAdsData);
                              }}
                            >
                              <Trash2 size={13} />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                    {!busy && adPlacements.length === 0 && (
                      <tr>
                        <td colSpan={6} style={{ color: "var(--muted)" }}>
                          No ad banners yet.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </section>

            <section className="panel">
              <div className="panel-head">
                <div>
                  <h3>Sponsorship Management</h3>
                  <p style={{ color: "var(--muted)", marginTop: 0 }}>
                    Promote stores and products with priority-based ranking boosts.
                  </p>
                </div>
              </div>
              <div className="toolbar" style={{ flexWrap: "wrap", alignItems: "flex-end" }}>
                <label className="date-field">
                  <span>Target Type</span>
                  <select value={newSponsorshipType} onChange={(e) => setNewSponsorshipType(e.target.value as any)}>
                    <option value="store">Store</option>
                    <option value="product">Product</option>
                  </select>
                </label>
                <label className="date-field" style={{ minWidth: 260 }}>
                  <span>Search target</span>
                  <input
                    value={sponsorshipTargetSearch}
                    onChange={(e) => setSponsorshipTargetSearch(e.target.value)}
                    placeholder={newSponsorshipType === "store" ? "Search store..." : "Search product..."}
                  />
                </label>
                <label className="date-field" style={{ minWidth: 280 }}>
                  <span>{newSponsorshipType === "store" ? "Store" : "Product"}</span>
                  <select
                    value={newSponsorshipTargetId}
                    onChange={(e) => setNewSponsorshipTargetId(e.target.value)}
                  >
                    <option value="">Select target...</option>
                    {sponsorshipTargets.map((entry) => (
                      <option key={entry.id} value={entry.id}>
                        {entry.label}
                      </option>
                    ))}
                  </select>
                </label>
                <label className="date-field" style={{ width: 120 }}>
                  <span>Priority</span>
                  <input
                    type="number"
                    value={newSponsorshipPriority}
                    onChange={(e) => setNewSponsorshipPriority(Number(e.target.value) || 0)}
                  />
                </label>
                <label className="date-field" style={{ minWidth: 180 }}>
                  <span>Label</span>
                  <input value={newSponsorshipLabel} onChange={(e) => setNewSponsorshipLabel(e.target.value)} />
                </label>
                <button className="action" type="button" onClick={createSponsorship}>
                  Add sponsorship
                </button>
              </div>
              <div className="table-wrap" style={{ marginTop: 12 }}>
                <table>
                  <thead>
                    <tr>
                      <th>Target</th>
                      <th>Priority</th>
                      <th>Label</th>
                      <th>Status</th>
                      <th />
                    </tr>
                  </thead>
                  <tbody>
                    {sponsorshipRows.map((row) => (
                      <tr key={row.id}>
                        <td>
                          {row.target_type}: {row.target_id}
                        </td>
                        <td>{row.priority}</td>
                        <td>{row.label}</td>
                        <td>{row.active ? "active" : "disabled"}</td>
                        <td>
                          <div className="actions">
                            <button
                              className="action"
                              type="button"
                              onClick={() => {
                                void adminApi
                                  .updateSponsorship(row.id, { active: !row.active })
                                  .then(refreshAdsData);
                              }}
                            >
                              {row.active ? "Disable" : "Enable"}
                            </button>
                            <button
                              className="action"
                              type="button"
                              onClick={() => {
                                void adminApi.deleteSponsorship(row.id).then(refreshAdsData);
                              }}
                            >
                              <Trash2 size={13} />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                    {!busy && sponsorshipRows.length === 0 && (
                      <tr>
                        <td colSpan={5} style={{ color: "var(--muted)" }}>
                          No sponsorships yet.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </section>
          </>
        )}

        {tab === "accounts" && (
          <>
            <section className="panel">
              <div className="panel-head">
                <div>
                  <h3>Accounts & Signups</h3>
                  <p style={{ color: "var(--muted)", marginTop: 0 }}>
                    Review discovery, merchant, and admin accounts with moderation controls.
                  </p>
                </div>
                <div className="toolbar">
                  <select
                    value={accountPlatformFilter}
                    onChange={(event) => setAccountPlatformFilter(event.target.value as any)}
                  >
                    <option value="all">All platforms</option>
                    <option value="merchant">Merchant</option>
                    <option value="discovery">Discovery</option>
                    <option value="admin">Admin</option>
                  </select>
                  <select
                    value={accountStatusFilter}
                    onChange={(event) => setAccountStatusFilter(event.target.value as any)}
                  >
                    <option value="all">All statuses</option>
                    <option value="active">Active</option>
                    <option value="disabled">Disabled</option>
                    <option value="deleted">Deleted</option>
                  </select>
                  <label className="search-wrap" style={{ minWidth: 240 }}>
                    <Search size={16} />
                    <input
                      placeholder="Search account..."
                      value={accountQuery}
                      onChange={(event) => setAccountQuery(event.target.value)}
                    />
                  </label>
                </div>
              </div>

              <div className="table-wrap">
                <table>
                  <thead>
                    <tr>
                      <th>Platform</th>
                      <th>Email</th>
                      <th>Phone</th>
                      <th>Status</th>
                      <th>Created</th>
                      <th />
                    </tr>
                  </thead>
                  <tbody>
                    {accountsRows.map((row) => (
                      <tr key={row.id}>
                        <td>{row.platform}</td>
                        <td>{row.email || "-"}</td>
                        <td>{row.phone_e164 || "-"}</td>
                        <td>{row.status}</td>
                        <td>{new Date(row.created_at).toLocaleString()}</td>
                        <td>
                          <div className="actions">
                            <button className="action" onClick={() => updateAccountStatus(row.id, "active")}>
                              Activate
                            </button>
                            <button className="action" onClick={() => updateAccountStatus(row.id, "disabled")}>
                              Disable
                            </button>
                            <button className="action" onClick={() => updateAccountStatus(row.id, "deleted")}>
                              Delete
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                    {!busy && accountsRows.length === 0 && (
                      <tr>
                        <td colSpan={6} style={{ color: "var(--muted)" }}>
                          No accounts match current filters.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </section>

            <section className="panel">
              <h3>Recent signups</h3>
              <div className="table-wrap">
                <table>
                  <thead>
                    <tr>
                      <th>Platform</th>
                      <th>Email</th>
                      <th>Phone</th>
                      <th>Status</th>
                      <th>Created</th>
                    </tr>
                  </thead>
                  <tbody>
                    {signupsRows.map((row) => (
                      <tr key={`signup-${row.id}`}>
                        <td>{row.platform}</td>
                        <td>{row.email || "-"}</td>
                        <td>{row.phone_e164 || "-"}</td>
                        <td>{row.status}</td>
                        <td>{new Date(row.created_at).toLocaleString()}</td>
                      </tr>
                    ))}
                    {!busy && signupsRows.length === 0 && (
                      <tr>
                        <td colSpan={5} style={{ color: "var(--muted)" }}>
                          No signups for this range/filter.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </section>
          </>
        )}

        {tab === "merchant-health" && (
          <>
          <section className="panel">
            <h3>Merchant health</h3>
            <table>
              <thead>
                <tr>
                  <th>Store</th>
                  <th>Verification</th>
                  <th>Updates</th>
                  <th>Stale updates</th>
                  <th>Last inventory update</th>
                </tr>
              </thead>
              <tbody>
                {merchantHealth.map((row) => (
                  <tr key={row.store_id}>
                    <td>{row.store_name}</td>
                    <td>{row.verification}</td>
                    <td>{row.updates}</td>
                    <td>{row.stale_updates}</td>
                    <td>{new Date(row.last_inventory_update).toLocaleString()}</td>
                  </tr>
                ))}
                {!busy && merchantHealth.length === 0 && (
                  <tr>
                    <td colSpan={5} style={{ color: "var(--muted)" }}>
                      No merchant health data yet.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </section>
          </>
        )}

        {tab === "moderation" && (
          <>
          <section className="panel">
            <h3>Moderation overview</h3>
            <div className="kpi-grid kpi-grid--compact">
              <article className="kpi">
                <small>Verification queue</small>
                <h3>{moderation?.verification_queue ?? "..."}</h3>
              </article>
              <article className="kpi">
                <small>Open abuse reports</small>
                <h3>{moderation?.abuse_reports_open ?? "..."}</h3>
              </article>
              <article className="kpi">
                <small>Suspicious listings</small>
                <h3>{moderation?.suspicious_listings ?? "..."}</h3>
              </article>
            </div>
          </section>

          <section className="panel">
            <div className="panel-head">
              <div>
                <h3>Flagged stores and reports</h3>
                <p style={{ color: "var(--muted)", marginTop: 0 }}>
                  Review reports coming from Discovery. Resolve or reopen as needed.
                </p>
              </div>
              <div className="toolbar">
                <select value={abuseStatus} onChange={(e) => setAbuseStatus(e.target.value as any)}>
                  <option value="open">Open</option>
                  <option value="resolved">Resolved</option>
                  <option value="all">All</option>
                </select>
              </div>
            </div>

            <div className="table-wrap">
              <table>
                <thead>
                  <tr>
                    <th>Store</th>
                    <th>Reason</th>
                    <th>Created</th>
                    <th>Status</th>
                    <th />
                  </tr>
                </thead>
                <tbody>
                  {abuseReports.map((row) => (
                    <tr key={row.id}>
                      <td>{row.store_name}</td>
                      <td>
                        <div style={{ fontWeight: 600 }}>{row.reason}</div>
                        {row.details && <div style={{ color: "var(--muted)", fontSize: 12 }}>{row.details}</div>}
                      </td>
                      <td>{new Date(row.created_at).toLocaleString()}</td>
                      <td>{row.status}</td>
                      <td>
                        <button
                          className="action"
                          onClick={() => {
                            const next = row.status === "open" ? "resolved" : "open";
                            void adminApi
                              .updateAbuseReport(row.id, next)
                              .then(() => {
                                setAbuseReports((current) =>
                                  current.map((entry) =>
                                    entry.id === row.id ? { ...entry, status: next } : entry
                                  )
                                );
                              })
                              .catch(() => undefined);
                          }}
                        >
                          {row.status === "open" ? "Resolve" : "Reopen"}
                        </button>
                      </td>
                    </tr>
                  ))}
                  {!busy && abuseReports.length === 0 && (
                    <tr>
                      <td colSpan={5} style={{ color: "var(--muted)" }}>
                        No reports yet. Use "Report this store" from a Store page in Discovery.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </section>
          </>
        )}
        <ImageCropModal
          open={Boolean(pendingAdFile)}
          file={pendingAdFile}
          title="Adjust advertisement banner"
          aspectRatio={1440 / 560}
          outputWidth={1440}
          outputHeight={560}
          onCancel={closeAdCrop}
          onApply={applyAdCrop}
        />
      </main>
    </div>
  );
}
