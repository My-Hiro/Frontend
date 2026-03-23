import React from "react";
import { Home, Search, LayoutGrid, Bookmark, User } from "lucide-react";

export type TabId = "home" | "search" | "categories" | "saved" | "profile";

interface BottomNavProps {
  activeTab: TabId;
  onTabChange: (tab: TabId) => void;
}

const tabs: { id: TabId; label: string; icon: React.ElementType }[] = [
  { id: "home", label: "Home", icon: Home },
  { id: "search", label: "Search", icon: Search },
  { id: "categories", label: "Categories", icon: LayoutGrid },
  { id: "saved", label: "Saved", icon: Bookmark },
  { id: "profile", label: "Profile", icon: User },
];

export function BottomNav({ activeTab, onTabChange }: BottomNavProps) {
  return (
    <nav
      className="fixed bottom-0 left-0 right-0 z-50 bg-card border-t border-border lg:hidden"
      role="tablist"
      aria-label="Main navigation"
    >
      <div className="flex items-center justify-around max-w-lg mx-auto pb-1">
        {tabs.map(({ id, label, icon: Icon }) => {
          const isActive = activeTab === id;
          return (
            <button
              key={id}
              onClick={() => onTabChange(id)}
              className={`flex flex-col items-center gap-0.5 py-2 px-3 min-w-[56px] min-h-[48px] transition-colors ${
                isActive ? "text-primary" : "text-muted-foreground"
              }`}
              role="tab"
              aria-selected={isActive}
              aria-label={label}
            >
              <Icon
                className={`w-5 h-5 ${isActive ? "text-primary" : ""}`}
                strokeWidth={isActive ? 2.5 : 2}
              />
              <span className={`text-[10px] ${isActive ? "text-primary" : ""}`}>
                {label}
              </span>
            </button>
          );
        })}
      </div>
    </nav>
  );
}