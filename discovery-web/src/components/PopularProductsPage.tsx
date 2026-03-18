import React, { useEffect, useState } from "react";
import { ArrowLeft, Flame } from "lucide-react";
import { discoveryApi } from "../state/api";
import type { ProductCardModel } from "../state/types";
import { EmptyState } from "./EmptyState";
import { ImageWithFallback } from "./figma/ImageWithFallback";
import { SponsoredBadge } from "./SponsoredBadge";
import { StockBadge } from "./StockBadge";
import { ProductCardSkeleton } from "./SkeletonLoaders";

interface PopularProductsPageProps {
  onBack: () => void;
  onProductPress: (productId: string) => void;
}

export function PopularProductsPage({ onBack, onProductPress }: PopularProductsPageProps) {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [products, setProducts] = useState<ProductCardModel[]>([]);

  useEffect(() => {
    let mounted = true;
    const load = async () => {
      try {
        setError(null);
        const home = await discoveryApi.getHome(true);
        if (!mounted) return;
        setProducts(home.popularProducts);
      } catch (err) {
        if (!mounted) return;
        setError(err instanceof Error ? err.message : "Failed to load popular products");
      } finally {
        if (!mounted) return;
        setLoading(false);
      }
    };
    void load();
    return () => {
      mounted = false;
    };
  }, []);

  return (
    <div className="pb-20 lg:pb-8 max-w-7xl mx-auto">
      <header className="px-4 lg:px-6 pt-4 pb-2 flex items-center gap-2">
        <button
          className="min-h-[44px] min-w-[44px] rounded-lg border border-border bg-card text-foreground inline-flex items-center justify-center"
          onClick={onBack}
          aria-label="Back"
        >
          <ArrowLeft className="w-4 h-4" />
        </button>
        <div className="flex items-center gap-2 min-w-0">
          <Flame className="w-4 h-4 text-primary flex-shrink-0" />
          <h1 className="text-base text-foreground truncate">Popular products</h1>
        </div>
        <div className="ml-auto text-xs text-muted-foreground">{products.length} items</div>
      </header>

      {error && (
        <div className="pt-4">
          <EmptyState type="error" onRetry={() => window.location.reload()} />
        </div>
      )}

      <section className="px-4 lg:px-6 pt-3" aria-label="Popular products list">
        {loading ? (
          <div className="popular-products-grid grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3">
            {Array.from({ length: 10 }).map((_, i) => (
              <ProductCardSkeleton key={i} />
            ))}
          </div>
        ) : products.length === 0 ? (
          <div
            className="bg-card border border-border rounded-xl p-6 text-center"
            role="status"
            aria-label="No popular products"
          >
            <strong className="text-base text-foreground">No popular products yet</strong>
            <p className="text-sm text-muted-foreground mt-2">
              Check back later or search for items.
            </p>
          </div>
        ) : (
          <div className="popular-products-grid grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3">
            {products.map((product) => (
              <button
                key={product.id}
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
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
