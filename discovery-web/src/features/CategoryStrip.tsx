import React from "react";
import { ChevronRight } from "lucide-react";
import { StoreCarousel } from "./StoreCarousel";
import type { StoreCardModel } from "../state/types";

interface CategoryStripProps {
  title: string;
  stores: StoreCardModel[];
  onStorePress: (storeId: string) => void;
  onSeeMore?: () => void;
}

export function CategoryStrip({
  title,
  stores,
  onStorePress,
  onSeeMore,
}: CategoryStripProps) {
  return (
    <section className="mb-6" aria-label={`${title} stores`}>
      <div className="flex items-center justify-between px-4 lg:px-6 mb-3">
        <h2 className="text-base text-foreground">{title}</h2>
        {onSeeMore && (
          <button
            type="button"
            onClick={onSeeMore}
            className="flex items-center gap-0.5 text-xs text-primary min-h-[44px] px-2 cursor-pointer"
            aria-label={`See more ${title} stores`}
          >
            See more
            <ChevronRight className="w-3.5 h-3.5" />
          </button>
        )}
      </div>
      <div className="px-4 lg:px-6">
        <StoreCarousel
          stores={stores}
          onStorePress={onStorePress}
          autoplay
          intervalMs={3600}
          minItemsToAutoplay={8}
        />
      </div>
    </section>
  );
}
