import React, { useEffect, useState } from "react";
import { ImageWithFallback } from "./figma/ImageWithFallback";
import { BannerRotator } from "./BannerRotator";
import { StockBadge } from "./StockBadge";
import { VerificationBadge } from "./VerificationBadge";
import { discoveryApi, discoveryAuthApi } from "../state/api";
import type { HeroBannerModel, ProductCardModel, StoreCardModel } from "../state/types";
import {
  ArrowLeft,
  Phone,
  Navigation,
  MessageCircle,
  Bookmark,
  MapPin,
  Clock,
  Bell,
  Star,
  Flag,
  X
} from "lucide-react";

interface ProductDetailPageProps {
  productId: string;
  onBack: () => void;
  onStorePress: (storeId: string, entryCategoryId?: string) => void;
  onBannerPress?: (banner: HeroBannerModel) => void;
}

export function ProductDetailPage({
  productId,
  onBack,
  onStorePress,
  onBannerPress
}: ProductDetailPageProps) {
  const [showFullImage, setShowFullImage] = useState(false);
  const [saved, setSaved] = useState(false);
  const [requestSent, setRequestSent] = useState(false);
  const [loading, setLoading] = useState(true);
  const [product, setProduct] = useState<ProductCardModel | null>(null);
  const [store, setStore] = useState<StoreCardModel | null>(null);
  const [sponsoredBanners, setSponsoredBanners] = useState<HeroBannerModel[]>([]);
  const [toast, setToast] = useState("");
  const [alsoAvailableAt, setAlsoAvailableAt] = useState<
    Array<{ storeId: string; name: string; distance: string }>
  >([]);
  const [messageOpen, setMessageOpen] = useState(false);
  const [messageName, setMessageName] = useState("");
  const [messageContact, setMessageContact] = useState("");
  const [messageBody, setMessageBody] = useState("");
  const [messageSending, setMessageSending] = useState(false);
  const authSession = discoveryAuthApi.getSession();
  const sessionIdentity =
    authSession?.user.phone_e164?.trim() || authSession?.user.email?.trim() || "";

  useEffect(() => {
    let mounted = true;
    setLoading(true);
    const load = async () => {
      const [result, banner] = await Promise.all([
        discoveryApi.getProduct(productId),
        discoveryApi.getSponsoredBanners("product_page")
      ]);

      if (!mounted) return;
      setSponsoredBanners(banner);

      if (!result) {
        setProduct(null);
        setStore(null);
        setAlsoAvailableAt([]);
        return;
      }

      setProduct(result.product);
      setAlsoAvailableAt(result.alsoAvailableAt);

      // Prefer the richer store endpoint for phone/verification.
      if (result.product.storeId) {
        try {
          const storeDetail = await discoveryApi.getStore(result.product.storeId);
          if (!mounted) return;
          setStore(storeDetail);
        } catch {
          setStore(result.store);
        }
      } else {
        setStore(result.store);
      }

      void discoveryApi
        .trackEvent({
          type: "view",
          storeId: result.product.storeId || undefined,
          itemId: result.product.id,
          metadata: { source: "product_page" }
        })
        .catch(() => undefined);

      if (banner.length > 0) {
        banner.forEach((entry) => {
          void discoveryApi
            .trackEvent({
              type: "impression",
              storeId: result.product.storeId || undefined,
              metadata: {
                source: "product_page",
                placement: "product_top_inline_ad",
                sponsored: true,
                banner_id: entry.id
              }
            })
            .catch(() => undefined);
        });
      }
    };

    load()
      .catch(() => {
        if (!mounted) return;
        setProduct(null);
        setStore(null);
        setAlsoAvailableAt([]);
        setSponsoredBanners([]);
      })
      .finally(() => {
        if (!mounted) return;
        setLoading(false);
      });

    return () => {
      mounted = false;
    };
  }, [productId]);

  const submitMessage = async () => {
    if (!store) {
      setToast("Store information unavailable.");
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
      await discoveryApi.sendStoreMessage({
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
      <div className="min-h-screen bg-background">
        <button
          onClick={onBack}
          className="fixed top-4 left-4 z-50 w-10 h-10 bg-card/80 backdrop-blur rounded-full flex items-center justify-center shadow-md min-w-[44px] min-h-[44px]"
          aria-label="Go back"
        >
          <ArrowLeft className="w-5 h-5" />
        </button>
        <div className="flex items-center justify-center min-h-[60vh]">
          <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin" />
        </div>
      </div>
    );
  }

  if (!product) {
    return (
      <div className="min-h-screen bg-background">
        <button
          onClick={onBack}
          className="fixed top-4 left-4 z-50 w-10 h-10 bg-card/80 backdrop-blur rounded-full flex items-center justify-center shadow-md min-w-[44px] min-h-[44px]"
          aria-label="Go back"
        >
          <ArrowLeft className="w-5 h-5" />
        </button>
        <div className="flex items-center justify-center min-h-[60vh] px-4">
          <p className="text-muted-foreground">Product not found</p>
        </div>
      </div>
    );
  }

  return (
    <div className="pb-24 lg:pb-8 bg-background max-w-7xl mx-auto">
      {toast && (
        <div className="fixed bottom-20 left-1/2 -translate-x-1/2 z-50 bg-foreground text-background text-xs px-3 py-2 rounded-full shadow-lg">
          {toast}
        </div>
      )}
      {showFullImage && (
        <div
          className="fixed inset-0 z-[100] bg-black flex items-center justify-center"
          onClick={() => setShowFullImage(false)}
          role="dialog"
          aria-label="Product image fullscreen"
        >
          <button
            onClick={() => setShowFullImage(false)}
            className="absolute top-4 right-4 w-10 h-10 bg-white/20 rounded-full flex items-center justify-center min-w-[44px] min-h-[44px]"
            aria-label="Close fullscreen"
          >
            <X className="w-5 h-5 text-white" />
          </button>
          <ImageWithFallback
            src={product.image}
            alt={product.name}
            className="max-w-full max-h-full object-contain"
          />
        </div>
      )}

      <div className="px-4 lg:px-6 pt-4">
        <button
          onClick={onBack}
          className="w-10 h-10 bg-card border border-border rounded-full flex items-center justify-center shadow-sm min-w-[44px] min-h-[44px]"
          aria-label="Go back"
        >
          <ArrowLeft className="w-5 h-5" />
        </button>
      </div>

      {sponsoredBanners.length > 0 && (
        <div className="px-4 lg:px-6 pt-3">
          <BannerRotator
            banners={sponsoredBanners}
            onPress={(banner) => {
              if (onBannerPress) {
                onBannerPress(banner);
              } else if (banner.link) {
                window.open(banner.link, "_blank", "noopener,noreferrer");
              }
              void discoveryApi
                .trackEvent({
                  type: "click",
                  storeId: product.storeId || undefined,
                  itemId: product.id,
                  metadata: {
                    source: "product_page",
                    placement: "product_top_inline_ad",
                    sponsored: true,
                    banner_id: banner.id
                  }
                })
                .catch(() => undefined);
            }}
          />
        </div>
      )}

      <div className="lg:flex lg:gap-8 lg:px-6 lg:pt-6">
        <div className="relative lg:w-1/2 xl:w-2/5 lg:flex-shrink-0">
          <button
            onClick={() => setShowFullImage(true)}
            className="w-full aspect-square bg-muted lg:rounded-2xl lg:overflow-hidden"
            aria-label="View full image"
          >
            <ImageWithFallback
              src={product.image}
              alt={product.name}
              className="w-full h-full object-cover"
              loading="eager"
            />
          </button>

          <button
            onClick={() => setSaved(!saved)}
            className="absolute top-4 right-4 w-10 h-10 bg-card/80 backdrop-blur rounded-full flex items-center justify-center shadow-md min-w-[44px] min-h-[44px]"
            aria-label={saved ? "Unsave product" : "Save product"}
          >
            <Bookmark className={`w-5 h-5 ${saved ? "fill-primary text-primary" : ""}`} />
          </button>

          <div className="absolute bottom-3 left-3 lg:bottom-5 lg:left-5">
            <StockBadge status={product.availability} lastUpdated={product.lastUpdated} stockCount={product.stockCount} showDetail />
          </div>
        </div>

        <div className="lg:flex-1 lg:min-w-0">
          <div className="px-4 lg:px-0 pt-4 bg-card lg:bg-transparent">
            <h1 className="text-lg lg:text-xl">{product.name}</h1>
            <div className="flex items-center gap-3 mt-2">
              <span className="text-xl text-primary">{product.priceRange || product.price}</span>
              {product.availability === "price-on-request" && (
                <span className="text-xs text-muted-foreground bg-muted px-2 py-0.5 rounded-full">
                  Call for price
                </span>
              )}
            </div>

            {product.description && (
              <p className="text-sm text-muted-foreground mt-3 leading-relaxed">{product.description}</p>
            )}

            {product.availability === "out-of-stock" && !requestSent && (
              <button
                onClick={() => {
                  setRequestSent(true);
                  void discoveryApi
                    .trackEvent({
                      type: "request",
                      storeId: product.storeId || undefined,
                      itemId: product.id,
                      metadata: { source: "product_page" }
                    })
                    .catch(() => undefined);
                }}
                className="w-full mt-4 py-3 bg-secondary text-secondary-foreground rounded-xl text-sm min-h-[44px] flex items-center justify-center gap-2"
              >
                <Bell className="w-4 h-4" />
                Request this item - Get notified when available
              </button>
            )}
            {requestSent && (
              <div className="mt-4 p-3 bg-green-50 text-green-700 rounded-xl text-sm flex items-center gap-2">
                <Bell className="w-4 h-4" />
                Request saved! We'll notify you when this item is available.
              </div>
            )}
          </div>

          <div className="mx-4 lg:mx-0 mt-3 bg-card rounded-xl border border-border p-4">
            <h3 className="text-sm text-muted-foreground mb-3">Available at</h3>
            {store ? (
              <>
                <button
                  onClick={() => onStorePress(store.id)}
                  className="flex items-center gap-3 w-full text-left"
                >
                  <ImageWithFallback
                    src={store.logo}
                    alt={store.name}
                    className="w-12 h-12 rounded-lg object-cover flex-shrink-0"
                    loading="lazy"
                  />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1.5">
                      <span className="text-sm">{store.name}</span>
                      <VerificationBadge status={store.verification} />
                    </div>
                    <div className="flex items-center gap-2 text-[11px] text-muted-foreground mt-0.5">
                      <span className="flex items-center gap-0.5">
                        <Star className="w-3 h-3 fill-amber-400 text-amber-400" />
                        {store.rating || 0}
                      </span>
                      {store.distance && (
                        <span className="flex items-center gap-0.5">
                          <MapPin className="w-3 h-3" />
                          {store.distance}
                        </span>
                      )}
                      <span className={store.openNow ? "text-green-600" : "text-red-500"}>
                        {store.openNow ? "Open now" : "Closed"}
                      </span>
                    </div>
                  </div>
                </button>

                {(store.address || store.hours) && (
                  <div className="text-sm text-muted-foreground mt-3">
                    {store.address && (
                      <div className="flex items-center gap-2">
                        <MapPin className="w-3.5 h-3.5 flex-shrink-0" />
                        <span className="text-xs">{store.address}</span>
                      </div>
                    )}
                    {store.hours && (
                      <div className="flex items-center gap-2 mt-1">
                        <Clock className="w-3.5 h-3.5 flex-shrink-0" />
                        <span className="text-xs">{store.hours}</span>
                      </div>
                    )}
                  </div>
                )}

                <div className="flex gap-3 mt-4">
                  <a
                    href={store.phone ? `tel:${store.phone}` : undefined}
                    className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm min-h-[44px] ${
                      store.phone
                        ? "bg-primary text-primary-foreground"
                        : "bg-muted text-muted-foreground cursor-not-allowed"
                    }`}
                    onClick={(e) => {
                      if (!store.phone) e.preventDefault();
                      if (store.phone) {
                        void discoveryApi
                          .trackEvent({ type: "call", storeId: store.id, metadata: { source: "product_page" } })
                          .catch(() => undefined);
                      }
                    }}
                  >
                    <Phone className="w-4 h-4" />
                    Call
                  </a>
                  <button
                    className="flex-1 flex items-center justify-center gap-2 py-2.5 bg-secondary text-secondary-foreground rounded-xl text-sm min-h-[44px]"
                    onClick={() => {
                      const query = store.address?.trim() ? store.address : store.name;
                      window.open(
                        `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(query)}`,
                        "_blank",
                        "noreferrer"
                      );
                      void discoveryApi
                        .trackEvent({ type: "directions", storeId: store.id, metadata: { source: "product_page" } })
                        .catch(() => undefined);
                    }}
                  >
                    <Navigation className="w-4 h-4" />
                    Directions
                  </button>
                  <button
                    type="button"
                    className="flex-1 flex items-center justify-center gap-2 py-2.5 bg-muted text-foreground rounded-xl text-sm min-h-[44px]"
                    onClick={() => {
                      setMessageOpen(true);
                      void discoveryApi
                        .trackEvent({
                          type: "click",
                          storeId: store.id,
                          itemId: product.id,
                          metadata: { source: "product_page", action: "open_message_modal" }
                        })
                        .catch(() => undefined);
                    }}
                  >
                    <MessageCircle className="w-4 h-4" />
                    Message
                  </button>
                </div>
              </>
            ) : (
              <p className="text-sm text-muted-foreground">Store information unavailable</p>
            )}
          </div>

          {alsoAvailableAt.length > 0 && (
            <div className="mx-4 lg:mx-0 mt-3 bg-card rounded-xl border border-border p-4">
              <h3 className="text-sm text-muted-foreground mb-3">
                Also available at {alsoAvailableAt.length} other store{alsoAvailableAt.length !== 1 ? "s" : ""}
              </h3>
              <div className="space-y-2">
                {alsoAvailableAt.map((entry) => (
                  <button
                    key={entry.storeId}
                    onClick={() => onStorePress(entry.storeId)}
                    className="flex items-center justify-between gap-3 p-3 bg-muted/30 rounded-xl border border-border/60 w-full text-left min-h-[56px] hover:bg-muted/50 transition-colors"
                  >
                    <div className="min-w-0">
                      <p className="text-sm truncate">{entry.name}</p>
                      <p className="text-[11px] text-muted-foreground">{entry.distance}</p>
                    </div>
                    <span className="text-xs text-primary px-2 py-1.5 bg-secondary rounded-lg flex-shrink-0">
                      View store
                    </span>
                  </button>
                ))}
              </div>
            </div>
          )}

          <div className="mx-4 lg:mx-0 mt-3 mb-4">
            <button
              className="flex items-center gap-2 text-xs text-muted-foreground py-2 min-h-[44px]"
              onClick={() => {
                if (!product.storeId) {
                  setToast("Report failed. Store info unavailable.");
                  window.setTimeout(() => setToast(""), 2600);
                  return;
                }
                void discoveryApi
                  .reportStoreAbuse(product.storeId, {
                    productId: product.id,
                    reason: "Inaccurate product information",
                    details: `Reported from Product page: ${product.name}`
                  })
                  .then(() => setToast("Thanks. Your report was sent."))
                  .catch(() => setToast("Report failed. Please try again."));
                window.setTimeout(() => setToast(""), 2600);
              }}
            >
              <Flag className="w-3.5 h-3.5" />
              Report inaccurate information
            </button>
          </div>
        </div>
      </div>

      {messageOpen && store && (
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
              Send a message and the store can reply from merchant inbox.
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

      {store && (
        <div className="fixed bottom-0 left-0 right-0 z-30 bg-card border-t border-border px-4 py-3 pb-4 lg:hidden">
          <div className="flex gap-3 max-w-lg mx-auto">
            <a
              href={store.phone ? `tel:${store.phone}` : undefined}
              className={`flex-1 flex items-center justify-center gap-2 py-3 rounded-xl text-sm min-h-[48px] ${
                store.phone
                  ? "bg-primary text-primary-foreground"
                  : "bg-muted text-muted-foreground cursor-not-allowed"
              }`}
              onClick={(e) => {
                if (!store.phone) e.preventDefault();
                if (store.phone) {
                  void discoveryApi
                    .trackEvent({ type: "call", storeId: store.id, metadata: { source: "product_page_bottom" } })
                    .catch(() => undefined);
                }
              }}
            >
              <Phone className="w-4 h-4" />
              Call Store
            </a>
            <button
              className="flex-1 flex items-center justify-center gap-2 py-3 bg-secondary text-secondary-foreground rounded-xl text-sm min-h-[48px]"
              onClick={() => {
                const query = store.address?.trim() ? store.address : store.name;
                window.open(
                  `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(query)}`,
                  "_blank",
                  "noreferrer"
                );
                void discoveryApi
                  .trackEvent({ type: "directions", storeId: store.id, metadata: { source: "product_page_bottom" } })
                  .catch(() => undefined);
              }}
            >
              <Navigation className="w-4 h-4" />
              Get Directions
            </button>
            <button
              type="button"
              className="flex-1 flex items-center justify-center gap-2 py-3 bg-muted text-foreground rounded-xl text-sm min-h-[48px]"
              onClick={() => setMessageOpen(true)}
            >
              <MessageCircle className="w-4 h-4" />
              Message
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
