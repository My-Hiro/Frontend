import React from "react";
import { Skeleton } from "./ui/skeleton";

export function StoreCardSkeleton() {
  return (
    <div className="w-[200px] sm:w-[220px] md:w-[240px] lg:w-[260px] flex-shrink-0 bg-card rounded-xl border border-border overflow-hidden">
      <Skeleton className="w-full h-28 md:h-36 rounded-none" />
      <div className="p-3">
        <Skeleton className="h-4 w-3/4 mb-2" />
        <Skeleton className="h-3 w-full mb-2" />
        <div className="flex gap-2">
          <Skeleton className="h-3 w-12" />
          <Skeleton className="h-3 w-12" />
          <Skeleton className="h-3 w-12" />
        </div>
      </div>
    </div>
  );
}

export function ProductCardSkeleton() {
  return (
    <div className="popular-product-skeleton bg-card rounded-xl border border-border overflow-hidden">
      <Skeleton className="popular-product-media w-full rounded-none" />
      <div className="popular-product-content p-3">
        <Skeleton className="h-4 w-3/4 mb-2" />
        <Skeleton className="h-4 w-1/2 mb-2" />
        <div className="flex justify-between items-center">
          <Skeleton className="h-3 w-16" />
          <Skeleton className="h-6 w-12 rounded-md" />
        </div>
      </div>
    </div>
  );
}

export function CategoryStripSkeleton() {
  return (
    <section className="mb-6">
      <div className="px-4 lg:px-6 mb-3">
        <Skeleton className="h-5 w-32" />
      </div>
      <div
        className="flex gap-3 overflow-hidden px-4 lg:px-6"
        style={{ scrollbarWidth: "none" }}
      >
        {[1, 2, 3, 4, 5].map((i) => (
          <StoreCardSkeleton key={i} />
        ))}
      </div>
    </section>
  );
}

export function HeroBannerSkeleton() {
  return (
    <div className="mx-4 lg:mx-6">
      <Skeleton className="w-full h-44 md:h-56 lg:h-72 rounded-2xl" />
      <div className="flex justify-center gap-2 mt-3">
        <Skeleton className="w-6 h-2 rounded-full" />
        <Skeleton className="w-2 h-2 rounded-full" />
        <Skeleton className="w-2 h-2 rounded-full" />
      </div>
    </div>
  );
}

export function ProductListSkeleton({ count = 4 }: { count?: number }) {
  return (
    <div className="px-4 lg:px-6 space-y-3">
      {Array.from({ length: count }).map((_, i) => (
        <div
          key={i}
          className="flex items-center gap-3 p-3 bg-card rounded-xl border border-border"
        >
          <Skeleton className="w-16 h-16 rounded-lg flex-shrink-0" />
          <div className="flex-1">
            <Skeleton className="h-4 w-3/4 mb-2" />
            <Skeleton className="h-3.5 w-1/3 mb-1.5" />
            <Skeleton className="h-3 w-20" />
          </div>
          <Skeleton className="h-8 w-12 rounded-lg" />
        </div>
      ))}
    </div>
  );
}

export function StorePageSkeleton() {
  return (
    <div>
      <Skeleton className="w-full h-48 md:h-64 lg:h-80 rounded-none" />
      <div className="p-4 lg:p-6">
        <div className="lg:flex lg:gap-8">
          <div className="flex-1">
            <Skeleton className="h-6 w-2/3 mb-2" />
            <Skeleton className="h-4 w-1/3 mb-4" />
            <Skeleton className="h-3 w-full mb-2" />
            <Skeleton className="h-3 w-4/5 mb-4" />
          </div>
          <div className="lg:w-48 flex gap-2 lg:flex-col mb-4">
            <Skeleton className="h-10 flex-1 rounded-xl" />
            <Skeleton className="h-10 flex-1 rounded-xl" />
          </div>
        </div>
        <div className="flex gap-2 mb-4">
          <Skeleton className="h-8 w-20 rounded-full" />
          <Skeleton className="h-8 w-20 rounded-full" />
          <Skeleton className="h-8 w-20 rounded-full" />
        </div>
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <ProductCardSkeleton key={i} />
          ))}
        </div>
      </div>
    </div>
  );
}
