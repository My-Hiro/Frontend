import React, { useEffect, useMemo, useState } from "react";
import { InlineAdBanner } from "./InlineAdBanner";
import type { HeroBannerModel } from "../state/types";

interface BannerRotatorProps {
  banners: HeroBannerModel[];
  onPress?: (banner: HeroBannerModel) => void;
  className?: string;
  intervalMs?: number;
}

export function BannerRotator({
  banners,
  onPress,
  className = "",
  intervalMs = 5200
}: BannerRotatorProps) {
  const rows = useMemo(() => banners.filter((entry) => Boolean(entry?.image)), [banners]);
  const [index, setIndex] = useState(0);

  useEffect(() => {
    setIndex(0);
  }, [rows.length]);

  useEffect(() => {
    if (rows.length <= 1) {
      return;
    }
    const timer = window.setInterval(() => {
      setIndex((current) => (current + 1) % rows.length);
    }, intervalMs);
    return () => {
      window.clearInterval(timer);
    };
  }, [rows.length, intervalMs]);

  if (rows.length === 0) {
    return null;
  }

  const active = rows[index] ?? rows[0];
  if (!active) {
    return null;
  }

  return (
    <section>
      <InlineAdBanner banner={active} onPress={onPress} className={className} />
      {rows.length > 1 && (
        <div className="flex items-center justify-center gap-2 mt-2" aria-label="Banner indicator">
          {rows.map((entry, dotIndex) => (
            <button
              key={entry.id || `banner-dot-${dotIndex}`}
              type="button"
              className={`rounded-full transition-all min-w-[8px] min-h-[8px] ${
                dotIndex === index ? "w-6 h-2 bg-primary" : "w-2 h-2 bg-muted-foreground/35"
              }`}
              onClick={() => setIndex(dotIndex)}
              aria-label={`Banner ${dotIndex + 1} of ${rows.length}`}
              aria-current={dotIndex === index}
            />
          ))}
        </div>
      )}
    </section>
  );
}

