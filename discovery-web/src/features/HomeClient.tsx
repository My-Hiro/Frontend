"use client";

import React, { useState, useMemo } from "react";
import { TrendingUp } from "lucide-react";
import { useRouter } from "next/navigation";
import { HeroBanner } from "./HeroBanner";
import { MerchantCtaCard } from "./MerchantCtaCard";
import { CategoryStrip } from "./CategoryStrip";
import { StoreCarousel } from "./StoreCarousel";
import { BannerRotator } from "./BannerRotator";
import { PopularProductsStrip } from "./PopularProductsStrip";
import { discoveryService } from "../services/discovery.service";
import type { 
  HeroBannerModel, 
  PlatformCategory, 
  ProductCardModel, 
  StoreCardModel 
} from "../types";

interface HomeClientProps {
  initialCategories: PlatformCategory[];
  initialHome: {
    heroBanners: HeroBannerModel[];
    suggested: StoreCardModel[];
    popularProducts: ProductCardModel[];
    sections: Array<{ categoryId: string; categoryName: string; stores: StoreCardModel[] }>;
  };
  initialStoreProfileBanners: HeroBannerModel[];
}

export function HomeClient({
  initialCategories,
  initialHome,
  initialStoreProfileBanners,
}: HomeClientProps) {
  const router = useRouter();
  const [categories] = useState(initialCategories);
  const [home] = useState(initialHome);
  const [storeProfileBanners] = useState(initialStoreProfileBanners);

  const storeCountByCategory = useMemo(() => {
    const map = new Map<string, number>();
    for (const section of home.sections) {
      map.set(section.categoryId, section.stores.length);
    }
    return map;
  }, [home.sections]);

  const orderedCategories = useMemo(() => {
    return categories
      .map((cat, index) => ({ cat, index }))
      .sort((a, b) => {
        const ap = a.cat.id === "more" ? 1 : 0;
        const bp = b.cat.id === "more" ? 1 : 0;
        if (ap !== bp) return ap - bp;
        return a.index - b.index;
      })
      .map(({ cat }) => cat);
  }, [categories]);

  return (
    <div className="pb-20 lg:pb-8 max-w-7xl mx-auto">
      {/* Hero Banner */}
      <div className="pt-3 px-4 lg:px-6">
        {home.heroBanners.length > 0 && (
          <HeroBanner banners={home.heroBanners} />
        )}
      </div>

      <MerchantCtaCard />

      {/* Categories */}
      <div className="mt-5 px-4 lg:px-6 mb-4">
        <div className="flex gap-2 overflow-x-auto pb-1 lg:flex-wrap no-scrollbar">
          {orderedCategories.map((cat) => (
            <button
              key={cat.id}
              onClick={() => router.push(`/category/${cat.id}`)}
              className="flex items-center gap-1.5 px-3 py-2 bg-card border border-border rounded-full text-xs whitespace-nowrap min-h-[36px] transition-colors hover:bg-secondary"
            >
              {cat.name}
              <span className="text-muted-foreground text-[10px]">
                {storeCountByCategory.get(cat.id) ?? 0}
              </span>
            </button>
          ))}
        </div>
      </div>

      {/* Suggested */}
      <section className="mb-6">
        <div className="flex items-center justify-between px-4 lg:px-6 mb-3">
          <div className="flex items-center gap-1.5">
            <TrendingUp className="w-4 h-4 text-primary" />
            <h2 className="text-base font-semibold">Suggested for you</h2>
          </div>
        </div>
        <div className="px-4 lg:px-6">
          <StoreCarousel stores={home.suggested} onStorePress={(id) => router.push(`/store/${id}`)} />
        </div>
      </section>

      {/* Category Sections */}
      {home.sections.map((section) => (
        <CategoryStrip
          key={section.categoryId}
          title={section.categoryName}
          stores={section.stores}
          onStorePress={(id) => router.push(`/store/${id}`)}
        />
      ))}

      {/* Popular Products */}
      <PopularProductsStrip
        products={home.popularProducts}
        onViewAll={() => {}}
        onProductPress={(id) => router.push(`/product/${id}`)}
      />
    </div>
  );
}
