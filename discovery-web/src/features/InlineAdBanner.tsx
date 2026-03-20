import React from "react";
import { ImageWithFallback } from "./figma/ImageWithFallback";
import { SponsoredBadge } from "./SponsoredBadge";
import type { HeroBannerModel } from "../state/types";

interface InlineAdBannerProps {
  banner: HeroBannerModel;
  onPress?: (banner: HeroBannerModel) => void;
  className?: string;
}

export function InlineAdBanner({ banner, onPress, className = "" }: InlineAdBannerProps) {
  const canPress =
    Boolean(onPress) &&
    (Boolean(banner.link) || (banner.linkType && banner.linkType !== "none"));
  return (
    <section
      className={`relative h-44 md:h-56 lg:h-72 overflow-hidden rounded-2xl border border-border bg-card ${className}`}
      aria-label="Sponsored promotion"
      onClick={() => {
        if (!canPress) return;
        onPress?.(banner);
      }}
      role={canPress ? "button" : undefined}
      tabIndex={canPress ? 0 : undefined}
      onKeyDown={(event) => {
        if (!canPress) return;
        if (event.key === "Enter" || event.key === " ") {
          event.preventDefault();
          onPress?.(banner);
        }
      }}
    >
      <ImageWithFallback
        src={banner.image}
        alt={banner.title}
        className="absolute inset-0 w-full h-full object-cover"
        loading="lazy"
      />
      <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/25 to-black/10" />
      <div className="relative z-10 h-full px-4 py-4 md:px-5 md:py-5 flex flex-col justify-end">
        <SponsoredBadge size="sm" className="mb-2" />
        <h3 className="text-white text-base md:text-lg">{banner.title}</h3>
        <p className="text-white/85 text-xs md:text-sm mt-1 max-w-xl">{banner.subtitle}</p>
      </div>
    </section>
  );
}
