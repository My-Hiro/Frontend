import React from "react";
import { Flame } from "lucide-react";
import type { CarouselApi } from "./ui/carousel";
import { Carousel, CarouselContent, CarouselItem } from "./ui/carousel";
import { ImageWithFallback } from "./figma/ImageWithFallback";
import { SponsoredBadge } from "./SponsoredBadge";
import { StockBadge } from "./StockBadge";
import type { ProductCardModel } from "../state/types";

interface PopularProductsStripProps {
  products: ProductCardModel[];
  onProductPress: (productId: string) => void;
  onViewAll?: () => void;
  className?: string;
  autoplay?: boolean;
  intervalMs?: number;
  minItemsToAutoplay?: number;
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

export function PopularProductsStrip({
  products,
  onProductPress,
  onViewAll,
  className = "",
  autoplay = true,
  intervalMs = 3200,
  minItemsToAutoplay = 8
}: PopularProductsStripProps) {
  const [api, setApi] = React.useState<CarouselApi | null>(null);
  const intervalRef = React.useRef<number | null>(null);
  const restartRef = React.useRef<number | null>(null);

  if (products.length === 0) {
    return null;
  }

  const baseAutoplay = autoplay && !prefersReducedMotion() && products.length > 1;
  const effectiveProducts = React.useMemo(() => {
    if (!baseAutoplay) return products;
    const targetSlides = Math.max(minItemsToAutoplay * 2, 12);
    return repeatToMinSlides(products, targetSlides);
  }, [baseAutoplay, minItemsToAutoplay, products]);

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

  return (
    <section className={className} aria-label="Popular products">
      <div className="flex items-center justify-between px-4 lg:px-6 mb-3">
        <div className="flex items-center gap-1.5">
          <Flame className="w-4 h-4 text-primary" />
          <h2 className="text-base text-foreground">Popular products</h2>
        </div>
        {onViewAll && (
          <button
            type="button"
            className="text-xs text-muted-foreground min-h-[44px] px-2 hover:text-foreground cursor-pointer"
            onClick={onViewAll}
            aria-label="View all popular products"
          >
            View all
          </button>
        )}
      </div>

      <div className="px-4 lg:px-6">
        <Carousel
          opts={{ align: "start", loop: false }}
          setApi={(nextApi) => setApi(nextApi)}
        >
          <CarouselContent className="py-1">
            {effectiveProducts.map((product, index) => (
              <CarouselItem
                key={`${product.id}-${index}`}
                className="embla-slide--product popular-products-slide h-full"
              >
                <button
                  onClick={() => onProductPress(product.id)}
                  className="popular-product-tile flex flex-col bg-card rounded-xl border border-border overflow-hidden text-left transition-shadow hover:shadow-md active:shadow-sm focus-visible:ring-2 focus-visible:ring-primary w-full h-full"
                  aria-label={`${product.name} - ${product.price}`}
                >
                  <div className="popular-product-media relative w-full bg-muted">
                    <ImageWithFallback
                      src={product.image}
                      alt={product.name}
                      className="w-full h-full object-cover"
                      loading="lazy"
                    />
                    {product.isSponsored && (
                      <div className="absolute top-2 left-2">
                        <SponsoredBadge size="sm" whyThisAd={product.whyThisAd} />
                      </div>
                  )}
                  <div className="absolute bottom-2 left-2 right-2">
                    <StockBadge
                      status={product.availability}
                      stockCount={product.stockCount}
                      className="w-full"
                    />
                  </div>
                </div>
                  <div className="popular-product-content p-3 flex flex-col flex-1 min-w-0">
                    <h4 className="text-sm truncate">{product.name}</h4>
                    <p className="text-[11px] text-muted-foreground truncate mt-0.5">
                      {product.storeName || "Nearby store"}
                    </p>
                    <div className="flex items-center justify-between mt-auto pt-2 min-w-0 gap-2">
                      <span className="text-sm text-primary font-semibold truncate min-w-0">
                        {product.price}
                      </span>
                      <span className="text-xs text-primary px-2 py-1 bg-secondary rounded-md flex-shrink-0 whitespace-nowrap">
                        View
                      </span>
                    </div>
                  </div>
                </button>
              </CarouselItem>
            ))}
          </CarouselContent>
        </Carousel>
      </div>
    </section>
  );
}
