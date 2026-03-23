"use client";

import React, { useState, useEffect, useMemo } from "react";
import { useRouter } from "next/navigation";
import { HeroBanner } from "./HeroBanner";
import { MerchantCtaCard } from "./MerchantCtaCard";
import { CategoryStrip } from "./CategoryStrip";
import { StoreCarousel } from "./StoreCarousel";
import { BannerRotator } from "./BannerRotator";
import { EmptyState } from "./EmptyState";
import { PopularProductsStrip } from "./PopularProductsStrip";
import {
  HeroBannerSkeleton,
  CategoryStripSkeleton,
} from "./SkeletonLoaders";
import { TrendingUp } from "lucide-react";
import { discoveryApi } from "../state/api";
import { useBannerHandler } from "../hooks/useBannerHandler";
import type { HeroBannerModel, PlatformCategory, ProductCardModel, StoreCardModel } from "../state/types";

export function HomePage() {
  const router = useRouter();
  const { handleBannerPress } = useBannerHandler();
  
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [touchStartY, setTouchStartY] = useState<number | null>(null);
  const [categories, setCategories] = useState<PlatformCategory[]>([]);
  const [heroBanners, setHeroBanners] = useState<HeroBannerModel[]>([]);
  const [storeProfileBanners, setStoreProfileBanners] = useState<HeroBannerModel[]>([]);
  const [suggestedStores, setSuggestedStores] = useState<StoreCardModel[]>([]);
  const [popularProducts, setPopularProducts] = useState<ProductCardModel[]>([]);
  const [sections, setSections] = useState<
    Array<{ categoryId: string; categoryName: string; stores: StoreCardModel[] }>
  >([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let mounted = true;
    const load = async (force = false) => {
      try {
        setError(null);
        const [cats, home, profileBanner] = await Promise.all([
          discoveryApi.getPlatformCategories(force),
          discoveryApi.getHome(force),
          discoveryApi.getSponsoredBanners("store_profile", force)
        ]);
        if (!mounted) return;
        setCategories(cats);
        setHeroBanners(home.heroBanners);
        setStoreProfileBanners(profileBanner);
        setSuggestedStores(home.suggested);
        setPopularProducts(home.popularProducts);
        setSections(home.sections);
      } catch (err) {
        if (!mounted) return;
        setError(err instanceof Error ? err.message : "Failed to load");
      } finally {
        if (!mounted) return;
        setLoading(false);
      }
    };

    void load(false);

    const refreshId = window.setTimeout(() => {
      if (!mounted) return;
      void load(true);
    }, 650);
    return () => {
      mounted = false;
      window.clearTimeout(refreshId);
    };
  }, []);

  useEffect(() => {
    if (storeProfileBanners.length === 0) return;
    storeProfileBanners.forEach((banner) => {
      void discoveryApi
        .trackEvent({
          type: "impression",
          metadata: {
            source: "home_store_profiles",
            placement: "store_profile",
            sponsored: true,
            banner_id: banner.id
          }
        })
        .catch(() => undefined);
    });
  }, [storeProfileBanners]);

  const handlePullToRefresh = async () => {
    if (refreshing) return;
    setRefreshing(true);
    try {
      const [cats, home, profileBanner] = await Promise.all([
        discoveryApi.getPlatformCategories(true),
        discoveryApi.getHome(true),
        discoveryApi.getSponsoredBanners("store_profile", true)
      ]);
      setCategories(cats);
      setHeroBanners(home.heroBanners);
      setStoreProfileBanners(profileBanner);
      setSuggestedStores(home.suggested);
      setPopularProducts(home.popularProducts);
      setSections(home.sections);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to refresh");
    } finally {
      setRefreshing(false);
    }
  };

  const handleTouchStart = (e: React.TouchEvent) => {
    if (window.scrollY === 0) {
      setTouchStartY(e.touches[0].clientY);
    }
  };

  const handleTouchEnd = (e: React.TouchEvent) => {
    if (touchStartY !== null) {
      const deltaY = e.changedTouches[0].clientY - touchStartY;
      if (deltaY > 80) {
        void handlePullToRefresh();
      }
      setTouchStartY(null);
    }
  };

  const storeCountByCategory = useMemo(() => {
    const map = new Map<string, number>();
    for (const section of sections) {
      map.set(section.categoryId, section.stores.length);
    }
    return map;
  }, [sections]);

  const orderedCategories = useMemo(() => {
    return categories
      .map((cat, index) => ({ cat, index }))
      .sort((a, b) => {
        const ap = a.cat.id === "more" ? 1 : 0;
        const bp = b.cat.id === "more" ? 1 : 0;
        if (ap !== bp) {
          return ap - bp;
        }
        return a.index - b.index;
      })
      .map(({ cat }) => cat);
  }, [categories]);

  if (loading) {
    return (
      <div
        className="pb-20 lg:pb-8 max-w-7xl mx-auto"
        onTouchStart={handleTouchStart}
        onTouchEnd={handleTouchEnd}
      >
        <HeroBannerSkeleton />
        <div className="mt-6" />
        <CategoryStripSkeleton />
        <CategoryStripSkeleton />
        <CategoryStripSkeleton />
      </div>
    );
  }

  return (
    <div
      className="pb-20 lg:pb-8 max-w-7xl mx-auto"
      onTouchStart={handleTouchStart}
      onTouchEnd={handleTouchEnd}
    >
      {error && (
        <div className="pt-6">
          <EmptyState type="error" onRetry={() => window.location.reload()} />
        </div>
      )}

      {refreshing && (
        <div className="flex justify-center py-3">
          <div className="w-5 h-5 border-2 border-primary border-t-transparent rounded-full animate-spin" />
        </div>
      )}

      <div className="pt-3">
        {heroBanners.length > 0 && (
          <HeroBanner
            banners={heroBanners}
            onBannerPress={handleBannerPress}
          />
        )}
      </div>

      <MerchantCtaCard />

      <div className="mt-5 px-4 lg:px-6 mb-4">
        <div
          className="flex gap-2 overflow-x-auto pb-1 lg:flex-wrap"
          style={{ scrollbarWidth: "none", msOverflowStyle: "none" }}
        >
          {orderedCategories.map((cat) => (
            <button
              key={cat.id}
              onClick={() => router.push(`/category/${cat.id}`)}
              className="flex items-center gap-1.5 px-3 py-2 bg-card border border-border rounded-full text-xs whitespace-nowrap min-h-[36px] transition-colors hover:bg-secondary active:bg-secondary"
            >
              {cat.name}
              <span className="text-muted-foreground text-[10px]">
                {storeCountByCategory.get(cat.id) ?? 0}
              </span>
            </button>
          ))}
        </div>
      </div>

      <section className="mb-6" aria-label="Suggested stores">
        <div className="flex items-center justify-between px-4 lg:px-6 mb-3">
          <div className="flex items-center gap-1.5">
            <TrendingUp className="w-4 h-4 text-primary" />
            <h2 className="text-base text-foreground">Suggested for you</h2>
          </div>
        </div>
        <div className="px-4 lg:px-6">
          <StoreCarousel
            stores={suggestedStores}
            onStorePress={(storeId) => {
              void discoveryApi
                .trackEvent({ type: "click", storeId, metadata: { source: "home_suggested" } })
                .catch(() => undefined);
              router.push(`/store/${storeId}`);
            }}
            autoplay
            intervalMs={2600}
            minItemsToAutoplay={6}
          />
        </div>
        {storeProfileBanners.length > 0 && (
          <div className="px-4 lg:px-6 pt-3">
            <BannerRotator
              banners={storeProfileBanners}
              onPress={(banner) => {
                handleBannerPress(banner);
                void discoveryApi
                  .trackEvent({
                    type: "click",
                    metadata: {
                      source: "home_store_profiles",
                      placement: "store_profile",
                      sponsored: true,
                      banner_id: banner.id
                    }
                  })
                  .catch(() => undefined);
              }}
            />
          </div>
        )}
      </section>

      {sections.map((section) => {
        if (section.stores.length === 0) return null;
        return (
          <CategoryStrip
            key={section.categoryId}
            title={section.categoryName}
            stores={section.stores}
            onStorePress={(storeId) => {
              void discoveryApi
                .trackEvent({
                  type: "click",
                  storeId,
                  metadata: { source: "home_category_section", categoryId: section.categoryId }
                })
                .catch(() => undefined);
              router.push(`/store/${storeId}`);
            }}
            onSeeMore={() => router.push(`/category/${section.categoryId}`)}
          />
        );
      })}

      <PopularProductsStrip
        className="mb-8"
        products={popularProducts}
        onViewAll={() => router.push("/popular")}
        onProductPress={(productId) => {
          const product = popularProducts.find((entry) => entry.id === productId);
          void discoveryApi
            .trackEvent({
              type: "click",
              storeId: product?.storeId,
              itemId: productId,
              metadata: {
                source: "home_popular_products",
                sponsored: Boolean(product?.isSponsored)
              }
            })
            .catch(() => undefined);
          router.push(`/product/${productId}`);
        }}
      />
    </div>
  );
}
