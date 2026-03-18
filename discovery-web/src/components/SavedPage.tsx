import React, { useEffect, useState } from "react";
import { StoreCard } from "./StoreCard";
import { ProductCard } from "./ProductCard";
import { EmptyState } from "./EmptyState";
import { Bookmark } from "lucide-react";
import { discoveryApi } from "../state/api";
import type { ProductCardModel, StoreCardModel } from "../state/types";

interface SavedPageProps {
  onStorePress: (storeId: string, entryCategoryId?: string) => void;
  onProductPress: (productId: string) => void;
}

export function SavedPage({ onStorePress, onProductPress }: SavedPageProps) {
  const [activeTab, setActiveTab] = useState<"stores" | "products" | "searches">("stores");
  const [savedStores, setSavedStores] = useState<StoreCardModel[]>([]);
  const [savedProducts, setSavedProducts] = useState<ProductCardModel[]>([]);

  // Demo saved searches. In production, persist these.
  const savedSearches = ["paracetamol", "phone charger usb-c"];

  useEffect(() => {
    let mounted = true;
    const load = async () => {
      const home = await discoveryApi.getHome();
      if (!mounted) return;
      const stores = home.suggested.slice(0, 2);
      setSavedStores(stores);
      if (stores[0]) {
        const products = await discoveryApi.getStoreProducts(stores[0].id);
        if (!mounted) return;
        setSavedProducts(products.slice(0, 3));
      } else {
        setSavedProducts([]);
      }
    };
    load().catch(() => undefined);
    return () => {
      mounted = false;
    };
  }, []);

  const isEmpty = {
    stores: savedStores.length === 0,
    products: savedProducts.length === 0,
    searches: savedSearches.length === 0
  };

  return (
    <div className="pb-20 lg:pb-8 pt-4 max-w-7xl mx-auto">
      <div className="px-4 lg:px-6 mb-4">
        <h1 className="text-xl mb-1">Saved</h1>
        <p className="text-sm text-muted-foreground">
          Your bookmarked stores, products, and searches
        </p>
      </div>

      <div className="flex gap-2 px-4 lg:px-6 mb-4">
        {(["stores", "products", "searches"] as const).map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`px-3 py-1.5 rounded-full text-xs capitalize min-h-[32px] transition-colors ${
              activeTab === tab ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"
            }`}
          >
            {tab}
          </button>
        ))}
      </div>

      {activeTab === "stores" && (
        <div className="px-4 lg:px-6">
          {isEmpty.stores ? (
            <EmptyState type="empty-saved" />
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-2">
              {savedStores.map((store) => (
                <StoreCard
                  key={store.id}
                  store={store}
                  onPress={(storeId) => onStorePress(storeId)}
                  variant="compact"
                />
              ))}
            </div>
          )}
        </div>
      )}

      {activeTab === "products" && (
        <div className="px-4 lg:px-6">
          {isEmpty.products ? (
            <EmptyState type="empty-saved" />
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-2">
              {savedProducts.map((product) => (
                <ProductCard
                  key={product.id}
                  product={product}
                  onPress={onProductPress}
                  variant="list"
                />
              ))}
            </div>
          )}
        </div>
      )}

      {activeTab === "searches" && (
        <div className="px-4 lg:px-6">
          {isEmpty.searches ? (
            <EmptyState type="empty-saved" />
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-2">
              {savedSearches.map((search) => (
                <div
                  key={search}
                  className="flex items-center gap-3 p-3 bg-card rounded-xl border border-border"
                >
                  <Bookmark className="w-4 h-4 text-primary flex-shrink-0" />
                  <span className="text-sm flex-1">"{search}"</span>
                  <span className="text-xs text-muted-foreground">No new results</span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

