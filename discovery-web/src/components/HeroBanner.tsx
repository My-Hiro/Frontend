import React, { useState, useCallback, useEffect } from "react";
import { ImageWithFallback } from "./figma/ImageWithFallback";
import { SponsoredBadge } from "./SponsoredBadge";
import type { HeroBannerModel as HeroBannerType } from "../state/types";

interface HeroBannerProps {
  banners: HeroBannerType[];
  onBannerPress?: (banner: HeroBannerType) => void;
}

export function HeroBanner({ banners, onBannerPress }: HeroBannerProps) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [touchStart, setTouchStart] = useState<number | null>(null);
  const [touchEnd, setTouchEnd] = useState<number | null>(null);

  const minSwipeDistance = 50;

  const onTouchStart = useCallback((e: React.TouchEvent) => {
    setTouchEnd(null);
    setTouchStart(e.targetTouches[0].clientX);
  }, []);

  const onTouchMove = useCallback((e: React.TouchEvent) => {
    setTouchEnd(e.targetTouches[0].clientX);
  }, []);

  const onTouchEnd = useCallback(() => {
    if (!touchStart || !touchEnd) return;
    const distance = touchStart - touchEnd;
    if (Math.abs(distance) > minSwipeDistance) {
      if (distance > 0 && currentIndex < banners.length - 1) {
        setCurrentIndex((i) => i + 1);
      } else if (distance < 0 && currentIndex > 0) {
        setCurrentIndex((i) => i - 1);
      }
    }
  }, [touchStart, touchEnd, currentIndex, banners.length]);

  useEffect(() => {
    if (banners.length <= 1) {
      return;
    }
    const timer = window.setInterval(() => {
      setCurrentIndex((index) => (index + 1) % banners.length);
    }, 5200);
    return () => {
      window.clearInterval(timer);
    };
  }, [banners.length]);

  const banner = banners[currentIndex];
  const canPress =
    Boolean(onBannerPress) &&
    (Boolean(banner?.link) || (banner?.linkType && banner.linkType !== "none"));

  return (
    <div className="relative" role="region" aria-label="Featured promotions" aria-roledescription="carousel">
      <div
        className="relative h-44 md:h-56 lg:h-72 rounded-2xl overflow-hidden mx-4 lg:mx-6"
        onTouchStart={onTouchStart}
        onTouchMove={onTouchMove}
        onTouchEnd={onTouchEnd}
        onClick={() => {
          if (!canPress) return;
          onBannerPress?.(banner);
        }}
        role={canPress ? "button" : undefined}
        tabIndex={canPress ? 0 : undefined}
        onKeyDown={(event) => {
          if (!canPress) return;
          if (event.key === "Enter" || event.key === " ") {
            event.preventDefault();
            onBannerPress?.(banner);
          }
        }}
      >
        <ImageWithFallback
          src={banner.image}
          alt={banner.title}
          className="w-full h-full object-cover"
          loading="eager"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/20 to-transparent" />
        <div className="absolute bottom-0 left-0 right-0 p-4">
          {banner.isSponsored && (
            <div className="mb-2">
              <SponsoredBadge size="md" />
            </div>
          )}
          <h2 className="text-white text-lg">{banner.title}</h2>
          <p className="text-white/80 text-xs mt-1">{banner.subtitle}</p>
        </div>
      </div>

      {/* Progress dots */}
      <div className="flex items-center justify-center gap-2 mt-3" role="tablist" aria-label="Banner navigation">
        {banners.map((_, i) => (
          <button
            key={i}
            onClick={() => setCurrentIndex(i)}
            className={`rounded-full transition-all min-w-[8px] min-h-[8px] ${
              i === currentIndex
                ? "w-6 h-2 bg-primary"
                : "w-2 h-2 bg-muted-foreground/30"
            }`}
            role="tab"
            aria-selected={i === currentIndex}
            aria-label={`Slide ${i + 1} of ${banners.length}`}
          />
        ))}
      </div>
    </div>
  );
}
