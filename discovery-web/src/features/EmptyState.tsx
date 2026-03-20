import React from "react";
import { SearchX, WifiOff, PackageX, Bookmark, MapPin } from "lucide-react";

interface EmptyStateProps {
  type: "no-results" | "offline" | "empty-saved" | "empty-category" | "error";
  query?: string;
  onRetry?: () => void;
  onSaveQuery?: () => void;
  onRequestItem?: () => void;
}

export function EmptyState({
  type,
  query,
  onRetry,
  onSaveQuery,
  onRequestItem,
}: EmptyStateProps) {
  const configs = {
    "no-results": {
      icon: <SearchX className="w-12 h-12 text-muted-foreground/50" />,
      title: "No results found",
      description: query
        ? `We couldn't find "${query}" in any nearby store. Try a different search or request this item.`
        : "We couldn't find what you're looking for. Try a different search term.",
      primaryCta: onRequestItem ? "Request this item" : undefined,
      primaryAction: onRequestItem,
      secondaryCta: onSaveQuery ? "Save this search" : undefined,
      secondaryAction: onSaveQuery,
    },
    offline: {
      icon: <WifiOff className="w-12 h-12 text-muted-foreground/50" />,
      title: "You're offline",
      description:
        "No internet connection. You can still browse recently viewed stores and saved items.",
      primaryCta: onRetry ? "Try again" : undefined,
      primaryAction: onRetry,
      secondaryCta: undefined,
      secondaryAction: undefined,
    },
    "empty-saved": {
      icon: <Bookmark className="w-12 h-12 text-muted-foreground/50" />,
      title: "No saved items yet",
      description:
        "Save stores and products you like to find them quickly later. Tap the bookmark icon on any store or product.",
      primaryCta: undefined,
      primaryAction: undefined,
      secondaryCta: undefined,
      secondaryAction: undefined,
    },
    "empty-category": {
      icon: <PackageX className="w-12 h-12 text-muted-foreground/50" />,
      title: "No stores nearby",
      description:
        "We haven't found stores in this category near your location. Try expanding your search area.",
      primaryCta: onRetry ? "Show all stores" : undefined,
      primaryAction: onRetry,
      secondaryCta: undefined,
      secondaryAction: undefined,
    },
    error: {
      icon: <MapPin className="w-12 h-12 text-muted-foreground/50" />,
      title: "Something went wrong",
      description:
        "We had trouble loading this page. Please check your connection and try again.",
      primaryCta: onRetry ? "Retry" : undefined,
      primaryAction: onRetry,
      secondaryCta: undefined,
      secondaryAction: undefined,
    },
  };

  const config = configs[type];

  return (
    <div
      className="flex flex-col items-center justify-center text-center px-8 py-16"
      role="status"
      aria-label={config.title}
    >
      <div className="mb-4">{config.icon}</div>
      <h3 className="text-base text-foreground mb-2">{config.title}</h3>
      <p className="text-sm text-muted-foreground max-w-xs mb-6">
        {config.description}
      </p>
      <div className="flex flex-col gap-3 w-full max-w-[240px]">
        {config.primaryCta && (
          <button
            onClick={config.primaryAction}
            className="w-full py-3 bg-primary text-primary-foreground rounded-xl text-sm min-h-[44px] transition-opacity hover:opacity-90"
          >
            {config.primaryCta}
          </button>
        )}
        {config.secondaryCta && (
          <button
            onClick={config.secondaryAction}
            className="w-full py-3 bg-secondary text-secondary-foreground rounded-xl text-sm min-h-[44px] transition-opacity hover:opacity-90"
          >
            {config.secondaryCta}
          </button>
        )}
      </div>
    </div>
  );
}
