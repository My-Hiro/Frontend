import React from "react";
import { ImageWithFallback } from "./figma/ImageWithFallback";
import { StockBadge } from "./StockBadge";
import type { ProductCardModel } from "../state/types";

interface ProductCardProps {
  product: ProductCardModel;
  onPress: (productId: string) => void;
  variant?: "grid" | "list";
}

export function ProductCard({ product, onPress, variant = "grid" }: ProductCardProps) {
  if (variant === "list") {
    return (
      <button
        onClick={() => onPress(product.id)}
        className="flex items-center gap-3 p-3 bg-card rounded-xl border border-border w-full text-left min-h-[72px] transition-shadow hover:shadow-sm active:bg-muted focus-visible:ring-2 focus-visible:ring-primary"
        aria-label={`${product.name} - ${product.price} - ${product.availability.replace("-", " ")}`}
      >
        <div className="w-16 h-16 rounded-lg bg-muted overflow-hidden flex-shrink-0">
          <ImageWithFallback
            src={product.image}
            alt={product.name}
            className="w-full h-full object-cover"
            loading="lazy"
          />
        </div>
        <div className="flex-1 min-w-0">
          <h4 className="text-sm truncate">{product.name}</h4>
          <p className="text-sm text-primary mt-0.5">
            {product.priceRange || product.price}
          </p>
          <StockBadge status={product.availability} className="mt-1" />
        </div>
        <span className="text-xs text-primary flex-shrink-0 px-3 py-1.5 bg-secondary rounded-lg">
          View
        </span>
      </button>
    );
  }

  return (
    <button
      onClick={() => onPress(product.id)}
      className="flex flex-col bg-card rounded-xl border border-border overflow-hidden text-left transition-shadow hover:shadow-md active:shadow-sm focus-visible:ring-2 focus-visible:ring-primary w-full h-full"
      aria-label={`${product.name} - ${product.price} - ${product.availability.replace("-", " ")}`}
    >
      <div className="relative w-full aspect-square bg-muted">
        <ImageWithFallback
          src={product.image}
          alt={product.name}
          className="w-full h-full object-cover"
          loading="lazy"
        />
        <div className="absolute bottom-2 left-2 right-2">
          <StockBadge
            status={product.availability}
            stockCount={product.stockCount}
            className="w-full"
          />
        </div>
      </div>
      <div className="p-3 flex flex-col flex-1 min-w-0">
        <h4 className="text-sm truncate">{product.name}</h4>
        <p className="text-sm text-primary mt-1 truncate">
          {product.priceRange || product.price}
        </p>
        <div className="flex items-center justify-between mt-auto pt-2 min-w-0 gap-2">
          <span className="text-[11px] text-muted-foreground truncate min-w-0">
            Updated {product.lastUpdated}
          </span>
          <span className="text-xs text-primary px-2 py-1 bg-secondary rounded-md flex-shrink-0 whitespace-nowrap">
            View
          </span>
        </div>
      </div>
    </button>
  );
}
