"use client";

import React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Home, Search, LayoutGrid, Bookmark, User } from "lucide-react";

const tabs = [
  { id: "home", label: "Home", icon: Home, path: "/" },
  { id: "search", label: "Search", icon: Search, path: "/search" },
  { id: "categories", label: "Categories", icon: LayoutGrid, path: "/categories" },
  { id: "saved", label: "Saved", icon: Bookmark, path: "/saved" },
  { id: "profile", label: "Profile", icon: User, path: "/profile" },
] as const;

export function BottomNav() {
  const pathname = usePathname();

  return (
    <nav
      className="fixed bottom-0 left-0 right-0 z-50 bg-card border-t border-border lg:hidden pb-safe"
      role="tablist"
      aria-label="Main navigation"
    >
      <div className="flex items-center justify-around max-w-lg mx-auto pb-1">
        {tabs.map(({ id, label, icon: Icon, path }) => {
          const isActive = pathname === path || (path !== "/" && pathname.startsWith(path));
          return (
            <Link
              key={id}
              href={path}
              className={`flex flex-col items-center gap-0.5 py-2 px-3 min-w-[56px] min-h-[48px] transition-colors ${
                isActive ? "text-primary font-medium" : "text-muted-foreground"
              }`}
              role="tab"
              aria-selected={isActive}
              aria-label={label}
            >
              <Icon
                className={`w-5 h-5 ${isActive ? "text-primary" : ""}`}
                strokeWidth={isActive ? 2.5 : 2}
              />
              <span className={`text-[10px] ${isActive ? "text-primary font-medium" : ""}`}>
                {label}
              </span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
