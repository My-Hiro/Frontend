import React from "react";
import type { AvailabilityStatus } from "../state/types";

interface StockBadgeProps {
  status: AvailabilityStatus;
  lastUpdated?: string;
  stockCount?: number;
  showDetail?: boolean;
  className?: string;
}

const statusConfig: Record<
  AvailabilityStatus,
  { label: string; bg: string; text: string; dot: string }
> = {
  "in-stock": {
    label: "In stock",
    bg: "bg-green-50",
    text: "text-green-700",
    dot: "bg-green-500",
  },
  "low-stock": {
    label: "Low stock",
    bg: "bg-amber-50",
    text: "text-amber-700",
    dot: "bg-amber-500",
  },
  "out-of-stock": {
    label: "Out of stock",
    bg: "bg-red-50",
    text: "text-red-700",
    dot: "bg-red-500",
  },
  "price-on-request": {
    label: "Price on request",
    bg: "bg-gray-50",
    text: "text-gray-600",
    dot: "bg-gray-400",
  },
};

export function StockBadge({
  status,
  lastUpdated,
  stockCount,
  showDetail = false,
  className = "",
}: StockBadgeProps) {
  const config = statusConfig[status];

  return (
    <div className={`inline-flex items-center gap-1.5 ${className}`}>
      <span
        className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] min-w-0 max-w-full ${config.bg} ${config.text}`}
        role="status"
        aria-label={`Availability: ${config.label}`}
      >
        <span
          className={`w-1.5 h-1.5 rounded-full ${config.dot} flex-shrink-0`}
          aria-hidden="true"
        />
        <span className="truncate min-w-0">{config.label}</span>
      </span>
      {showDetail && lastUpdated && (
        <span className="text-[10px] text-muted-foreground">
          updated {lastUpdated}
        </span>
      )}
      {showDetail && stockCount !== undefined && status === "low-stock" && (
        <span className="text-[10px] text-amber-600">
          ({stockCount} left)
        </span>
      )}
    </div>
  );
}
