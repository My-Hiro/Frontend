import React from "react";
import { ArrowRight, Store, Zap } from "lucide-react";

const defaultMerchantUrl = "http://localhost:5173";
const onboardingImageSrc = `${import.meta.env.BASE_URL}images/merchant-onboarding.png`;
const fallbackOnboardingImageSrc = `${import.meta.env.BASE_URL}images/merchant-onboarding.webp`;

export function MerchantCtaCard() {
  const merchantUrl =
    (import.meta.env.VITE_MERCHANT_URL as string | undefined) ??
    defaultMerchantUrl;

  const debugCta =
    typeof window !== "undefined" &&
    new URLSearchParams(window.location.search).get("debugCta") === "1";

  const photoWidth = "clamp(132px, 31vw, 360px)";
  const tipBlurWidthPx = 4;
  const featherIntoCardPx = 2;

  return (
    <section aria-label="Merchant onboarding" className="mt-5 mx-4 lg:mx-6">
      <div className="relative overflow-hidden rounded-2xl bg-card border border-border transition-shadow hover:shadow-md active:shadow-sm">
        <div
          aria-hidden="true"
          className="absolute inset-0"
          style={{
            pointerEvents: "none",
            background:
              "radial-gradient(700px circle at 0% 0%, rgba(79,70,229,0.14) 0%, transparent 60%), radial-gradient(700px circle at 100% 0%, rgba(16,185,129,0.10) 0%, transparent 55%)"
          }}
        />

        <div className="relative">
          <div
            className="relative p-4 md:p-5 flex flex-col gap-4"
            style={{
              minWidth: 0,
              paddingRight: `calc(${photoWidth} + 12px)`,
              zIndex: 3
            }}
          >
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 rounded-xl bg-primary text-primary-foreground flex items-center justify-center shadow-md">
                <Store className="w-5 h-5" aria-hidden="true" />
              </div>
              <div className="max-w-xl">
                <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-secondary text-primary text-[11px]">
                  <Zap className="w-3.5 h-3.5" aria-hidden="true" />
                  Merchant onboarding
                </div>
                <h2 className="mt-2 text-base md:text-lg text-foreground">
                  Have a store or want to sell on the platform?
                </h2>
                <p className="mt-1 text-xs md:text-sm text-muted-foreground">
                  Connect your inventory once. Discovery updates automatically as
                  you sell, so customers see what is available now.
                </p>

                <div className="mt-3 flex flex-wrap gap-2">
                  <span className="inline-flex items-center px-3 py-1 rounded-full bg-muted text-foreground text-[11px]">
                    Realtime availability
                  </span>
                  <span className="inline-flex items-center px-3 py-1 rounded-full bg-muted text-foreground text-[11px]">
                    More walk-ins
                  </span>
                  <span className="inline-flex items-center px-3 py-1 rounded-full bg-muted text-foreground text-[11px]">
                    Low-stock alerts
                  </span>
                </div>
              </div>
            </div>

            <a
              href={merchantUrl}
              target="_blank"
              rel="noreferrer"
              className="group inline-flex items-center justify-between gap-3 rounded-xl bg-primary text-primary-foreground px-4 py-3 text-sm min-h-[44px] w-full transition-opacity hover:opacity-90 active:opacity-80 focus-visible:ring-2 focus-visible:ring-primary"
              aria-label="Open merchant onboarding"
            >
              Start selling
              <ArrowRight className="w-4 h-4 text-primary-foreground" aria-hidden="true" />
            </a>
          </div>

          {/* Right-side photo: exact source image, with only edge micro-blur. */}
          <div
            aria-hidden="true"
            className="absolute right-0 overflow-hidden"
            style={{
              top: 0,
              bottom: 0,
              width: photoWidth,
              pointerEvents: "none",
              zIndex: 2,
              ...(debugCta
                ? { outline: "2px dashed rgba(245,158,11,0.9)" }
                : null),
            }}
          >
            <div
              className="relative w-full h-full bg-muted"
              style={{
                backgroundImage: `url(${fallbackOnboardingImageSrc})`,
                backgroundSize: "cover",
                backgroundPosition: "center",
                backgroundRepeat: "no-repeat"
              }}
            >
              <img
                src={onboardingImageSrc}
                alt=""
                decoding="async"
                loading="eager"
                className="w-full h-full object-cover"
                style={{ display: "block", position: "relative", zIndex: 1 }}
                onError={(event) => {
                  const image = event.currentTarget;
                  if (image.dataset.fallbackApplied === "1") {
                    return;
                  }
                  image.dataset.fallbackApplied = "1";
                  image.src = fallbackOnboardingImageSrc;
                }}
              />

              {/* Very tip blur: strict 4px strip at the image boundary. */}
              <div
                className="absolute inset-y-0"
                style={{
                  pointerEvents: "none",
                  left: 0,
                  width: tipBlurWidthPx,
                  zIndex: 2,
                  background: "rgba(255,255,255,0.01)",
                  backdropFilter: "blur(4px)",
                  WebkitBackdropFilter: "blur(4px)"
                }}
              />

              {/* 2px feather blend into card so the edge stays soft. */}
              <div
                className="absolute inset-y-0"
                style={{
                  pointerEvents: "none",
                  left: -featherIntoCardPx,
                  width: featherIntoCardPx,
                  zIndex: 3,
                  background:
                    "linear-gradient(90deg, var(--card) 0%, rgba(255,255,255,0) 100%)"
                }}
              />

              {debugCta && (
                <div
                  className="absolute right-2 top-2 z-10 rounded-md px-2 py-1 text-[10px]"
                  style={{
                    background: "rgba(0,0,0,0.55)",
                    color: "#fff",
                    maxWidth: 260
                  }}
                >
                  CTA photo: {onboardingImageSrc}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
