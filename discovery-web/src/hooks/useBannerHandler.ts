"use client";

import { useRouter } from "next/navigation";
import { type HeroBannerModel } from "../state/types";
import { useAppStore } from "../store/useAppStore";

export function useBannerHandler() {
  const router = useRouter();
  const { setAuthPromptOpen } = useAppStore();

  const handleBannerPress = (banner: HeroBannerModel) => {
    const openExternal = (url: string) => {
      window.open(url, "_blank", "noopener,noreferrer");
    };

    const tryResolveFromUrl = (url: string): boolean => {
      try {
        const parsed = new URL(url, window.location.origin);
        if (parsed.origin !== window.location.origin) {
          return false;
        }
        const store = parsed.searchParams.get("store");
        if (store) {
          router.push(`/store/${store}`);
          return true;
        }
        const product = parsed.searchParams.get("product");
        if (product) {
          router.push(`/product/${product}`);
          return true;
        }
        const page = parsed.searchParams.get("page");
        if (page) {
          const normalized = page.trim().toLowerCase();
          if (["home", "search", "categories", "saved", "profile"].includes(normalized)) {
            router.push(normalized === "home" ? "/" : `/${normalized}`);
            return true;
          }
          return false;
        }
        return false;
      } catch {
        return false;
      }
    };

    const linkType = banner.linkType ?? (banner.link ? "custom_url" : "none");
    const target = (banner.linkTarget ?? "").trim().replace(/^\//, "");

    if (linkType === "none") return;

    if (linkType === "discovery_store" && target) {
      router.push(`/store/${target}`);
      return;
    }

    if (linkType === "discovery_product" && target) {
      router.push(`/product/${target}`);
      return;
    }

    if (linkType === "discovery_category" && target) {
      router.push(`/category/${target}`);
      return;
    }

    if (linkType === "discovery_page" && target) {
      const normalized = target.toLowerCase();
      if (normalized === "home") router.push("/");
      else router.push(`/${normalized}`);
      return;
    }

    if (linkType === "custom_url" && banner.link) {
      if (!tryResolveFromUrl(banner.link)) {
        openExternal(banner.link);
      }
    }
  };

  return { handleBannerPress };
}