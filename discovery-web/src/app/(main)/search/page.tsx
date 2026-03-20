"use client";

import React, { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Search, TrendingUp } from "lucide-react";
import { StoreCard } from "@/components/features/StoreCard";
import { StockBadge } from "@/components/features/StockBadge";
import { SponsoredBadge } from "@/components/features/SponsoredBadge";
import { VerificationBadge } from "@/components/features/VerificationBadge";
import { EmptyState } from "@/components/features/EmptyState";
import { ImageWithFallback } from "@/components/features/figma/ImageWithFallback";
import { discoveryService } from "@/services/discovery.service";
import type { AvailabilityStatus, StoreCardModel, VerificationStatus } from "@/types";

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

export default function SearchPage() {
  const router = useRouter();
  const [query, setQuery] = useState("");
  const [activeTab, setActiveTab] = useState<"all" | "items" | "stores">("all");
  const [loading, setLoading] = useState(false);
  const [recentStores, setRecentStores] = useState<StoreCardModel[]>([]);
  const [itemRows, setItemRows] = useState<ItemRow[]>([]);
  const [storeRows, setStoreRows] = useState<Array<Record<string, unknown>>>([]);

  useEffect(() => {
    discoveryService
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
        discoveryService.search({ q, type: "item", page: 1 }),
        discoveryService.search({ q, type: "store", page: 1 })
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

  const onStorePress = (storeId: string) => router.push(`/store/${storeId}`);
  const onProductPress = (productId: string) => router.push(`/product/${productId}`);

  return (
    <div className="pb-20 lg:pb-8 max-w-7xl mx-auto">
      <div className="px-4 lg:px-6 py-3 bg-card border-b border-border sticky top-0 z-30">
        <form onSubmit={(e) => e.preventDefault()} className="relative max-w-2xl">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <input
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search items, brands, or stores"
            className="w-full pl-9 pr-4 py-2.5 bg-input-background rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 min-h-[44px]"
            autoFocus
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
            <h3 className="text-sm font-semibold">Popular searches</h3>
          </div>
          <div className="flex flex-wrap gap-2">
            {popularSearches.map((term) => (
              <button
                key={term}
                onClick={() => setQuery(term)}
                className="px-3 py-2 bg-card border border-border rounded-full text-sm hover:bg-secondary transition-colors"
              >
                {term}
              </button>
            ))}
          </div>
        </div>
      )}

      {noResults && (
        <EmptyState type="no-results" query={query} />
      )}

      {hasResults && (
        <div className="px-4 lg:px-6 pt-4 space-y-4">
            {activeTab !== "stores" && itemRows.map((group) => (
               <div key={group.product_id} className="bg-card rounded-xl border border-border p-3 flex items-center gap-3 cursor-pointer hover:bg-accent/50 transition-colors" onClick={() => onProductPress(group.product_id)}>
                  <div className="w-16 h-16 rounded-lg bg-muted overflow-hidden flex-shrink-0">
                    <ImageWithFallback src={group.image_url} alt={group.productName} className="w-full h-full object-cover" />
                  </div>
                  <div>
                    <h4 className="text-sm font-medium">{group.productName}</h4>
                    <p className="text-xs text-muted-foreground">{group.category}</p>
                  </div>
               </div>
            ))}

            {activeTab !== "items" && storeModels.map((store) => (
              <StoreCard key={store.id} store={store} onPress={onStorePress} variant="compact" />
            ))}
        </div>
      )}
    </div>
  );
}
