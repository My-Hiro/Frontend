'use client';

import {
  BarChart3,
  LogOut,
  LifeBuoy,
  LayoutDashboard,
  MessageSquare,
  Package,
  Settings,
  ShoppingCart,
  Tags,
  Truck,
  ChevronLeft,
  ChevronRight
} from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";

import { useUiStore } from "@/lib/store/ui-store";

interface Props {
  onSignOut: () => void;
}

const menu = [
  { id: "dashboard", label: "Dashboard", icon: LayoutDashboard, path: "/" },
  { id: "inventory", label: "Inventory", icon: Package, path: "/inventory" },
  { id: "categories", label: "Categories", icon: Tags, path: "/categories" },
  { id: "suppliers", label: "Suppliers", icon: Truck, path: "/suppliers" },
  { id: "sales", label: "Sales", icon: ShoppingCart, path: "/sales" },
  { id: "messages", label: "Messages", icon: MessageSquare, path: "/messages" },
  { id: "reports", label: "Reports", icon: BarChart3, path: "/reports" },
  { id: "support", label: "Support", icon: LifeBuoy, path: "/support" },
  { id: "settings", label: "Settings", icon: Settings, path: "/settings" }
] as const;

const basicMenuIds = new Set<string>(["inventory", "sales", "messages", "settings"]);

export function Sidebar({
  onSignOut
}: Props) {
  const pathname = usePathname();
  const { sidebarExpanded: expanded, toggleSidebar: onToggle, menuMode, setMenuMode: onMenuModeChange } = useUiStore();
  const visibleMenu = menuMode === "basic" ? menu.filter((entry) => basicMenuIds.has(entry.id)) : menu;

  return (
    <TooltipProvider delayDuration={0}>
      <aside className={cn(
        "hidden lg:flex flex-col border-r bg-card transition-all duration-300 ease-in-out h-full relative",
        expanded ? "w-[260px]" : "w-[80px]"
      )}>
        <div className={cn("flex items-center gap-3 border-b p-4 h-[73px]", expanded ? "justify-start" : "justify-center")}>
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary text-primary-foreground shadow-lg">
            <Package size={22} />
          </div>
          {expanded && (
            <div className="overflow-hidden whitespace-nowrap">
              <h1 className="text-base font-bold leading-tight text-foreground tracking-tight">myHiro</h1>
              <p className="text-[11px] font-medium text-muted-foreground uppercase tracking-wider">Merchant</p>
            </div>
          )}
        </div>
        
        <ScrollArea className="flex-1 px-3">
          <nav className="flex flex-col gap-2 py-4">
            {visibleMenu.map((entry) => {
              const Icon = entry.icon;
              const active = pathname === entry.path;
              
              const content = (
                <Link
                  key={entry.id}
                  href={entry.path}
                  className={cn(
                    "flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-all group",
                    expanded ? "justify-start" : "justify-center",
                    active 
                      ? "bg-primary text-primary-foreground shadow-md" 
                      : "text-muted-foreground hover:bg-secondary hover:text-foreground"
                  )}
                  data-tour={`nav-${entry.id}`}
                >
                  <Icon size={20} className={cn("shrink-0 transition-transform group-hover:scale-110", active ? "text-primary-foreground" : "text-muted-foreground group-hover:text-foreground")} />
                  {expanded && <span className="truncate">{entry.label}</span>}
                </Link>
              );

              if (!expanded) {
                return (
                  <Tooltip key={entry.id}>
                    <TooltipTrigger asChild>
                      {content}
                    </TooltipTrigger>
                    <TooltipContent side="right">
                      {entry.label}
                    </TooltipContent>
                  </Tooltip>
                );
              }

              return content;
            })}
          </nav>
        </ScrollArea>

        <div className="p-3 border-t bg-muted/20">
          <div className={cn("flex flex-col gap-3", expanded ? "px-1" : "items-center")}>
            {expanded && <small className="text-[10px] font-bold uppercase text-muted-foreground tracking-widest pl-2">Menu Mode</small>}
            <div className={cn("flex bg-background/50 p-1 rounded-lg border", expanded ? "flex-row gap-1" : "flex-col gap-1 w-full")}>
              <button
                type="button"
                className={cn(
                  "flex-1 rounded-md py-1.5 text-[11px] font-bold transition-all",
                  menuMode === "basic" 
                    ? "bg-primary text-primary-foreground shadow-sm" 
                    : "text-muted-foreground hover:text-foreground"
                )}
                onClick={() => onMenuModeChange("basic")}
              >
                {expanded ? "Basic" : "B"}
              </button>
              <button
                type="button"
                className={cn(
                  "flex-1 rounded-md py-1.5 text-[11px] font-bold transition-all",
                  menuMode === "advanced" 
                    ? "bg-primary text-primary-foreground shadow-sm" 
                    : "text-muted-foreground hover:text-foreground"
                )}
                onClick={() => onMenuModeChange("advanced")}
              >
                {expanded ? "Advanced" : "A"}
              </button>
            </div>

            <Separator />

            <button
              type="button"
              className={cn(
                "flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium text-destructive transition-all hover:bg-destructive/10",
                expanded ? "justify-start" : "justify-center"
              )}
              onClick={onSignOut}
              data-tour="nav-signout"
            >
              <LogOut size={20} className="shrink-0" />
              {expanded && <span>Sign out</span>}
            </button>
          </div>
        </div>
        
        <button 
          type="button" 
          className="absolute -right-3 top-[85px] z-50 flex h-6 w-6 items-center justify-center rounded-full border bg-card text-muted-foreground shadow-sm hover:text-foreground transition-all" 
          onClick={onToggle}
        >
          {expanded ? <ChevronLeft size={14} /> : <ChevronRight size={14} />}
        </button>
      </aside>
    </TooltipProvider>
  );
}
