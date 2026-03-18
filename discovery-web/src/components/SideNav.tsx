import React from "react";
import { Home, Search, LayoutGrid, Bookmark, User } from "lucide-react";
import type { TabId } from "./BottomNav";

interface SideNavProps {
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

export function SideNav({ activeTab, onTabChange }: SideNavProps) {
  return (
    <nav
      className="hidden lg:flex flex-col w-60 xl:w-64 bg-card border-r border-border h-screen sticky top-0 flex-shrink-0"
      role="tablist"
      aria-label="Main navigation"
    >
      {/* Logo / Brand */}
      <div className="px-5 py-5 border-b border-border">
        <h1 className="text-xl text-primary">myHiro</h1>
        <p className="text-[11px] text-muted-foreground mt-0.5">Discover stores near you</p>
      </div>

      {/* Nav Items */}
      <div className="flex flex-col gap-1 p-3 flex-1">
        {tabs.map(({ id, label, icon: Icon }) => {
          const isActive = activeTab === id;
          return (
            <button
              key={id}
              onClick={() => onTabChange(id)}
              className={`flex items-center gap-3 px-4 py-3 rounded-xl text-sm transition-colors min-h-[44px] ${
                isActive
                  ? "bg-secondary text-primary"
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
            </button>
          );
        })}
      </div>

      {/* Bottom info */}
      <div className="p-4 border-t border-border">
        <p className="text-[10px] text-muted-foreground">myHiro v1.0.0</p>
        <p className="text-[10px] text-muted-foreground">Accra, Ghana</p>
      </div>
    </nav>
  );
}
