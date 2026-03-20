"use client";

import React, { useEffect, useMemo, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { StoreCard } from "@/features/StoreCard";
import { EmptyState } from "@/features/EmptyState";
import { ArrowLeft, SlidersHorizontal } from "lucide-react";
import { discoveryService } from "@/services/discovery.service";
import { Skeleton } from "@/components/ui/skeleton";
import type { PlatformCategory, StoreCardModel } from "@/types";

const parseDistanceKm = (distance: string): number => {
  const parsed = Number.parseFloat(distance.replace(/[^0-9.]+/g, ""));
  return Number.isFinite(parsed) ? parsed : Number.POSITIVE_INFINITY;
};

export default function CategoryDetailPage() {
  const params = useParams();
  const router = useRouter();
  const categoryId = params.id as string;

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [sortBy, setSortBy] = useState<"distance" | "rating" | "name">("distance");
  const [showFilters, setShowFilters] = useState(false);
  const [categories, setCategories] = useState<PlatformCategory[]>([]);
  const [stores, setStores] = useState<StoreCardModel[]>([]);

  useEffect(() => {
    let mounted = true;
    const load = async () => {
      try {
        setError(null);
        setLoading(true);
        const [cats, categoryStores] = await Promise.all([
          discoveryService.getPlatformCategories(),
          discoveryService.getCategoryStores(categoryId),
        ]);
        if (!mounted) return;
        setCategories(cats);
        setStores(categoryStores);
      } catch (err) {
        if (!mounted) return;
        setError(err instanceof Error ? err.message : "Failed to load stores");
      } finally {
        if (!mounted) return;
        setLoading(false);
      }
    };
    void load();
    return () => {
      mounted = false;
    };
  }, [categoryId]);

  const category = categories.find((c) => c.id === categoryId);
  const categoryStores = useMemo(() => {
    let filtered = [...stores];
    switch (sortBy) {
      case "rating":
        return filtered.sort((a, b) => b.rating - a.rating);
      case "name":
        return filtered.sort((a, b) => a.name.localeCompare(b.name));
      case "distance":
      default:
        return filtered.sort((a, b) => {
          if (a.isSponsored !== b.isSponsored) {
            return Number(b.isSponsored) - Number(a.isSponsored);
          }
          return parseDistanceKm(a.distance) - parseDistanceKm(b.distance);
        });
    }
  }, [stores, sortBy]);

  return (
    <div className="pb-20 lg:pb-8 max-w-7xl mx-auto">
      {/* Header */}
      <div className="sticky top-0 z-30 bg-card border-b border-border">
        <div className="flex items-center gap-3 px-4 lg:px-6 py-3">
          <button
            onClick={() => router.back()}
            className="min-w-[44px] min-h-[44px] flex items-center justify-center"
            aria-label="Go back"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div className="flex-1">
            <h1 className="text-base">{category?.name || "Category"}</h1>
            <p className="text-xs text-muted-foreground">
              {loading ? "Loading stores..." : `${categoryStores.length} stores near you`}
            </p>
          </div>
          <button
            onClick={() => setShowFilters(!showFilters)}
            className="min-w-[44px] min-h-[44px] flex items-center justify-center rounded-full bg-secondary"
            aria-label="Sort and filter"
          >
            <SlidersHorizontal className="w-4 h-4 text-secondary-foreground" />
          </button>
        </div>

        {/* Sort filters */}
        {showFilters && (
          <div className="flex gap-2 px-4 lg:px-6 pb-3">
            {(["distance", "rating", "name"] as const).map((option) => (
              <button
                key={option}
                onClick={() => {
                  setSortBy(option);
                  setShowFilters(false);
                }}
                className={`px-3 py-1.5 rounded-full text-xs capitalize min-h-[32px] transition-colors ${
                  sortBy === option
                    ? "bg-primary text-primary-foreground"
                    : "bg-muted text-muted-foreground"
                }`}
              >
                {option === "distance"
                  ? "Nearest"
                  : option === "rating"
                  ? "Top rated"
                  : "A-Z"}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Store List */}
      <div className="px-4 lg:px-6 pt-4">
        {error ? (
          <EmptyState type="error" onRetry={() => window.location.reload()} />
        ) : loading ? (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3">
            {Array.from({ length: 10 }).map((_, i) => (
              <div
                key={i}
                className="bg-card rounded-xl border border-border overflow-hidden"
                aria-hidden="true"
              >
                <Skeleton className="w-full h-28 md:h-36 rounded-none" />
                <div className="p-3">
                  <Skeleton className="h-4 w-3/4 mb-2" />
                  <Skeleton className="h-3 w-full mb-2" />
                  <div className="flex gap-2">
                    <Skeleton className="h-3 w-12" />
                    <Skeleton className="h-3 w-12" />
                    <Skeleton className="h-3 w-12" />
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : categoryStores.length === 0 ? (
          <EmptyState type="empty-category" onRetry={() => router.back()} />
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3">
            {categoryStores.map((store) => (
              <StoreCard
                key={store.id}
                store={store}
                onPress={(storeId: string) => {
                  void discoveryService
                    .trackEvent({
                      type: "click",
                      storeId,
                      metadata: { source: "category_detail", categoryId }
                    })
                    .catch(() => undefined);
                  router.push(`/store/${storeId}?categoryId=${categoryId}`);
                }}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
