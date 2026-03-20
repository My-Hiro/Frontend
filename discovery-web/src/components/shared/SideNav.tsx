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

export function SideNav() {
  const pathname = usePathname();

  return (
    <nav
      className="hidden lg:flex flex-col w-60 xl:w-64 bg-card border-r border-border h-screen fixed left-0 top-0 z-50"
      role="tablist"
      aria-label="Main navigation"
    >
      <div className="px-5 py-5 border-b border-border">
        <h1 className="text-xl text-primary font-bold">myHiro</h1>
        <p className="text-[11px] text-muted-foreground mt-0.5">Discover stores near you</p>
      </div>

      <div className="flex flex-col gap-1 p-3 flex-1 overflow-y-auto">
        {tabs.map(({ id, label, icon: Icon, path }) => {
          const isActive = pathname === path || (path !== "/" && pathname.startsWith(path));
          return (
            <Link
              key={id}
              href={path}
              className={`flex items-center gap-3 px-4 py-3 rounded-xl text-sm transition-colors min-h-[44px] ${
                isActive
                  ? "bg-secondary text-primary font-medium"
                  : "text-muted-foreground hover:bg-muted hover:text-foreground"
              }`}
              role="tab"
              aria-selected={isActive}
              aria-label={label}
            >
              <Icon
                className={`w-5 h-5 ${isActive ? "text-primary" : ""}`}
                strokeWidth={isActive ? 2.5 : 2}
              />
              <span>{label}</span>
            </Link>
          );
        })}
      </div>

      <div className="p-4 border-t border-border">
        <p className="text-[10px] text-muted-foreground">myHiro v1.0.0</p>
        <p className="text-[10px] text-muted-foreground">Accra, Ghana</p>
      </div>
    </nav>
  );
}
