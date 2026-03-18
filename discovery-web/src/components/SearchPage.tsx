import React, { useEffect, useMemo, useState } from "react";
import { StoreCard } from "./StoreCard";
import { StockBadge } from "./StockBadge";
import { SponsoredBadge } from "./SponsoredBadge";
import { VerificationBadge } from "./VerificationBadge";
import { EmptyState } from "./EmptyState";
import { ImageWithFallback } from "./figma/ImageWithFallback";
import { Search, TrendingUp } from "lucide-react";
import { discoveryApi } from "../state/api";
import type { AvailabilityStatus, StoreCardModel, VerificationStatus } from "../state/types";

interface SearchPageProps {
  onStorePress: (storeId: string, entryCategoryId?: string) => void;
  onProductPress: (productId: string) => void;
  initialQuery?: string;
}

type ItemRow = {
  product_id: string;
  productName: string;
  image_url: string;
  category: string;
  stores: Array<Record<string, unknown>>;
};

const toStockStatus = (raw: unknown, price?: unknown): AvailabilityStatus => {
  const priceText = String(price ?? "").toLowerCase();
  if (priceText.includes("price on request")) return "price-on-request";
  const value = String(raw ?? "").toLowerCase();
  if (value.includes("in")) return "in-stock";
  if (value.includes("low")) return "low-stock";
  if (value.includes("out")) return "out-of-stock";
  return "in-stock";
};

const toVerificationStatus = (raw: unknown): VerificationStatus => {
  const value = String(raw ?? "").toLowerCase();
  if (value.includes("unverified")) return "unverified";
  if (value.includes("partner")) return "partner";
  if (value.includes("verified")) return "verified";
  return "unverified";
};

export function SearchPage({ onStorePress, onProductPress, initialQuery = "" }: SearchPageProps) {
  const [query, setQuery] = useState(initialQuery);
  const [activeTab, setActiveTab] = useState<"all" | "items" | "stores">("all");
  const [loading, setLoading] = useState(false);
  const [recentStores, setRecentStores] = useState<StoreCardModel[]>([]);
  const [itemRows, setItemRows] = useState<ItemRow[]>([]);
  const [storeRows, setStoreRows] = useState<Array<Record<string, unknown>>>([]);

  useEffect(() => {
    discoveryApi
      .getHome()
      .then((home) => setRecentStores(home.suggested.slice(0, 3)))
      .catch(() => undefined);
  }, []);

  useEffect(() => {
    const q = query.trim();
    if (!q) {
      setItemRows([]);
      setStoreRows([]);
      return;
    }

    const handle = window.setTimeout(() => {
      setLoading(true);
      Promise.all([
        discoveryApi.search({ q, type: "item", page: 1 }),
        discoveryApi.search({ q, type: "store", page: 1 })
      ])
        .then(([items, stores]) => {
          const itemResultRows = Array.isArray((items as any).rows) ? ((items as any).rows as ItemRow[]) : [];
          const storeResultRows = Array.isArray((stores as any).rows)
            ? ((stores as any).rows as Array<Record<string, unknown>>)
            : [];
          setItemRows(itemResultRows);
          setStoreRows(storeResultRows);
        })
        .catch(() => {
          setItemRows([]);
          setStoreRows([]);
        })
        .finally(() => setLoading(false));
    }, 220);

    return () => window.clearTimeout(handle);
  }, [query]);

  const hasResults = query.length > 0 && (itemRows.length > 0 || storeRows.length > 0);
  const noResults = query.length > 0 && itemRows.length === 0 && storeRows.length === 0;

  const popularSearches = [
    "Paracetamol",
    "Phone charger",
    "Rice",
    "Cooking oil",
    "Samsung phone",
    "Brake pads"
  ];

  const storeModels = useMemo(() => {
    return storeRows.map((store) => {
      const verification = toVerificationStatus(
        store.verification_status ?? store.verification ?? store.status
      );
      return {
        id: String(store.id ?? ""),
        name: String(store.name ?? "Store"),
        logo: "https://images.unsplash.com/photo-1542838132-92c53300491e?w=200&q=70",
        rating: Number(store.rating ?? 0),
        verification,
        distance: String(store.distance ?? ""),
        eta: "",
        openNow: true,
        isSponsored: false,
        lastUpdated: "recently",
        description: "Store near you",
        phone: "",
        address: "",
        hours: ""
      } satisfies StoreCardModel;
    });
  }, [storeRows]);

  return (
    <div className="pb-20 lg:pb-8 max-w-7xl mx-auto">
      <div className="px-4 lg:px-6 py-3 bg-card border-b border-border sticky top-0 z-30">
        <form onSubmit={(e) => e.preventDefault()} className="relative max-w-2xl">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <input
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search items, brands, or stores (e.g. paracetamol, phone charger)"
            className="w-full pl-9 pr-4 py-2.5 bg-input-background rounded-xl text-sm placeholder:text-muted-foreground/60 focus:outline-none focus:ring-2 focus:ring-primary/30 min-h-[44px]"
            autoFocus
            aria-label="Search"
          />
        </form>

        {query.length > 0 && (
          <div className="flex gap-2 mt-3">
            {(["all", "items", "stores"] as const).map((tab) => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`px-3 py-1.5 rounded-full text-xs min-h-[32px] transition-colors ${
                  activeTab === tab
                    ? "bg-primary text-primary-foreground"
                    : "bg-muted text-muted-foreground"
                }`}
              >
                {tab === "all" ? "All" : tab === "items" ? "Items" : "Stores"}
                {tab === "items" && <span className="ml-1">({itemRows.length})</span>}
                {tab === "stores" && <span className="ml-1">({storeModels.length})</span>}
              </button>
            ))}
          </div>
        )}
      </div>

      {loading && query.length > 0 && (
        <div className="flex justify-center py-6">
          <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin" />
        </div>
      )}

      {query.length === 0 && (
        <div className="px-4 lg:px-6 pt-6">
          <div className="flex items-center gap-2 mb-4">
            <TrendingUp className="w-4 h-4 text-primary" />
            <h3 className="text-sm text-foreground">Popular searches</h3>
          </div>
          <div className="flex flex-wrap gap-2">
            {popularSearches.map((term) => (
              <button
                key={term}
                onClick={() => setQuery(term.toLowerCase())}
                className="px-3 py-2 bg-card border border-border rounded-full text-sm min-h-[40px] transition-colors hover:bg-secondary"
              >
                {term}
              </button>
            ))}
          </div>

          <div className="mt-8">
            <h3 className="text-sm text-foreground mb-3">Recently viewed</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-2">
              {recentStores.map((store) => (
                <StoreCard
                  key={store.id}
                  store={store}
                  onPress={(storeId) => onStorePress(storeId)}
                  variant="compact"
                />
              ))}
            </div>
          </div>
        </div>
      )}

      {noResults && (
        <EmptyState
          type="no-results"
          query={query}
          onRequestItem={() =>
            alert("Item request saved! We'll notify you when it becomes available nearby.")
          }
          onSaveQuery={() => alert("Search saved! We'll alert you when results appear.")}
        />
      )}

      {hasResults && (
        <div className="lg:flex lg:gap-6 px-4 lg:px-6 pt-4">
          {activeTab !== "stores" && itemRows.length > 0 && (
            <div
              className={`${
                activeTab === "all" && storeModels.length > 0 ? "lg:flex-1 lg:min-w-0" : "w-full"
              }`}
            >
              {activeTab === "all" && storeModels.length > 0 && (
                <h3 className="text-sm text-muted-foreground mb-3">
                  Items matching "{query}"
                </h3>
              )}

              <div className="space-y-4">
                {itemRows.map((group, index) => {
                  const stores = Array.isArray(group.stores) ? group.stores : [];
                  const sponsored = stores.find((s) => Boolean((s as any).sponsored));
                  const organic = stores.filter((s) => !Boolean((s as any).sponsored));

                  return (
                    <div
                      key={group.product_id || `${group.productName}-${index}`}
                      className="bg-card rounded-xl border border-border overflow-hidden"
                    >
                      <button
                        onClick={() => onProductPress(group.product_id)}
                        className="flex items-center gap-3 p-3 w-full text-left min-h-[72px]"
                      >
                        <div className="w-16 h-16 rounded-lg bg-muted overflow-hidden flex-shrink-0">
                          <ImageWithFallback
                            src={
                              group.image_url ||
                              "https://images.unsplash.com/photo-1542838132-92c53300491e?w=400&q=70"
                            }
                            alt={group.productName}
                            className="w-full h-full object-cover"
                            loading="lazy"
                          />
                        </div>
                        <div className="flex-1 min-w-0">
                          <h4 className="text-sm">{group.productName}</h4>
                          <p className="text-xs text-muted-foreground mt-0.5 truncate">
                            {group.category ? `Category: ${group.category}` : "Available in nearby stores"}
                          </p>
                        </div>
                      </button>

                      {index === 0 && sponsored && (
                        <div className="border-t border-border">
                          <button
                            onClick={() => {
                              const storeId = String((sponsored as any).store_id ?? "");
                              if (storeId) {
                                void discoveryApi
                                  .trackEvent({
                                    type: "click",
                                    storeId,
                                    metadata: {
                                      source: "search_item_sponsored",
                                      query: query.trim().toLowerCase(),
                                      sponsored: true,
                                      product: group.productName
                                    }
                                  })
                                  .catch(() => undefined);
                              }
                              onStorePress(storeId);
                            }}
                            className="flex items-center gap-3 p-3 w-full text-left bg-ad-accent-light/30 border-b border-border min-h-[64px]"
                          >
                            <ImageWithFallback
                              src={"https://images.unsplash.com/photo-1534723328310-e82dad3ee43f?w=200&q=70"}
                              alt={String((sponsored as any).store_name ?? "Sponsored store")}
                              className="w-10 h-10 rounded-lg object-cover flex-shrink-0"
                              loading="lazy"
                            />
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-1.5">
                                <span className="text-sm truncate">
                                  {String((sponsored as any).store_name ?? "")}
                                </span>
                                <VerificationBadge
                                  status={toVerificationStatus(
                                    (sponsored as any).verification ??
                                      (sponsored as any).trust_indicator ??
                                      (sponsored as any).status
                                  )}
                                />
                                <SponsoredBadge
                                  size="sm"
                                  whyThisAd={
                                    (sponsored as any).why_this_ad
                                      ? String((sponsored as any).why_this_ad)
                                      : undefined
                                  }
                                />
                              </div>
                              <div className="flex items-center gap-2 text-[11px] text-muted-foreground mt-0.5">
                                <span className="text-primary">
                                  {String((sponsored as any).price ?? "Price on request")}
                                </span>
                                <StockBadge
                                  status={toStockStatus((sponsored as any).availability, (sponsored as any).price)}
                                />
                                <span>{String((sponsored as any).distance ?? "")}</span>
                              </div>
                            </div>
                            <span className="text-xs text-primary px-2 py-1.5 bg-secondary rounded-lg flex-shrink-0">
                              View store
                            </span>
                          </button>
                        </div>
                      )}

                      <div className="border-t border-border">
                        <p className="px-3 pt-2 text-[11px] text-muted-foreground">
                          Available at {stores.length} store{stores.length !== 1 ? "s" : ""} near you
                        </p>
                        {organic.slice(0, 3).map((store) => (
                          <button
                            key={String((store as any).store_id ?? "")}
                            onClick={() => {
                              const storeId = String((store as any).store_id ?? "");
                              if (storeId) {
                                void discoveryApi
                                  .trackEvent({
                                    type: "click",
                                    storeId,
                                    metadata: {
                                      source: "search_item_store",
                                      query: query.trim().toLowerCase(),
                                      sponsored: false,
                                      product: group.productName
                                    }
                                  })
                                  .catch(() => undefined);
                              }
                              onStorePress(storeId);
                            }}
                            className="flex items-center gap-3 p-3 w-full text-left border-t border-border/50 min-h-[56px] hover:bg-muted/50 transition-colors"
                          >
                            <ImageWithFallback
                              src={"https://images.unsplash.com/photo-1542838132-92c53300491e?w=200&q=70"}
                              alt={String((store as any).store_name ?? "Store")}
                              className="w-10 h-10 rounded-lg object-cover flex-shrink-0"
                              loading="lazy"
                            />
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-1">
                                <span className="text-sm truncate">
                                  {String((store as any).store_name ?? "")}
                                </span>
                                <VerificationBadge
                                  status={toVerificationStatus(
                                    (store as any).verification ??
                                      (store as any).trust_indicator ??
                                      (store as any).status
                                  )}
                                />
                              </div>
                              <div className="flex items-center gap-2 text-[11px] text-muted-foreground mt-0.5">
                                <span className="text-primary">
                                  {String((store as any).price ?? "Price on request")}
                                </span>
                                <StockBadge
                                  status={toStockStatus((store as any).availability, (store as any).price)}
                                />
                                <span>{String((store as any).distance ?? "")}</span>
                              </div>
                            </div>
                            <span className="text-xs text-primary px-2 py-1.5 bg-secondary rounded-lg flex-shrink-0">
                              View store
                            </span>
                          </button>
                        ))}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {activeTab !== "items" && storeModels.length > 0 && (
            <div
              className={`${
                activeTab === "all" && itemRows.length > 0
                  ? "lg:w-80 xl:w-96 lg:flex-shrink-0 mt-4 lg:mt-0"
                  : "w-full"
              }`}
            >
              {activeTab === "all" && itemRows.length > 0 && (
                <h3 className="text-sm text-muted-foreground mb-3 mt-2 lg:mt-0">
                  Stores matching "{query}"
                </h3>
              )}
              <div
                className={`${
                  activeTab === "stores"
                    ? "grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-2"
                    : "space-y-2"
                }`}
              >
                {storeModels.map((store) => (
                  <StoreCard
                    key={store.id}
                    store={store}
                    onPress={(storeId) => {
                      void discoveryApi
                        .trackEvent({
                          type: "click",
                          storeId,
                          metadata: { source: "search_store", query: query.trim().toLowerCase() }
                        })
                        .catch(() => undefined);
                      onStorePress(storeId);
                    }}
                    variant="compact"
                  />
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
