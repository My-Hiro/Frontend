"use client";

import React, { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { ImageWithFallback } from "./figma/ImageWithFallback";
import { discoveryApi } from "../state/api";
import {
  Baby,
  BookOpen,
  Hammer,
  MoreHorizontal,
  NotebookPen,
  Pill,
  Shirt,
  ShoppingBasket,
  Smartphone,
  Sparkles,
  SprayCan,
  Wrench,
} from "lucide-react";
import type { PlatformCategory, StoreCategoryTile } from "../state/types";

const iconMap: Record<string, React.ElementType> = {
  pill: Pill,
  smartphone: Smartphone,
  "shopping-basket": ShoppingBasket,
  baby: Baby,
  "spray-can": SprayCan,
  sparkles: Sparkles,
  hammer: Hammer,
  "notebook-pen": NotebookPen,
  shirt: Shirt,
  wrench: Wrench,
  "book-open": BookOpen,
  "more-horizontal": MoreHorizontal,
};

export function CategoriesPage() {
  const router = useRouter();
  const [categories, setCategories] = useState<PlatformCategory[]>([]);
  const [counts, setCounts] = useState<Map<string, number>>(new Map());

  useEffect(() => {
    let mounted = true;
    const load = async () => {
      const [cats, home] = await Promise.all([discoveryApi.getPlatformCategories(), discoveryApi.getHome()]);
      if (!mounted) return;
      setCategories(cats);
      const map = new Map<string, number>();
      for (const section of home.sections) {
        map.set(section.categoryId, section.stores.length);
      }
      setCounts(map);
    };
    load().catch(() => undefined);
    return () => {
      mounted = false;
    };
  }, []);

  const tiles: StoreCategoryTile[] = useMemo(
    () =>
      categories
        .map((cat, index) => ({ cat, index }))
        .sort((a, b) => {
          const ap = a.cat.id === "more" ? 1 : 0;
          const bp = b.cat.id === "more" ? 1 : 0;
          if (ap !== bp) {
            return ap - bp;
          }
          return a.index - b.index;
        })
        .map(({ cat }) => cat)
        .map((cat) => ({
        id: cat.id,
        name: cat.name,
        icon: cat.icon,
        imageUrl: cat.imageUrl,
        storeCount: counts.get(cat.id) ?? 0,
        shortName: cat.shortName,
        color: cat.color,
      })),
    [categories, counts]
  );

  return (
    <div className="pb-20 lg:pb-8 px-4 lg:px-6 pt-4 max-w-7xl mx-auto">
      <h1 className="text-xl mb-1">Categories</h1>
      <p className="text-sm text-muted-foreground mb-6">
        Browse stores by what they sell
      </p>

      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3 lg:gap-4">
        {tiles.map((cat) => {
          const Icon = cat.icon ? iconMap[cat.icon] : Smartphone;

          return (
            <button
              key={cat.id}
              onClick={() => router.push(`/category/${cat.id}`)}
              className="relative overflow-hidden rounded-2xl bg-card border border-border text-left min-h-[120px] md:min-h-[150px] lg:min-h-[180px] transition-shadow hover:shadow-md active:shadow-sm focus-visible:ring-2 focus-visible:ring-primary"
              aria-label={`${cat.name} - ${cat.storeCount ?? 0} stores`}
            >
              <ImageWithFallback
                src={cat.imageUrl || "https://images.unsplash.com/photo-1542838132-92c53300491e?w=1200&q=70"}
                alt={cat.name}
                className="w-full h-full object-cover absolute inset-0"
                loading="lazy"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/30 to-transparent" />
              <div className="relative h-full flex flex-col justify-end p-3 lg:p-4">
                <div className="w-8 h-8 lg:w-10 lg:h-10 rounded-lg bg-white/20 backdrop-blur flex items-center justify-center mb-2">
                  <Icon className="w-4 h-4 lg:w-5 lg:h-5 text-white" />
                </div>
                <h3 className="text-sm lg:text-base text-white">{cat.name}</h3>
                <p className="text-[11px] lg:text-xs text-white/70">
                  {cat.storeCount ?? 0} stores
                </p>
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}
