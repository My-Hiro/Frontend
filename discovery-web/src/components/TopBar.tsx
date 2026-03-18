import React from "react";
import { Search, MapPin, Tag } from "lucide-react";

interface TopBarProps {
  location: string;
  onLocationClick?: () => void;
  onSearchFocus: () => void;
  searchValue?: string;
  onSearchChange?: (value: string) => void;
  onSearchSubmit?: (value: string) => void;
  showSearchInput?: boolean;
  onBack?: () => void;
}

export function TopBar({
  location,
  onLocationClick,
  onSearchFocus,
  searchValue = "",
  onSearchChange,
  onSearchSubmit,
  showSearchInput = false,
  onBack,
}: TopBarProps) {
  return (
    <header className="sticky top-0 z-40 bg-card border-b border-border">
      <div className="max-w-7xl mx-auto">
        {/* Location bar */}
        <div className="flex items-center justify-between px-4 lg:px-6 py-2">
          {/* Brand - visible on mobile where sidebar is hidden */}
          <div className="hidden md:flex lg:hidden items-center gap-2 mr-4">
            <span className="text-lg text-primary">myHiro</span>
          </div>
          <button
            className="flex items-center gap-1.5 text-sm text-foreground min-h-[36px]"
            aria-label={`Current location: ${location}`}
            type="button"
            onClick={onLocationClick}
          >
            <MapPin className="w-4 h-4 text-primary" />
            <span className="truncate max-w-[200px]">{location}</span>
            <svg className="w-3 h-3 text-muted-foreground" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
            </svg>
          </button>
          <button
            className="flex items-center justify-center w-9 h-9 rounded-full bg-secondary min-w-[36px] min-h-[36px]"
            aria-label="Promotions"
          >
            <Tag className="w-4 h-4 text-secondary-foreground" />
          </button>
        </div>

        {/* Search bar */}
        <div className="px-4 lg:px-6 pb-3">
          {showSearchInput ? (
            <form
              onSubmit={(e) => {
                e.preventDefault();
                onSearchSubmit?.(searchValue);
              }}
              className="flex items-center gap-2 max-w-2xl"
            >
              {onBack && (
                <button
                  type="button"
                  onClick={onBack}
                  className="min-w-[44px] min-h-[44px] flex items-center justify-center"
                  aria-label="Go back"
                >
                  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                  </svg>
                </button>
              )}
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <input
                  type="search"
                  value={searchValue}
                  onChange={(e) => onSearchChange?.(e.target.value)}
                  placeholder='Search items, brands, or stores (e.g. paracetamol, phone charger)'
                  className="w-full pl-9 pr-4 py-2.5 bg-input-background rounded-xl text-sm placeholder:text-muted-foreground/60 focus:outline-none focus:ring-2 focus:ring-primary/30 min-h-[44px]"
                  autoFocus
                  aria-label="Search for items or stores"
                />
              </div>
            </form>
          ) : (
            <button
              onClick={onSearchFocus}
              className="flex items-center gap-2 w-full max-w-2xl py-2.5 px-3 bg-input-background rounded-xl text-sm text-muted-foreground/60 min-h-[44px] transition-colors hover:bg-accent"
              aria-label="Open search"
            >
              <Search className="w-4 h-4" />
              Search items, brands, or stores
            </button>
          )}
        </div>
      </div>
    </header>
  );
}
