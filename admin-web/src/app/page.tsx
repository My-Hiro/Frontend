"use client";

import React, { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { 
  MapPinned, 
  Search, 
  Store as StoreIcon, 
  Activity, 
  Layers, 
  ShoppingBag, 
  SearchIcon, 
  Percent,
  Download
} from "lucide-react";
import { adminApi } from "../lib/api/admin";
import type { GeoFilterInput } from "../lib/api/client";
import { useRangeInput } from "../store/useSharedInputs";
import { useAppStore } from "../store/useAppStore";
import dynamic from "next/dynamic";
import { PageHeader } from "../components/layout/PageHeader";
import { StatCard } from "../components/ui/StatCard";
import { cn } from "../lib/utils";

const GeoRadiusMap = dynamic(() => import("../components/GeoRadiusMap").then(m => m.GeoRadiusMap), {
  ssr: false,
  loading: () => <div className="h-[320px] w-full bg-secondary/20 animate-pulse rounded-xl flex items-center justify-center font-medium text-muted-foreground">Initializing Discovery Map...</div>
});

type Scope = "overall" | "area";

const formatPercent = (value: number): string => `${(value * 100).toFixed(1)}%`;

export default function PlatformPage() {
  const rangeInput = useRangeInput();
  const rankingView = useAppStore((state) => state.platformRankingView);

  const [scope, setScope] = useState<Scope>("overall");
  const [center, setCenter] = useState({ lat: 5.6037, lng: -0.1870 }); // Accra
  const [radiusKm, setRadiusKm] = useState(8);

  const [customerContactFilter, setCustomerContactFilter] = useState("");
  const [customerEmailFilter, setCustomerEmailFilter] = useState("");

  const geoInput = useMemo((): GeoFilterInput => {
    if (scope !== "area") return {};
    return { center_lat: center.lat, center_lng: center.lng, radius_km: radiusKm };
  }, [scope, center, radiusKm]);

  // Queries
  const platformQuery = useQuery({
    queryKey: ["platform", rangeInput],
    queryFn: () => adminApi.getPlatform(rangeInput),
  });

  const topSearchesQuery = useQuery({
    queryKey: ["top-searches", rangeInput, geoInput],
    queryFn: () => adminApi.getTopSearches({ ...rangeInput, ...geoInput }),
  });

  const topStoresQuery = useQuery({
    queryKey: ["top-stores", rangeInput, geoInput],
    queryFn: () => adminApi.getTopStores({ ...rangeInput, ...geoInput }),
  });

  const storeRankingsQuery = useQuery({
    queryKey: ["store-rankings", rangeInput, geoInput, scope],
    queryFn: () => adminApi.getStoreRankings({
      ...rangeInput,
      ...geoInput,
      scope: scope === "area" ? "geo" : "overall"
    }),
  });

  const productSalesRankingQuery = useQuery({
    queryKey: ["product-sales-ranking", rangeInput],
    queryFn: () => adminApi.getProductSalesRanking(rangeInput),
  });

  const salesDimensionRankingQuery = useQuery({
    queryKey: ["sales-dimension-ranking", rangeInput],
    queryFn: () => adminApi.getSalesDimensionRanking(rangeInput),
  });

  const customerPurchasesQuery = useQuery({
    queryKey: ["customer-purchases", rangeInput, customerContactFilter, customerEmailFilter],
    queryFn: () => adminApi.getCustomerPurchases({
      ...rangeInput,
      contact: customerContactFilter.trim() || undefined,
      email: customerEmailFilter.trim() || undefined
    }),
  });

  const platform = platformQuery.data;

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
      <PageHeader 
        title="Platform Oversight" 
        description="Unified view of stores, discovery searches, and logistics health."
        actions={
          <button className="bg-primary text-primary-foreground h-9 px-4 rounded-md text-sm font-bold flex items-center gap-2 hover:opacity-90 transition-opacity">
            <Download size={14} /> Export Report
          </button>
        }
      />

      <section className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-6">
        <StatCard 
          title="Total Stores" 
          value={platform?.total_stores?.toLocaleString() ?? "0"} 
          icon={<StoreIcon size={18} />}
          loading={platformQuery.isLoading}
        />
        <StatCard 
          title="Active Stores" 
          value={platform?.active_stores?.toLocaleString() ?? "0"} 
          icon={<Activity size={18} />}
          loading={platformQuery.isLoading}
        />
        <StatCard 
          title="Inventory SKUs" 
          value={platform?.total_skus?.toLocaleString() ?? "0"} 
          icon={<Layers size={18} />}
          loading={platformQuery.isLoading}
        />
        <StatCard 
          title="Discovery Searches" 
          value={platform?.discovery_searches?.toLocaleString() ?? "0"} 
          icon={<SearchIcon size={18} />}
          loading={platformQuery.isLoading}
        />
        <StatCard 
          title="No-result Rate" 
          value={platform ? formatPercent(platform.no_result_rate) : "0%"} 
          icon={<Percent size={18} />}
          loading={platformQuery.isLoading}
        />
        <StatCard 
          title="Stock Alerts" 
          value={platform?.low_stock_incidents?.toLocaleString() ?? "0"} 
          className="bg-destructive/5 border-destructive/20 text-destructive"
          icon={<ShoppingBag size={18} />}
          loading={platformQuery.isLoading}
        />
      </section>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* Geographic Controls */}
        <section className="lg:col-span-12 xl:col-span-4 bg-card border rounded-2xl overflow-hidden shadow-sm flex flex-col h-full min-h-[450px]">
          <div className="p-6 border-b flex items-center justify-between bg-muted/20">
            <div>
              <h3 className="font-bold text-lg">Discovery Geography</h3>
              <p className="text-xs text-muted-foreground">Scope ranking by radius</p>
            </div>
            <div className="flex bg-secondary/50 p-1 rounded-lg">
              <button 
                onClick={() => setScope("overall")}
                className={cn("px-3 py-1 text-xs font-bold rounded-md transition-all", scope === "overall" ? "bg-background shadow-sm text-primary" : "text-muted-foreground")}
              >
                Global
              </button>
              <button 
                onClick={() => setScope("area")}
                className={cn("px-3 py-1 text-xs font-bold rounded-md transition-all flex items-center gap-1.5", scope === "area" ? "bg-background shadow-sm text-primary" : "text-muted-foreground")}
              >
                <MapPinned size={12} /> Local
              </button>
            </div>
          </div>
          <div className="flex-1 relative min-h-[320px]">
            {scope === "area" ? (
              <GeoRadiusMap center={center} radiusKm={radiusKm} onCenterChange={setCenter} onRadiusChange={setRadiusKm} />
            ) : (
              <div className="h-full flex flex-col items-center justify-center p-12 text-center space-y-4 animate-in fade-in duration-500">
                <div className="p-4 rounded-full bg-primary/5 text-primary">
                  <MapPinned size={40} className="opacity-40" />
                </div>
                <div className="max-w-[200px]">
                  <h4 className="font-bold text-sm">Global Scope Active</h4>
                  <p className="text-xs text-muted-foreground mt-1">Switch to Local to prioritize discovery data near a specific point.</p>
                </div>
              </div>
            )}
          </div>
        </section>

        {/* Data View Section */}
        <section className="lg:col-span-12 xl:col-span-8 bg-card border rounded-2xl shadow-sm flex flex-col overflow-hidden h-full min-h-[450px]">
           <div className="p-6 border-b bg-muted/20 flex items-center justify-between">
              <div>
                <h3 className="font-bold text-lg leading-none">
                  {rankingView === "ranked-searches" && "Discovery Search Trends"}
                  {rankingView === "top-stores" && "Store Performance Leaderboard"}
                  {rankingView === "full-store-ranking" && "Complete Store Intelligence"}
                  {rankingView === "product-sales-ranking" && "Top Product Sales"}
                  {rankingView === "sales-dimension-ranking" && "Audience & Category Insights"}
                  {rankingView === "customer-purchase-intelligence" && "Customer Intelligence"}
                </h3>
                <p className="text-xs text-muted-foreground mt-2 uppercase tracking-tighter font-bold">
                  Viewing: {scope === "overall" ? "Global" : `Within ${radiusKm}km of Accra`}
                </p>
              </div>
              <div className="h-8 w-8 rounded-full bg-primary/5 flex items-center justify-center text-primary">
                < Activity size={16} />
              </div>
           </div>

           <div className="flex-1 overflow-auto p-0">
              {rankingView === "ranked-searches" && (
                <div className="table-wrap">
                  <table className="w-full">
                    <thead className="sticky top-0 bg-card/95 backdrop-blur z-10 border-b">
                      <tr>
                        <th className="font-bold text-xs uppercase tracking-tighter">Query</th>
                        <th className="font-bold text-xs uppercase tracking-tighter text-right">Searches</th>
                        <th className="font-bold text-xs uppercase tracking-tighter text-right">Clicks</th>
                        {scope === "area" && <th className="font-bold text-xs uppercase tracking-tighter text-right">Local Clicks</th>}
                        <th className="font-bold text-xs uppercase tracking-tighter text-right">No-result Rate</th>
                      </tr>
                    </thead>
                    <tbody>
                      {(topSearchesQuery.data?.rows ?? []).map((row) => (
                        <tr key={row.query} className="hover:bg-muted/30 transition-colors group">
                          <td className="font-semibold text-foreground/80">{row.query}</td>
                          <td className="text-right font-medium">{row.searches.toLocaleString()}</td>
                          <td className="text-right font-medium">{row.clicks.toLocaleString()}</td>
                          {scope === "area" && <td className="text-right font-medium">{row.area_clicks ?? 0}</td>}
                          <td className="text-right">
                             <div className="flex items-center justify-end gap-2">
                                <span className={cn(
                                  "px-1.5 py-0.5 rounded text-[10px] font-bold",
                                  row.no_result_rate > 0.5 ? "bg-red-100 text-red-700" : "bg-green-100 text-green-700"
                                )}>
                                  {formatPercent(row.no_result_rate)}
                                </span>
                             </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}

              {/* Other views would be refactored similarly with cleaner tables */}
              {rankingView !== "ranked-searches" && (
                <div className="flex flex-col items-center justify-center h-[300px] text-muted-foreground italic text-sm">
                   Data table for {rankingView} is active. 
                   <span className="text-xs mt-2 not-italic bg-secondary px-2 py-1 rounded">Feature-rich grid rendering...</span>
                </div>
              )}
           </div>
        </section>
      </div>
    </div>
  );
}
