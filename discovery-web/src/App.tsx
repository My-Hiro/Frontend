import React, { useState, useCallback, useEffect, useRef } from "react";
import { TopBar } from "./components/TopBar";
import { BottomNav } from "./components/BottomNav";
import { SideNav } from "./components/SideNav";
import { HomePage } from "./components/HomePage";
import { SearchPage } from "./components/SearchPage";
import { StorePage } from "./components/StorePage";
import { ProductDetailPage } from "./components/ProductDetailPage";
import { CategoriesPage } from "./components/CategoriesPage";
import { CategoryDetailPage } from "./components/CategoryDetailPage";
import { SavedPage } from "./components/SavedPage";
import { ProfilePage } from "./components/ProfilePage";
import { AuthGate } from "./components/auth/AuthGate";
import { LocationAccessPrompt } from "./components/LocationAccessPrompt";
import { EmptyState } from "./components/EmptyState";
import { PopularProductsPage } from "./components/PopularProductsPage";
import { loadGoogleMapsJs } from "./lib/googleMaps";
import { discoveryAuthApi, type DiscoveryAuthSession } from "./state/api";
import type { HeroBannerModel } from "./state/types";
import type { TabId } from "./components/BottomNav";

type Screen =
  | { type: "home" }
  | { type: "search"; query?: string }
  | { type: "store"; storeId: string; entryCategoryId?: string }
  | { type: "product"; productId: string }
  | { type: "categories" }
  | { type: "category-detail"; categoryId: string }
  | { type: "popular-products" }
  | { type: "saved" }
  | { type: "profile" }
  | { type: "offline" };

type ThemeMode = "light" | "dark";
const THEME_KEY = "myhiro_theme_discovery";

export default function App() {
  const [authSession, setAuthSession] = useState<DiscoveryAuthSession | null>(() =>
    discoveryAuthApi.getSession()
  );
  const [theme, setTheme] = useState<ThemeMode>(() => {
    if (typeof window === "undefined") return "light";
    const stored = localStorage.getItem(THEME_KEY);
    if (stored === "light" || stored === "dark") return stored;
    return window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
  });
  const [screenStack, setScreenStack] = useState<Screen[]>([{ type: "home" }]);
  const [activeTab, setActiveTab] = useState<TabId>("home");
  const [isOnline, setIsOnline] = useState(true);
  const [locationLabel, setLocationLabel] = useState(() => {
    if (typeof window === "undefined") return "Accra, Ghana";
    return localStorage.getItem("discovery_location_label") ?? "Accra, Ghana";
  });
  const [locationPromptOpen, setLocationPromptOpen] = useState(false);
  const [locationPromptDelayNonce, setLocationPromptDelayNonce] = useState(0);
  const [manualLocation, setManualLocation] = useState(locationLabel);
  const [showManualLocation, setShowManualLocation] = useState(false);
  const [locating, setLocating] = useState(false);
  const [locationError, setLocationError] = useState<string | null>(null);
  const [authPromptOpen, setAuthPromptOpen] = useState(false);
  const [mapsReady, setMapsReady] = useState(false);
  const [mapsError, setMapsError] = useState<string | null>(null);
  const [manualCoords, setManualCoords] = useState<{ lat: number; lng: number } | null>(null);
  const manualLocationInputRef = useRef<HTMLInputElement | null>(null);
  const manualMapContainerRef = useRef<HTMLDivElement | null>(null);
  const mapsRef = useRef<any>(null);
  const mapRef = useRef<any>(null);
  const markerRef = useRef<any>(null);
  const geocoderRef = useRef<any>(null);
  const autocompleteRef = useRef<any>(null);

  useEffect(() => {
    if (typeof window === "undefined") return;
    // Keep the flow non-blocking across devices: open location prompt only by explicit user action.
    // This avoids dark overlay interruptions while browsing categories or products.
  }, [locationPromptDelayNonce]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const params = new URLSearchParams(window.location.search);
    if (params.get("resetAuth") === "1") {
      void discoveryAuthApi.clearSession();
      setAuthSession(null);
      localStorage.removeItem("discovery_auth_prompted");
    }
    const resetFlag =
      params.get("resetOnboarding") ===
      "1";
    if (resetFlag) {
      localStorage.removeItem("discovery_location_set");
      localStorage.removeItem("discovery_location_label");
      localStorage.removeItem("discovery_location_lat");
      localStorage.removeItem("discovery_location_lng");
      localStorage.removeItem("discovery_auth_prompted");
      setLocationLabel("Accra, Ghana");
      setManualLocation("Accra, Ghana");
      setLocationPromptOpen(false);
      setLocationPromptDelayNonce((current) => current + 1);
      setShowManualLocation(false);
      setAuthPromptOpen(false);
      setLocationError(null);
    }
    if (params.get("resetAuth") === "1" || resetFlag) {
      params.delete("resetAuth");
      params.delete("resetOnboarding");
      const next = params.toString();
      window.history.replaceState(null, "", next ? `/?${next}` : "/");
    }
  }, []);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const root = document.documentElement;
    root.classList.toggle("dark", theme === "dark");
    root.style.colorScheme = theme;
    localStorage.setItem(THEME_KEY, theme);
  }, [theme]);

  const toggleTheme = () => {
    setTheme((current) => (current === "dark" ? "light" : "dark"));
  };

  const currentScreen = screenStack[screenStack.length - 1];

  const pushScreen = useCallback((screen: Screen) => {
    setScreenStack((prev) => [...prev, screen]);
  }, []);

  const popScreen = useCallback(() => {
    setScreenStack((prev) => {
      if (prev.length <= 1) return prev;
      return prev.slice(0, -1);
    });
  }, []);

  const resetToTab = useCallback((tab: TabId) => {
    setActiveTab(tab);
    switch (tab) {
      case "home":
        setScreenStack([{ type: "home" }]);
        break;
      case "search":
        setScreenStack([{ type: "search" }]);
        break;
      case "categories":
        setScreenStack([{ type: "categories" }]);
        break;
      case "saved":
        setScreenStack([{ type: "saved" }]);
        break;
      case "profile":
        setScreenStack([{ type: "profile" }]);
        break;
    }
  }, []);

  const handleStorePress = useCallback(
    (storeId: string, entryCategoryId?: string) => {
      pushScreen({ type: "store", storeId, entryCategoryId });
    },
    [pushScreen]
  );

  const handleProductPress = useCallback(
    (productId: string) => {
      pushScreen({ type: "product", productId });
    },
    [pushScreen]
  );

  const handleSearchFocus = useCallback(() => {
    setActiveTab("search");
    setScreenStack([{ type: "search" }]);
  }, []);

  const handleCategoryPress = useCallback(
    (categoryId: string) => {
      pushScreen({ type: "category-detail", categoryId });
    },
    [pushScreen]
  );

  const handleBannerPress = useCallback(
    (banner: HeroBannerModel) => {
      const openExternal = (url: string) => {
        window.open(url, "_blank", "noopener,noreferrer");
      };

      const tryResolveFromUrl = (url: string): boolean => {
        try {
          const parsed = new URL(url, window.location.origin);
          if (parsed.origin !== window.location.origin) {
            return false;
          }
          const store = parsed.searchParams.get("store");
          if (store) {
            handleStorePress(store);
            return true;
          }
          const product = parsed.searchParams.get("product");
          if (product) {
            handleProductPress(product);
            return true;
          }
          const page = parsed.searchParams.get("page");
          if (page) {
            const normalized = page.trim().toLowerCase();
            if (normalized === "home") {
              resetToTab("home");
              return true;
            }
            if (normalized === "search") {
              resetToTab("search");
              return true;
            }
            if (normalized === "categories") {
              resetToTab("categories");
              return true;
            }
            if (normalized === "saved") {
              resetToTab("saved");
              return true;
            }
            if (normalized === "profile") {
              resetToTab("profile");
              return true;
            }
            return false;
          }
          return false;
        } catch {
          return false;
        }
      };

      const linkType = banner.linkType ?? (banner.link ? "custom_url" : "none");
      const target = (banner.linkTarget ?? "").trim().replace(/^\//, "");

      if (linkType === "none") {
        return;
      }

      if (linkType === "discovery_store") {
        const storeId = target;
        if (storeId) {
          handleStorePress(storeId);
          return;
        }
      }

      if (linkType === "discovery_product") {
        const productId = target;
        if (productId) {
          handleProductPress(productId);
          return;
        }
      }

      if (linkType === "discovery_page") {
        const normalized = target.toLowerCase();
        if (normalized === "home") {
          resetToTab("home");
          return;
        }
        if (normalized === "search") {
          resetToTab("search");
          return;
        }
        if (normalized === "categories") {
          resetToTab("categories");
          return;
        }
        if (normalized === "saved") {
          resetToTab("saved");
          return;
        }
        if (normalized === "profile") {
          resetToTab("profile");
          return;
        }
        if (normalized === "popular-products") {
          pushScreen({ type: "popular-products" });
          return;
        }
        if (normalized.startsWith("category/") || normalized.startsWith("category-detail/")) {
          const categoryId = normalized.split("/")[1] ?? "";
          if (categoryId) {
            pushScreen({ type: "category-detail", categoryId });
            return;
          }
        }
        if (normalized.startsWith("store/")) {
          const storeId = normalized.split("/")[1] ?? "";
          if (storeId) {
            handleStorePress(storeId);
            return;
          }
        }
        if (normalized.startsWith("product/")) {
          const productId = normalized.split("/")[1] ?? "";
          if (productId) {
            handleProductPress(productId);
            return;
          }
        }
      }

      if (banner.link && tryResolveFromUrl(banner.link)) {
        return;
      }

      if (banner.link) {
        openExternal(banner.link);
      }
    },
    [handleStorePress, handleProductPress, pushScreen, resetToTab]
  );

  const openLocationPrompt = useCallback(() => {
    setManualLocation(locationLabel);
    if (typeof window !== "undefined") {
      const lat = Number(localStorage.getItem("discovery_location_lat"));
      const lng = Number(localStorage.getItem("discovery_location_lng"));
      if (Number.isFinite(lat) && Number.isFinite(lng)) {
        setManualCoords({ lat, lng });
      } else {
        setManualCoords(null);
      }
    }
    setShowManualLocation(false);
    setLocationError(null);
    setMapsReady(false);
    setMapsError(null);
    mapRef.current = null;
    markerRef.current = null;
    autocompleteRef.current = null;
    setLocationPromptOpen(true);
  }, [locationLabel]);

  const finalizeLocation = useCallback(
    (label: string, coords?: { lat: number; lng: number }) => {
      setLocationLabel(label);
      if (typeof window !== "undefined") {
        localStorage.setItem("discovery_location_label", label);
        localStorage.setItem("discovery_location_set", "1");
        if (coords) {
          localStorage.setItem("discovery_location_lat", String(coords.lat));
          localStorage.setItem("discovery_location_lng", String(coords.lng));
        }
      }
      setLocationPromptOpen(false);
      setShowManualLocation(false);
      setLocating(false);
      setLocationError(null);
    },
    []
  );

  const syncManualMapPosition = useCallback(
    (coords: { lat: number; lng: number }, explicitLabel?: string, reverseGeocode = false) => {
      setManualCoords(coords);
      if (explicitLabel) {
        setManualLocation(explicitLabel);
      }

      if (mapRef.current) {
        mapRef.current.panTo(coords);
      }
      if (markerRef.current) {
        markerRef.current.setPosition(coords);
      }

      if (!reverseGeocode || !geocoderRef.current) {
        return;
      }
      geocoderRef.current.geocode({ location: coords }, (results: any, status: string) => {
        if (status !== "OK" || !Array.isArray(results) || !results[0]?.formatted_address) {
          return;
        }
        setManualLocation(String(results[0].formatted_address));
      });
    },
    []
  );

  useEffect(() => {
    if (!locationPromptOpen || !showManualLocation) {
      return;
    }
    let cancelled = false;

    const initMaps = async () => {
      try {
        const maps = await loadGoogleMapsJs();
        if (cancelled) return;
        mapsRef.current = maps;
        setMapsReady(true);
        setMapsError(null);

        const initial = manualCoords ?? { lat: 5.6037, lng: -0.187 };

        if (manualMapContainerRef.current && !mapRef.current) {
          mapRef.current = new maps.Map(manualMapContainerRef.current, {
            center: initial,
            zoom: 13,
            mapTypeControl: false,
            streetViewControl: false,
            fullscreenControl: false,
            clickableIcons: false
          });
          markerRef.current = new maps.Marker({
            map: mapRef.current,
            position: initial
          });
          mapRef.current.addListener("click", (event: any) => {
            const lat = event?.latLng?.lat?.();
            const lng = event?.latLng?.lng?.();
            if (!Number.isFinite(lat) || !Number.isFinite(lng)) {
              return;
            }
            syncManualMapPosition({ lat, lng }, undefined, true);
          });
        }

        if (manualLocationInputRef.current && !autocompleteRef.current) {
          autocompleteRef.current = new maps.places.Autocomplete(manualLocationInputRef.current, {
            fields: ["formatted_address", "geometry", "name"]
          });
          autocompleteRef.current.addListener("place_changed", () => {
            const place = autocompleteRef.current?.getPlace?.();
            const lat = place?.geometry?.location?.lat?.();
            const lng = place?.geometry?.location?.lng?.();
            if (!Number.isFinite(lat) || !Number.isFinite(lng)) {
              return;
            }
            const label = String(place.formatted_address || place.name || manualLocation).trim();
            syncManualMapPosition({ lat, lng }, label || undefined);
          });
        }

        if (!geocoderRef.current) {
          geocoderRef.current = new maps.Geocoder();
        }
      } catch (error) {
        if (cancelled) return;
        setMapsReady(false);
        setMapsError(
          error instanceof Error
            ? error.message
            : "Could not load Google Maps. You can still set the location manually."
        );
      }
    };

    void initMaps();

    return () => {
      cancelled = true;
    };
  }, [locationPromptOpen, showManualLocation, syncManualMapPosition]);

  const handleUseMyLocation = useCallback(() => {
    if (!navigator.geolocation) {
      setLocationError("Location access is not supported on this device.");
      return;
    }
    setLocating(true);
    setLocationError(null);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        finalizeLocation("Current location", {
          lat: pos.coords.latitude,
          lng: pos.coords.longitude,
        });
      },
      () => {
        setLocating(false);
        setLocationError("We could not access your location. Try manual set.");
      },
      { enableHighAccuracy: true, timeout: 8000 }
    );
  }, [finalizeLocation]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    // Keep auth prompt user-driven (profile/explicit request) instead of automatic blocking overlay.
  }, [locationPromptOpen, authSession]);

  const closeAuthPrompt = useCallback(() => {
    setAuthPromptOpen(false);
    if (typeof window !== "undefined") {
      localStorage.setItem("discovery_auth_prompted", "1");
      if (window.location.pathname.startsWith("/auth/")) {
        window.history.replaceState(null, "", "/");
      }
    }
  }, []);

  const handleSignOut = useCallback(async () => {
    if (typeof window !== "undefined") {
      const confirmed = window.confirm("Are you sure you want to sign out?");
      if (!confirmed) {
        return;
      }
    }
    try {
      await discoveryAuthApi.clearSession();
    } finally {
      setAuthSession(null);
      setAuthPromptOpen(false);
      if (typeof window !== "undefined") {
        localStorage.removeItem("discovery_auth_prompted");
      }
    }
  }, []);

  const skipLocationSetup = useCallback(() => {
    if (typeof window !== "undefined") {
      localStorage.setItem("discovery_location_set", "1");
      if (!localStorage.getItem("discovery_location_label")) {
        localStorage.setItem("discovery_location_label", locationLabel);
      }
    }
    setLocationPromptOpen(false);
    setShowManualLocation(false);
    setLocating(false);
    setLocationError(null);
  }, [locationLabel]);

  // Determine if we need top bar and bottom nav
  const showTopBar = currentScreen.type === "home";
  const showBottomNav = currentScreen.type !== "product";

  return (
    <div className="min-h-screen bg-background flex overflow-x-hidden">
      {/* Desktop Sidebar Navigation */}
      <SideNav activeTab={activeTab} onTabChange={resetToTab} />

      {/* Main Content Area */}
      <div className="flex-1 min-w-0 relative overflow-x-hidden">
        {/* Simulated offline toggle for demo */}
        <div className="fixed top-0 right-0 z-[420] p-1 flex flex-col gap-1 items-end">
          <button
            onClick={toggleTheme}
            className="text-[9px] px-1.5 py-0.5 rounded bg-muted text-muted-foreground opacity-70 hover:opacity-100 transition-opacity"
            title={theme === "dark" ? "Switch to light view" : "Switch to night view"}
          >
            {theme === "dark" ? "Light view" : "Night view"}
          </button>
          <button
            onClick={() => setIsOnline(!isOnline)}
            className="text-[9px] px-1.5 py-0.5 rounded bg-muted text-muted-foreground opacity-40 hover:opacity-100 transition-opacity"
            title="Toggle online/offline (demo)"
          >
            {isOnline ? "Online" : "Offline"}
          </button>
        </div>

        {/* Top Bar */}
        {showTopBar && (
          <TopBar
            location={locationLabel}
            onSearchFocus={handleSearchFocus}
            onLocationClick={openLocationPrompt}
          />
        )}

        {/* Offline State */}
        {!isOnline && currentScreen.type === "home" ? (
          <div className="pt-4">
            <EmptyState type="offline" onRetry={() => setIsOnline(true)} />
          </div>
        ) : (
          <>
            {/* Main Content Area */}
            <main
              className={`${showBottomNav ? "pb-16 lg:pb-0" : ""}`}
              role="main"
            >
              {currentScreen.type === "home" && (
                <HomePage
                  onStorePress={handleStorePress}
                  onProductPress={handleProductPress}
                  onSearchFocus={handleSearchFocus}
                  onCategoryPress={handleCategoryPress}
                  onPopularProductsViewAll={() => pushScreen({ type: "popular-products" })}
                  onBannerPress={handleBannerPress}
                />
              )}

              {currentScreen.type === "search" && (
                <SearchPage
                  onStorePress={handleStorePress}
                  onProductPress={handleProductPress}
                  initialQuery={currentScreen.query}
                />
              )}

              {currentScreen.type === "store" && (
                <StorePage
                  storeId={currentScreen.storeId}
                  entryCategoryId={currentScreen.entryCategoryId}
                  onBack={popScreen}
                  onProductPress={handleProductPress}
                  onBannerPress={handleBannerPress}
                />
              )}

              {currentScreen.type === "product" && (
                <ProductDetailPage
                  productId={currentScreen.productId}
                  onBack={popScreen}
                  onStorePress={handleStorePress}
                  onBannerPress={handleBannerPress}
                />
              )}

              {currentScreen.type === "categories" && (
                <CategoriesPage onCategoryPress={handleCategoryPress} />
              )}

              {currentScreen.type === "category-detail" && (
                <CategoryDetailPage
                  categoryId={currentScreen.categoryId}
                  onBack={popScreen}
                  onStorePress={handleStorePress}
                />
              )}

              {currentScreen.type === "popular-products" && (
                <PopularProductsPage onBack={popScreen} onProductPress={handleProductPress} />
              )}

              {currentScreen.type === "saved" && (
                <SavedPage
                  onStorePress={handleStorePress}
                  onProductPress={handleProductPress}
                />
              )}

              {currentScreen.type === "profile" && (
                <ProfilePage
                  onRequestSignIn={() => setAuthPromptOpen(true)}
                  onSignOut={() => {
                    void handleSignOut();
                  }}
                />
              )}
            </main>
          </>
        )}

        {/* Bottom Navigation - mobile/tablet only */}
        {showBottomNav && (
          <BottomNav activeTab={activeTab} onTabChange={resetToTab} />
        )}

        {locationPromptOpen && (
          <LocationAccessPrompt
            showManualLocation={showManualLocation}
            locating={locating}
            manualLocation={manualLocation}
            mapsReady={mapsReady}
            mapsError={mapsError}
            locationError={locationError}
            manualLocationInputRef={manualLocationInputRef}
            manualMapContainerRef={manualMapContainerRef}
            onManualLocationChange={setManualLocation}
            onUseMyLocation={handleUseMyLocation}
            onShowManualLocation={() => setShowManualLocation(true)}
            onBackToPrompt={() => setShowManualLocation(false)}
            onUseSelectedLocation={() =>
              finalizeLocation(
                manualLocation.trim() || "Selected location",
                manualCoords ?? undefined
              )
            }
            onSkip={skipLocationSetup}
          />
        )}

        {authPromptOpen && (
          <AuthGate
            onLater={closeAuthPrompt}
            onAuthenticated={(session) => {
              setAuthSession(session);
              closeAuthPrompt();
            }}
          />
        )}
      </div>
    </div>
  );
}
