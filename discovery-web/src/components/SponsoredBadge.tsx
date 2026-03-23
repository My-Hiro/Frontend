"use client";

import React, { useState } from "react";
import { Info } from "lucide-react";

interface SponsoredBadgeProps {
  className?: string;
  size?: "sm" | "md";
  whyThisAd?: string;
}

export function SponsoredBadge({ className = "", size = "sm", whyThisAd }: SponsoredBadgeProps) {
  const [showTooltip, setShowTooltip] = useState(false);

  return (
    <div className={`relative inline-flex items-center ${className}`}>
      <span
        className={`inline-flex items-center gap-1 rounded-sm bg-ad-accent-light text-ad-accent ${
          size === "sm" ? "px-1.5 py-0.5 text-[10px]" : "px-2 py-0.5 text-xs"
        }`}
        role="status"
        aria-label="Sponsored content"
      >
        Sponsored
        <span
          onClick={(e) => {
            e.stopPropagation();
            setShowTooltip(!showTooltip);
          }}
          onKeyDown={(e) => {
            if (e.key === "Enter" || e.key === " ") {
              e.preventDefault();
              e.stopPropagation();
              setShowTooltip(!showTooltip);
            }
          }}
          role="button"
          tabIndex={0}
          className="inline-flex items-center justify-center min-w-[16px] min-h-[16px] cursor-pointer"
          aria-label="Why am I seeing this?"
        >
          <Info className="w-3 h-3" />
        </span>
      </span>
      {showTooltip && (
        <div
          className="absolute bottom-full left-0 mb-1 bg-foreground text-background text-[11px] px-3 py-2 rounded-lg shadow-lg z-50 w-48"
          role="tooltip"
        >
          <p>
            {whyThisAd?.trim()
              ? whyThisAd
              : "This is a paid placement from a verified merchant. It is shown because it matches your search or browsing context."}
          </p>
          <span
            onClick={(e) => {
              e.stopPropagation();
              setShowTooltip(false);
            }}
            onKeyDown={(e) => {
              if (e.key === "Enter" || e.key === " ") {
                e.preventDefault();
                e.stopPropagation();
                setShowTooltip(false);
              }
            }}
            role="button"
            tabIndex={0}
            className="mt-1 text-primary-foreground underline text-[10px] cursor-pointer"
          >
            Dismiss
          </span>
        </div>
      )}
    </div>
  );
}

