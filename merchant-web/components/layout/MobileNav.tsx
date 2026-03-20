'use client';

import {
  BarChart3,
  LifeBuoy,
  LogOut,
  LayoutDashboard,
  MessageSquare,
  Package,
  Settings,
  ShoppingCart,
  Tags,
  Truck
} from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import type { MenuMode, ViewId } from "@/types";
import { cn } from "@/lib/utils";
import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area";

interface Props {
  menuMode: MenuMode;
  onMenuModeChange: (mode: MenuMode) => void;
  onSignOut: () => void | Promise<void>;
}

const menu: Array<{ id: ViewId; label: string; icon: any; path: string }> = [
  { id: "dashboard", label: "Dashboard", icon: LayoutDashboard, path: "/" },
  { id: "inventory", label: "Inventory", icon: Package, path: "/inventory" },
  { id: "categories", label: "Categories", icon: Tags, path: "/categories" },
  { id: "suppliers", label: "Suppliers", icon: Truck, path: "/suppliers" },
  { id: "sales", label: "Sales", icon: ShoppingCart, path: "/sales" },
  { id: "messages", label: "Messages", icon: MessageSquare, path: "/messages" },
  { id: "reports", label: "Reports", icon: BarChart3, path: "/reports" },
  { id: "support", label: "Support", icon: LifeBuoy, path: "/support" },
  { id: "settings", label: "Settings", icon: Settings, path: "/settings" }
];

const basicMenuIds = new Set<ViewId>(["inventory", "sales", "messages", "settings"]);

export function MobileNav({
  menuMode,
  onMenuModeChange,
  onSignOut
}: Props) {
  const pathname = usePathname();
  const visibleMenu = menuMode === "basic" ? menu.filter((entry) => basicMenuIds.has(entry.id)) : menu;

  return (
    <nav className="lg:hidden border-t bg-card pb-safe-area-inset-bottom sticky bottom-0 z-40">
      <div className="flex flex-col">
        <div className="flex bg-muted/30 p-1 border-b">
          <button
            type="button"
            className={cn(
              "flex-1 rounded py-1.5 text-[10px] font-bold uppercase tracking-wider transition-all",
              menuMode === "basic" ? "bg-background shadow-sm text-primary" : "text-muted-foreground"
            )}
            onClick={() => onMenuModeChange("basic")}
          >
            Basic Mode
          </button>
          <button
            type="button"
            className={cn(
              "flex-1 rounded py-1.5 text-[10px] font-bold uppercase tracking-wider transition-all",
              menuMode === "advanced" ? "bg-background shadow-sm text-primary" : "text-muted-foreground"
            )}
            onClick={() => onMenuModeChange("advanced")}
          >
            Advanced Mode
          </button>
        </div>
        
        <ScrollArea className="w-full">
          <div className="flex items-center gap-1 p-2">
            {visibleMenu.map((entry) => {
              const Icon = entry.icon;
              const active = pathname === entry.path;
              return (
                <Link
                  key={entry.id}
                  href={entry.path}
                  className={cn(
                    "flex flex-col items-center justify-center min-w-[72px] h-14 rounded-lg gap-1 transition-all",
                    active 
                      ? "bg-primary text-primary-foreground" 
                      : "text-muted-foreground hover:bg-muted"
                  )}
                  data-tour={`nav-${entry.id}`}
                >
                  <Icon size={18} />
                  <span className="text-[10px] font-medium leading-none">{entry.label}</span>
                </Link>
              );
            })}
            <button
              type="button"
              className="flex flex-col items-center justify-center min-w-[72px] h-14 rounded-lg gap-1 text-destructive hover:bg-destructive/10"
              onClick={onSignOut}
            >
              <LogOut size={18} />
              <span className="text-[10px] font-medium leading-none">Sign out</span>
            </button>
          </div>
          <ScrollBar orientation="horizontal" />
        </ScrollArea>
      </div>
    </nav>
  );
}
