"use client";

import React, { useEffect, useMemo, useState } from "react";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import { ImageWithFallback } from "@/features/figma/ImageWithFallback";
import { ProductCard } from "@/features/ProductCard";
import { BannerRotator } from "@/features/BannerRotator";
import { SponsoredBadge } from "@/features/SponsoredBadge";
import { VerificationBadge } from "@/features/VerificationBadge";
import { StorePageSkeleton } from "@/features/SkeletonLoaders";
import { discoveryService } from "@/services/discovery.service";
import { useDiscoveryStore } from "@/store/useDiscoveryStore";
import type {
  HeroBannerModel,
  PlacementAudience,
  PlatformCategory,
  ProductCardModel,
  StoreCardModel
} from "@/types";
import {
  ArrowLeft,
  Star,
  Phone,
  Navigation,
  MessageCircle,
  Bookmark,
  Clock,
  MapPin,
  Flag,
  RefreshCw
} from "lucide-react";

type StoreDetailModel = StoreCardModel & {
  banner?: string;
  segments?: string[];
  lastInventoryUpdateIso?: string;
};

type AudienceFilter = "all" | PlacementAudience;

export default function StorePage() {
  const params = useParams();
  const searchParams = useSearchParams();
  const router = useRouter();
  const storeId = params.id as string;
  const entryCategoryId = searchParams.get("categoryId");

  const [store, setStore] = useState<StoreDetailModel | null>(null);
  const [products, setProducts] = useState<ProductCardModel[]>([]);
  const [categories, setCategories] = useState<PlatformCategory[]>([]);
  const [sponsoredBanners, setSponsoredBanners] = useState<HeroBannerModel[]>([]);
  const [loading, setLoading] = useState(true);
  const [saved, setSaved] = useState(false);
  const [toast, setToast] = useState("");
  const [showReportMenu, setShowReportMenu] = useState(false);
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid");
  const [activeSegment, setActiveSegment] = useState<string>("all");
  const [activeSubcategory, setActiveSubcategory] = useState<string>("all");
  const [activeAudience, setActiveAudience] = useState<AudienceFilter>("all");
  const [messageOpen, setMessageOpen] = useState(false);
  const [messageName, setMessageName] = useState("");
  const [messageContact, setMessageContact] = useState("");
  const [messageBody, setMessageBody] = useState("");
  const [messageSending, setMessageSending] = useState(false);
  
  const authSession = useDiscoveryStore((state) => state.session);
  const sessionIdentity =
    authSession?.user.phone_e164?.trim() || authSession?.user.email?.trim() || "";

  useEffect(() => {
    let mounted = true;
    setLoading(true);

    const load = async () => {
      const [cats, storeRaw, storeProducts, banner] = await Promise.all([
        discoveryService.getPlatformCategories(),
        discoveryService.getStore(storeId),
        discoveryService.getStoreProducts(storeId),
        discoveryService.getSponsoredBanners("store_page")
      ]);
      if (!mounted) return;

      setCategories(cats);
      setProducts(storeProducts);
      setSponsoredBanners(banner);

      const detail = storeRaw as StoreDetailModel;
      setStore(detail);

      const initial = entryCategoryId && detail.segments?.includes(entryCategoryId) ? entryCategoryId : "all";
      setActiveSegment(initial);
      setActiveSubcategory("all");
      setActiveAudience("all");
      setLoading(false);

      banner.forEach((entry) => {
        void discoveryService
          .trackEvent({
            type: "impression",
            storeId: detail.id,
            metadata: {
              source: "store_page",
              placement: "store_profile_inline_ad",
              sponsored: true,
              banner_id: entry.id
            }
          })
          .catch(() => undefined);
      });

      void discoveryService
        .trackEvent({
          type: "view",
          storeId,
          metadata: { source: "store_page", entryCategoryId: entryCategoryId ?? null }
        })
        .catch(() => undefined);
    };

    load().catch(() => {
      if (!mounted) return;
      setStore(null);
      setProducts([]);
      setSponsoredBanners([]);
      setLoading(false);
    });

    return () => {
      mounted = false;
    };
  }, [storeId, entryCategoryId]);

  const categoryById = useMemo(() => new Map(categories.map((entry) => [entry.id, entry] as const)), [categories]);

  const segmentCounts = useMemo(() => {
    const counts = new Map<string, number>();
    for (const product of products) {
      for (const placement of product.placements ?? []) {
        counts.set(placement.categoryId, (counts.get(placement.categoryId) ?? 0) + 1);
      }
    }
    return counts;
  }, [products]);

  const segmentChips = useMemo(() => {
    const segments = new Set((store?.segments ?? []).filter(Boolean));
    const orderIndex = new Map(categories.map((category, index) => [category.id, index] as const));
    const ordered = Array.from(segments).sort((a, b) => {
      const ao = orderIndex.get(a) ?? 9999;
      const bo = orderIndex.get(b) ?? 9999;
      if (ao !== bo) {
        return ao - bo;
      }
      return a.localeCompare(b);
    });
    return ordered.map((id) => ({
      id,
      name: categoryById.get(id)?.shortName || categoryById.get(id)?.name || id,
      count: segmentCounts.get(id) ?? 0
    }));
  }, [store?.segments, categories, categoryById, segmentCounts]);

  const subcategoryChips = useMemo(() => {
    if (activeSegment === "all") return [];
    const labels = new Set<string>();
    for (const product of products) {
      const placement = (product.placements ?? []).find((p) => p.categoryId === activeSegment);
      if (placement?.subcategoryLabel) {
        labels.add(placement.subcategoryLabel);
      }
    }
    return Array.from(labels).sort((a, b) => {
      const ap = a.toLowerCase() === "more" ? 1 : 0;
      const bp = b.toLowerCase() === "more" ? 1 : 0;
      if (ap !== bp) {
        return ap - bp;
      }
      return a.localeCompare(b);
    });
  }, [products, activeSegment]);

  const audienceChips = useMemo(
    () =>
      [
        { id: "all" as AudienceFilter, label: "All" },
        { id: "general" as AudienceFilter, label: "General" },
        { id: "men" as AudienceFilter, label: "Men" },
        { id: "women" as AudienceFilter, label: "Women" },
        { id: "boys" as AudienceFilter, label: "Boys" },
        { id: "girls" as AudienceFilter, label: "Girls" }
      ],
    []
  );

  const filteredProducts = useMemo(() => {
    const bySegment =
      activeSegment === "all"
        ? products
        : products.filter((p) => (p.placements ?? []).some((pl) => pl.categoryId === activeSegment));
    const bySubcategory =
      activeSegment === "all" || activeSubcategory === "all"
        ? bySegment
        : bySegment.filter((p) =>
            (p.placements ?? []).some(
              (pl) => pl.categoryId === activeSegment && pl.subcategoryLabel === activeSubcategory
            )
          );

    return bySubcategory.filter((product) => {
      const placements = product.placements ?? [];
      if (placements.length === 0) {
        return activeAudience === "all" || activeAudience === "general";
      }
      return placements.some((placement) => {
        if (activeSegment !== "all" && placement.categoryId !== activeSegment) {
          return false;
        }
        if (
          activeSegment !== "all" &&
          activeSubcategory !== "all" &&
          placement.subcategoryLabel !== activeSubcategory
        ) {
          return false;
        }
        if (activeAudience === "all") {
          return true;
        }
        const placementAudience = placement.audienceLabel ?? "general";
        return placementAudience === activeAudience;
      });
    });
  }, [products, activeSegment, activeSubcategory, activeAudience]);

  const submitMessage = async () => {
    if (!store) {
      setToast("Store not available.");
      window.setTimeout(() => setToast(""), 2200);
      return;
    }
    const text = messageBody.trim();
    if (!text) {
      setToast("Write a message first.");
      window.setTimeout(() => setToast(""), 2200);
      return;
    }

    const normalizedContact = messageContact.trim();
    const recipientIdentity = normalizedContact || sessionIdentity || undefined;

    setMessageSending(true);
    try {
      await discoveryService.sendStoreMessage({
        storeId: store.id,
        senderName: messageName.trim() || undefined,
        senderContact: normalizedContact || undefined,
        recipientIdentity,
        message: text
      });
      setMessageBody("");
      setMessageOpen(false);
      setToast("Message sent to store.");
      window.setTimeout(() => setToast(""), 2400);
    } catch {
      setToast("Could not send message. Try again.");
      window.setTimeout(() => setToast(""), 2400);
    } finally {
      setMessageSending(false);
    }
  };

  if (loading) {
    return (
      <div className="max-w-7xl mx-auto">
        <button
          onClick={() => router.back()}
          className="fixed top-4 left-4 lg:left-auto lg:relative lg:top-auto lg:ml-4 lg:mt-4 z-50 w-10 h-10 bg-card/80 backdrop-blur rounded-full flex items-center justify-center shadow-md min-w-[44px] min-h-[44px]"
          aria-label="Go back"
        >
          <ArrowLeft className="w-5 h-5" />
        </button>
        <StorePageSkeleton />
      </div>
    );
  }

  if (!store) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] px-4">
        <p className="text-muted-foreground mb-4">Store not found</p>
        <button
          onClick={() => router.back()}
          className="px-4 py-2 bg-primary text-primary-foreground rounded-lg min-h-[44px]"
        >
          Go back
        </button>
      </div>
    );
  }

  return (
    <div className="pb-20 lg:pb-8 max-w-7xl mx-auto">
      {toast && (
        <div className="fixed bottom-20 left-1/2 -translate-x-1/2 z-50 bg-foreground text-background text-xs px-3 py-2 rounded-full shadow-lg">
          {toast}
        </div>
      )}
      <div className="relative h-48 md:h-64 lg:h-80 bg-muted">
        <ImageWithFallback
          src={store.banner || store.logo}
          alt={store.name}
          className="w-full h-full object-cover"
          loading="eager"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black/50 to-transparent" />

        {store.isSponsored && (
          <div className="absolute top-3 right-3">
            <SponsoredBadge size="md" />
          </div>
        )}

        <button
          onClick={() => router.back()}
          className="absolute top-4 left-4 w-10 h-10 bg-card/80 backdrop-blur rounded-full flex items-center justify-center shadow-md min-w-[44px] min-h-[44px] z-10"
          aria-label="Go back"
        >
          <ArrowLeft className="w-5 h-5" />
        </button>

        <button
          onClick={() => setShowReportMenu(!showReportMenu)}
          className="absolute top-4 right-4 w-10 h-10 bg-card/80 backdrop-blur rounded-full flex items-center justify-center shadow-md min-w-[44px] min-h-[44px] z-10"
          aria-label="Report this store"
        >
          <Flag className="w-4 h-4" />
        </button>

        {showReportMenu && (
          <div className="absolute top-16 right-4 bg-card rounded-xl shadow-lg border border-border p-2 z-20 min-w-[180px]">
            <button
              className="w-full text-left px-3 py-2 text-sm rounded-lg hover:bg-muted min-h-[40px]"
              onClick={() => {
                setShowReportMenu(false);
                void discoveryService
                  .reportStoreAbuse(store.id, {
                    reason: "Inaccurate store information",
                    details: `Reported from Store page: ${store.name}`
                  })
                  .then(() => setToast("Thanks. Your report was sent."))
                  .catch(() => setToast("Report failed. Please try again."));
                window.setTimeout(() => setToast(""), 2600);
              }}
            >
              Report inaccurate info
            </button>
            <button
              className="w-full text-left px-3 py-2 text-sm rounded-lg hover:bg-muted min-h-[40px]"
              onClick={() => {
                setShowReportMenu(false);
                void discoveryService
                  .reportStoreAbuse(store.id, {
                    reason: "Inappropriate content",
                    details: `Reported from Store page: ${store.name}`
                  })
                  .then(() => setToast("Thanks. Your report was sent."))
                  .catch(() => setToast("Report failed. Please try again."));
                window.setTimeout(() => setToast(""), 2600);
              }}
            >
              Report inappropriate content
            </button>
            <button
              className="w-full text-left px-3 py-2 text-sm rounded-lg hover:bg-muted text-destructive min-h-[40px]"
              onClick={() => {
                setShowReportMenu(false);
                void discoveryService
                  .reportStoreAbuse(store.id, {
                    reason: "Report store",
                    details: `Reported from Store page: ${store.name}`
                  })
                  .then(() => setToast("Thanks. Your report was sent."))
                  .catch(() => setToast("Report failed. Please try again."));
                window.setTimeout(() => setToast(""), 2600);
              }}
            >
              Report this store
            </button>
          </div>
        )}
      </div>

      <div className="px-4 lg:px-6 pt-4 bg-card">
        <div className="lg:flex lg:items-start lg:gap-8">
          <div className="flex-1 min-w-0">
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <div className="flex items-center gap-2">
                  <h1 className="text-xl">{store.name}</h1>
                  <VerificationBadge status={store.verification} showLabel />
                </div>
                <div className="flex items-center gap-3 mt-1.5 text-sm text-muted-foreground">
                  <span className="flex items-center gap-0.5">
                    <Star className="w-4 h-4 fill-amber-400 text-amber-400" />
                    {store.rating}
                  </span>
                  <span
                    className={`text-xs px-2 py-0.5 rounded-full ${
                      store.openNow ? "bg-green-50 text-green-700" : "bg-red-50 text-red-700"
                    }`}
                  >
                    {store.openNow ? "Open now" : "Closed"}
                  </span>
                </div>
              </div>
              <button
                onClick={() => {
                  const next = !saved;
                  setSaved(next);
                  if (next) {
                    void discoveryService
                      .trackEvent({ type: "save", storeId: store.id, metadata: { source: "store_page" } })
                      .catch(() => undefined);
                  }
                }}
                className="w-10 h-10 flex items-center justify-center rounded-full bg-secondary min-w-[44px] min-h-[44px]"
                aria-label={saved ? "Unsave store" : "Save store"}
              >
                <Bookmark
                  className={`w-5 h-5 ${
                    saved ? "fill-primary text-primary" : "text-muted-foreground"
                  }`}
                />
              </button>
            </div>

            {store.description && (
              <p className="text-sm text-muted-foreground mt-2">{store.description}</p>
            )}

            <div className="flex flex-col gap-2 mt-3 text-sm text-muted-foreground">
              {store.address && (
                <div className="flex items-center gap-2">
                  <MapPin className="w-4 h-4 flex-shrink-0" />
                  <span>{store.address}</span>
                </div>
              )}
              {store.hours && (
                <div className="flex items-center gap-2">
                  <Clock className="w-4 h-4 flex-shrink-0" />
                  <span>{store.hours}</span>
                </div>
              )}
              <div className="flex items-center gap-2">
                <RefreshCw className="w-3.5 h-3.5 flex-shrink-0" />
                <span className="text-xs">Last inventory update: {store.lastUpdated}</span>
              </div>
            </div>
          </div>

          <div className="flex gap-3 mt-4 pb-4 lg:flex-col lg:mt-0 lg:w-48 lg:flex-shrink-0">
            <a
              href={store.phone ? `tel:${store.phone}` : undefined}
              className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm min-h-[44px] transition-opacity ${
                store.phone
                  ? "bg-primary text-primary-foreground hover:opacity-90"
                  : "bg-muted text-muted-foreground cursor-not-allowed"
              }`}
              aria-label="Call"
              onClick={(e) => {
                if (!store.phone) e.preventDefault();
                if (store.phone) {
                  void discoveryService
                    .trackEvent({ type: "call", storeId: store.id, metadata: { source: "store_page" } })
                    .catch(() => undefined);
                }
              }}
            >
              <Phone className="w-4 h-4" />
              Call
            </a>
            <button
              className="flex-1 flex items-center justify-center gap-2 py-2.5 bg-secondary text-secondary-foreground rounded-xl text-sm min-h-[44px] transition-opacity hover:opacity-90"
              onClick={() => {
                const query = store.address?.trim()
                  ? store.address
                  : store.name;
                window.open(
                  `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(query)}`,
                  "_blank",
                  "noreferrer"
                );
                void discoveryService
                  .trackEvent({ type: "directions", storeId: store.id, metadata: { source: "store_page" } })
                  .catch(() => undefined);
              }}
            >
              <Navigation className="w-4 h-4" />
              Directions
            </button>
            <button
              type="button"
              className="flex-1 flex items-center justify-center gap-2 py-2.5 bg-muted text-foreground rounded-xl text-sm min-h-[44px] transition-opacity hover:opacity-90"
              onClick={() => {
                setMessageOpen(true);
                void discoveryService
                  .trackEvent({
                    type: "click",
                    storeId: store.id,
                    metadata: { source: "store_page", action: "open_message_modal" }
                  })
                  .catch(() => undefined);
              }}
            >
              <MessageCircle className="w-4 h-4" />
              Message
            </button>
          </div>
        </div>
      </div>

      {sponsoredBanners.length > 0 && (
        <div className="px-4 lg:px-6 pt-1 pb-3">
            <BannerRotator
              banners={sponsoredBanners}
              onPress={(banner: any) => {
                if (banner.link) {
                  window.open(banner.link, "_blank", "noopener,noreferrer");
                } else if (banner.linkType === 'discovery_store' && banner.linkTarget) {
                  router.push(`/store/${banner.linkTarget}`);
                } else if (banner.linkType === 'discovery_product' && banner.linkTarget) {
                  router.push(`/product/${banner.linkTarget}`);
                }
                void discoveryService
                  .trackEvent({
                  type: "click",
                  storeId: store.id,
                  metadata: {
                    source: "store_page",
                    placement: "store_profile_inline_ad",
                    sponsored: true,
                    banner_id: banner.id
                  }
                })
                .catch(() => undefined);
            }}
          />
        </div>
      )}

      <div className="sticky top-0 z-20 bg-card border-b border-t border-border">
        <div
          className="flex gap-2 px-4 lg:px-6 py-3 overflow-x-auto max-w-7xl"
          style={{ scrollbarWidth: "none", msOverflowStyle: "none" }}
          role="tablist"
          aria-label="Store segments"
        >
          <button
            onClick={() => {
              setActiveSegment("all");
              setActiveSubcategory("all");
              setActiveAudience("all");
            }}
            className={`px-3 py-1.5 rounded-full text-xs whitespace-nowrap min-h-[32px] transition-colors ${
              activeSegment === "all"
                ? "bg-primary text-primary-foreground"
                : "bg-muted text-muted-foreground"
            }`}
            role="tab"
            aria-selected={activeSegment === "all"}
          >
            All ({products.length})
          </button>

          {segmentChips.map((segment) => (
            <button
              key={segment.id}
              onClick={() => {
                setActiveSegment(segment.id);
                setActiveSubcategory("all");
                setActiveAudience("all");
              }}
              className={`px-3 py-1.5 rounded-full text-xs whitespace-nowrap min-h-[32px] transition-colors ${
                activeSegment === segment.id
                  ? "bg-primary text-primary-foreground"
                  : "bg-muted text-muted-foreground"
              }`}
              role="tab"
              aria-selected={activeSegment === segment.id}
              title={categoryById.get(segment.id)?.name ?? segment.id}
            >
              {segment.name} ({segment.count})
            </button>
          ))}
        </div>

        {activeSegment !== "all" && subcategoryChips.length > 0 && (
          <div
            className="flex gap-2 px-4 lg:px-6 pb-3 overflow-x-auto"
            style={{ scrollbarWidth: "none", msOverflowStyle: "none" }}
            role="tablist"
            aria-label="Segment subcategories"
          >
            <button
              onClick={() => setActiveSubcategory("all")}
              className={`px-3 py-1.5 rounded-full text-xs whitespace-nowrap min-h-[32px] transition-colors ${
                activeSubcategory === "all"
                  ? "bg-secondary text-secondary-foreground"
                  : "bg-muted text-muted-foreground"
              }`}
              role="tab"
              aria-selected={activeSubcategory === "all"}
            >
              All in {categoryById.get(activeSegment)?.shortName || categoryById.get(activeSegment)?.name || "segment"}
            </button>
              {subcategoryChips.map((label) => (
                <button
                  key={label}
                  onClick={() => {
                    setActiveSubcategory(label);
                    setActiveAudience("all");
                  }}
                  className={`px-3 py-1.5 rounded-full text-xs whitespace-nowrap min-h-[32px] transition-colors ${
                    activeSubcategory === label
                      ? "bg-secondary text-secondary-foreground"
                    : "bg-muted text-muted-foreground"
                }`}
                role="tab"
                aria-selected={activeSubcategory === label}
              >
                {label}
              </button>
            ))}
          </div>
        )}

        <div className="px-4 lg:px-6 pb-1">
          <small className="text-[11px] uppercase tracking-wide text-muted-foreground">Audience</small>
        </div>
        <div className="border-t border-border">
          <div
            className="flex gap-2 px-4 lg:px-6 pt-2 pb-3 overflow-x-auto"
            style={{ scrollbarWidth: "none", msOverflowStyle: "none" }}
            role="tablist"
            aria-label="Audience filter"
          >
            {audienceChips.map((audience) => (
              <button
                key={audience.id}
                onClick={() => setActiveAudience(audience.id)}
                className={`px-3 py-1.5 rounded-full text-xs whitespace-nowrap min-h-[32px] transition-colors ${
                  activeAudience === audience.id
                    ? "bg-foreground text-background"
                    : "bg-muted text-muted-foreground"
                }`}
                role="tab"
                aria-selected={activeAudience === audience.id}
              >
                {audience.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="px-4 lg:px-6 pt-4">
        <div className="flex items-center justify-between mb-3">
          <p className="text-sm text-muted-foreground">
            {filteredProducts.length} item{filteredProducts.length !== 1 ? "s" : ""}
          </p>
          <div className="flex gap-1">
            <button
              onClick={() => setViewMode("grid")}
              className={`p-1.5 rounded min-w-[32px] min-h-[32px] ${viewMode === "grid" ? "bg-secondary" : ""}`}
              aria-label="Grid view"
            >
              <svg className="w-4 h-4" viewBox="0 0 16 16" fill="currentColor">
                <rect x="1" y="1" width="6" height="6" rx="1" />
                <rect x="9" y="1" width="6" height="6" rx="1" />
                <rect x="1" y="9" width="6" height="6" rx="1" />
                <rect x="9" y="9" width="6" height="6" rx="1" />
              </svg>
            </button>
            <button
              onClick={() => setViewMode("list")}
              className={`p-1.5 rounded min-w-[32px] min-h-[32px] ${viewMode === "list" ? "bg-secondary" : ""}`}
              aria-label="List view"
            >
              <svg className="w-4 h-4" viewBox="0 0 16 16" fill="currentColor">
                <rect x="1" y="1" width="14" height="4" rx="1" />
                <rect x="1" y="7" width="14" height="4" rx="1" />
                <rect x="1" y="13" width="14" height="2" rx="1" />
              </svg>
            </button>
          </div>
        </div>

        {viewMode === "grid" ? (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3">
            {filteredProducts.map((product) => (
              <ProductCard
                key={product.id}
                product={product}
                onPress={(productId: string) => router.push(`/product/${productId}`)}
                variant="grid"
              />
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
            {filteredProducts.map((product) => (
              <ProductCard
                key={product.id}
                product={product}
                onPress={(productId: string) => router.push(`/product/${productId}`)}
                variant="list"
              />
            ))}
          </div>
        )}
      </div>

      {messageOpen && (
        <div
          className="fixed inset-0 flex items-end sm:items-center justify-center p-3"
          style={{ background: "rgba(15, 23, 42, 0.45)", zIndex: 320 }}
          onClick={() => {
            if (messageSending) return;
            setMessageOpen(false);
          }}
        >
          <div
            className="w-full max-w-md bg-card border border-border rounded-2xl p-4 shadow-xl"
            onClick={(event) => event.stopPropagation()}
          >
            <h3 className="text-base text-foreground">Message {store.name}</h3>
            <p className="text-xs text-muted-foreground mt-1">
              Send a quick message to this store. They can reply in their merchant inbox.
            </p>
            <div className="grid gap-2 mt-3">
              <input
                value={messageName}
                onChange={(event) => setMessageName(event.target.value)}
                placeholder="Your name (optional)"
                className="w-full px-3 py-2.5 rounded-xl bg-input-background text-sm"
              />
              <input
                value={messageContact}
                onChange={(event) => setMessageContact(event.target.value)}
                placeholder="Phone or email (optional)"
                className="w-full px-3 py-2.5 rounded-xl bg-input-background text-sm"
              />
              <textarea
                value={messageBody}
                onChange={(event) => setMessageBody(event.target.value)}
                rows={4}
                placeholder="Type your message..."
                className="w-full px-3 py-2.5 rounded-xl bg-input-background text-sm resize-none"
              />
            </div>
            <div className="flex gap-2 mt-3">
              <button
                type="button"
                className="flex-1 rounded-xl border border-border px-4 py-2.5 text-sm min-h-[44px]"
                onClick={() => setMessageOpen(false)}
                disabled={messageSending}
              >
                Cancel
              </button>
              <button
                type="button"
                className="flex-1 rounded-xl bg-primary text-primary-foreground px-4 py-2.5 text-sm min-h-[44px] disabled:opacity-70"
                onClick={() => void submitMessage()}
                disabled={messageSending}
              >
                {messageSending ? "Sending..." : "Send message"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
