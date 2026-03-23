"use client";

import React, { useState } from "react";
import { Star, MapPin, Clock, Phone, Navigation, Bookmark } from "lucide-react";
import { ImageWithFallback } from "./figma/ImageWithFallback";
import { SponsoredBadge } from "./SponsoredBadge";
import { VerificationBadge } from "./VerificationBadge";
import type { StoreCardModel } from "../state/types";

interface StoreCardProps {
  store: StoreCardModel;
  onPress: (storeId: string) => void;
  variant?: "default" | "compact" | "list";
}

export function StoreCard({ store, onPress, variant = "default" }: StoreCardProps) {
  const [showActions, setShowActions] = useState(false);
  const [saved, setSaved] = useState(false);

  const handleLongPress = () => setShowActions(true);

  let pressTimer: ReturnType<typeof setTimeout>;
  const onTouchStart = () => {
    pressTimer = setTimeout(handleLongPress, 500);
  };
  const onTouchEnd = () => {
    clearTimeout(pressTimer);
  };

  if (variant === "compact") {
    return (
      <button
        onClick={() => onPress(store.id)}
        className="flex items-center gap-3 p-3 bg-card rounded-xl border border-border w-full text-left min-h-[56px] transition-shadow hover:shadow-sm active:bg-muted focus-visible:ring-2 focus-visible:ring-primary"
        aria-label={`View ${store.name}`}
      >
        <ImageWithFallback
          src={store.logo}
          alt={store.name}
          className="w-10 h-10 rounded-lg object-cover flex-shrink-0"
          loading="lazy"
        />
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1">
            <span className="text-sm truncate">{store.name}</span>
            <VerificationBadge status={store.verification} />
          </div>
          <div className="flex items-center gap-2 text-[11px] text-muted-foreground mt-0.5">
            <span className="flex items-center gap-0.5">
              <Star className="w-3 h-3 fill-amber-400 text-amber-400" />
              {store.rating}
            </span>
            <span>{store.distance}</span>
            <span className={store.openNow ? "text-green-600" : "text-red-500"}>
              {store.openNow ? "Open" : "Closed"}
            </span>
          </div>
        </div>
        {store.isSponsored && <SponsoredBadge size="sm" />}
      </button>
    );
  }

  return (
    <div className="relative">
      <button
        onClick={() => onPress(store.id)}
        onTouchStart={onTouchStart}
        onTouchEnd={onTouchEnd}
        onMouseDown={onTouchStart}
        onMouseUp={onTouchEnd}
        onMouseLeave={onTouchEnd}
        className={`flex bg-card rounded-xl border border-border overflow-hidden w-full h-full text-left transition-shadow hover:shadow-md active:shadow-sm focus-visible:ring-2 focus-visible:ring-primary ${
          variant === "list" ? "flex-row" : "flex-col"
        }`}
        aria-label={`View ${store.name} - ${store.distance} away - Rating ${store.rating}`}
      >
        <div className="relative w-full h-28 md:h-36 bg-muted">
          <ImageWithFallback
            src={store.logo}
            alt={store.name}
            className="w-full h-full object-cover"
            loading="lazy"
          />
          {store.isSponsored && (
            <div className="absolute top-2 left-2">
              <SponsoredBadge size="sm" />
            </div>
          )}
          <div className="absolute top-2 right-2">
            <span
              className={`text-[10px] px-1.5 py-0.5 rounded-full ${
                store.openNow
                  ? "bg-green-100 text-green-700"
                  : "bg-red-100 text-red-700"
              }`}
            >
              {store.openNow ? "Open" : "Closed"}
            </span>
          </div>
        </div>
        <div className="p-3 flex-1">
          <div className="flex items-center gap-1 mb-1">
            <h3 className="text-sm truncate flex-1">{store.name}</h3>
            <VerificationBadge status={store.verification} />
          </div>
          <p className="text-[11px] text-muted-foreground truncate mb-2">
            {(store.description || "Nearby store").slice(0, 60)}...
          </p>
          <div className="flex items-center gap-2 text-[11px] text-muted-foreground">
            <span className="flex items-center gap-0.5">
              <Star className="w-3 h-3 fill-amber-400 text-amber-400" />
              {store.rating}
            </span>
            <span className="flex items-center gap-0.5">
              <MapPin className="w-3 h-3" />
              {store.distance}
            </span>
            <span className="flex items-center gap-0.5">
              <Clock className="w-3 h-3" />
              {store.eta}
            </span>
          </div>
        </div>
      </button>

      {/* Long-press quick actions overlay */}
      {showActions && (
        <div
          className="absolute inset-0 bg-foreground/80 rounded-xl flex items-center justify-center gap-4 z-10 backdrop-blur-sm"
          onClick={() => setShowActions(false)}
          role="dialog"
          aria-label="Quick actions"
        >
          <button
            onClick={(e) => {
              e.stopPropagation();
              window.open(`tel:${store.phone}`);
              setShowActions(false);
            }}
            className="flex flex-col items-center gap-1 text-white min-w-[44px] min-h-[44px] justify-center"
            aria-label="Call store"
          >
            <Phone className="w-5 h-5" />
            <span className="text-[10px]">Call</span>
          </button>
          <button
            onClick={(e) => {
              e.stopPropagation();
              setShowActions(false);
            }}
            className="flex flex-col items-center gap-1 text-white min-w-[44px] min-h-[44px] justify-center"
            aria-label="Get directions"
          >
            <Navigation className="w-5 h-5" />
            <span className="text-[10px]">Directions</span>
          </button>
          <button
            onClick={(e) => {
              e.stopPropagation();
              setSaved(!saved);
              setShowActions(false);
            }}
            className="flex flex-col items-center gap-1 text-white min-w-[44px] min-h-[44px] justify-center"
            aria-label={saved ? "Unsave store" : "Save store"}
          >
            <Bookmark className={`w-5 h-5 ${saved ? "fill-white" : ""}`} />
            <span className="text-[10px]">{saved ? "Saved" : "Save"}</span>
          </button>
        </div>
      )}
    </div>
  );
}

