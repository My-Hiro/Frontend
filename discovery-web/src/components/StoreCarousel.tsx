"use client";

import React from "react";
import type { CarouselApi } from "./ui/carousel";
import { Carousel, CarouselContent, CarouselItem } from "./ui/carousel";
import { StoreCard } from "./StoreCard";
import type { StoreCardModel } from "../state/types";

interface StoreCarouselProps {
  stores: StoreCardModel[];
  onStorePress: (storeId: string) => void;
  autoplay?: boolean;
  intervalMs?: number;
  minItemsToAutoplay?: number;
  className?: string;
}

const prefersReducedMotion = (): boolean => {
  if (typeof window === "undefined") return false;
  return window.matchMedia?.("(prefers-reduced-motion: reduce)")?.matches ?? false;
};

const repeatToMinSlides = <T extends { isSponsored?: boolean }>(
  items: T[],
  targetSlides: number
): T[] => {
  if (items.length <= 1) return items;
  if (items.length >= targetSlides) return items;

  const organic = items.filter((it) => !it.isSponsored);
  if (organic.length === 0) {
    // Avoid repeating sponsored-only rails (ad rules) and avoid confusing duplicates.
    return items;
  }
  const pool = organic;

  const out = [...items];
  // Cap repeat cycles to avoid huge DOM on low-end devices.
  const maxCycles = 6;
  let cycles = 0;
  while (out.length < targetSlides && cycles < maxCycles) {
    for (const it of pool) {
      out.push(it);
      if (out.length >= targetSlides) break;
    }
    cycles += 1;
  }

  return out;
};

export function StoreCarousel({
  stores,
  onStorePress,
  autoplay = false,
  intervalMs = 3500,
  minItemsToAutoplay = 8,
  className = ""
}: StoreCarouselProps) {
  const [api, setApi] = React.useState<CarouselApi | null>(null);
  const intervalRef = React.useRef<number | null>(null);
  const restartRef = React.useRef<number | null>(null);

  const baseAutoplay = autoplay && !prefersReducedMotion() && stores.length > 1;
  const effectiveStores = React.useMemo(() => {
    if (!baseAutoplay) return stores;
    const targetSlides = Math.max(minItemsToAutoplay * 2, 12);
    return repeatToMinSlides(stores, targetSlides);
  }, [baseAutoplay, minItemsToAutoplay, stores]);

  const stop = React.useCallback(() => {
    if (intervalRef.current !== null) {
      window.clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
    if (restartRef.current !== null) {
      window.clearTimeout(restartRef.current);
      restartRef.current = null;
    }
  }, []);

  const start = React.useCallback(() => {
    if (!api) return;
    stop();
    if (!api.canScrollNext()) {
      return;
    }
    intervalRef.current = window.setInterval(() => {
      if (api.canScrollNext()) {
        api.scrollNext();
      } else {
        api.scrollTo(0, true);
      }
    }, intervalMs);
  }, [api, intervalMs, stop]);

  React.useEffect(() => {
    if (!api || !baseAutoplay) {
      stop();
      return;
    }

    start();

    const pause = () => stop();
    const resume = () => {
      stop();
      restartRef.current = window.setTimeout(() => start(), 1200);
    };

    api.on("pointerDown", pause);
    api.on("settle", resume);
    api.on("reInit", resume);

    return () => {
      api.off("pointerDown", pause);
      api.off("settle", resume);
      api.off("reInit", resume);
      stop();
    };
  }, [api, baseAutoplay, start, stop]);

  if (stores.length === 0) {
    return null;
  }

  return (
    <div className={className}>
      <Carousel opts={{ align: "start", loop: false }} setApi={(nextApi) => setApi(nextApi)}>
        <CarouselContent className="py-1">
          {effectiveStores.map((store, index) => (
            <CarouselItem
              key={`${store.id}-${index}`}
              className="embla-slide--store h-full"
            >
              <StoreCard store={store} onPress={(id) => onStorePress(id)} />
            </CarouselItem>
          ))}
        </CarouselContent>
      </Carousel>
    </div>
  );
}

