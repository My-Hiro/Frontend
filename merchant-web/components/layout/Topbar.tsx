'use client';

import { Bell, Moon, Search, Sun, ChevronDown } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { useTheme } from "next-themes";
import { usePathname } from "next/navigation";
import type { MerchantLiveStatus } from "@/lib/state/liveStatus";
import { useMerchant } from "@/lib/state/merchantContext";
import { cn } from "@/lib/utils";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";

const titles: Record<string, string> = {
  "/": "Dashboard",
  "/inventory": "Inventory Management",
  "/categories": "Categories",
  "/suppliers": "Suppliers",
  "/sales": "Sales & Transactions",
  "/messages": "Store Messages",
  "/reports": "Reports",
  "/support": "Support",
  "/settings": "Settings"
};

interface Props {
  storeLiveStatus: MerchantLiveStatus;
  onStoreLiveStatusChange: (status: MerchantLiveStatus) => void;
  storeStatusBusy?: boolean;
}

export function Topbar({
  storeLiveStatus,
  onStoreLiveStatusChange,
  storeStatusBusy
}: Props) {
  const { storeName } = useMerchant();
  const currentPath = usePathname();
  const { theme, setTheme } = useTheme();
  const [menuOpen, setMenuOpen] = useState(false);
  const tutorialMenuRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!menuOpen) return;

    const onDocumentPress = (event: MouseEvent | TouchEvent) => {
      const target = event.target;
      if (!(target instanceof Node)) return;
      if (tutorialMenuRef.current?.contains(target)) return;
      setMenuOpen(false);
    };

    const onEscape = (event: KeyboardEvent) => {
      if (event.key !== "Escape") return;
      setMenuOpen(false);
    };

    document.addEventListener("mousedown", onDocumentPress);
    document.addEventListener("touchstart", onDocumentPress, { passive: true });
    window.addEventListener("keydown", onEscape);

    return () => {
      document.removeEventListener("mousedown", onDocumentPress);
      document.removeEventListener("touchstart", onDocumentPress);
      window.removeEventListener("keydown", onEscape);
    };
  }, [menuOpen]);

  return (
    <header className="flex h-[73px] items-center justify-between border-b bg-card px-4 lg:px-6 sticky top-0 z-40">
      <div className="flex flex-col">
        <h2 className="text-lg font-bold tracking-tight text-foreground">
          {titles[currentPath] || "myHiro"}
        </h2>
        <p className="text-[11px] font-medium text-muted-foreground uppercase tracking-widest leading-none mt-1">
          {storeName}
        </p>
      </div>
      
      <div className="flex items-center gap-4">
        <div className="hidden lg:flex items-center gap-2 rounded-full border bg-muted/30 px-3 py-1">
          <span className={cn(
            "h-2 w-2 rounded-full animate-pulse",
            storeLiveStatus === "online" ? "bg-green-500" : "bg-red-500"
          )} />
          <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
            {storeLiveStatus === "online" ? "Online" : "Offline"}
          </span>
          <Switch 
            checked={storeLiveStatus === "online"}
            disabled={storeStatusBusy}
            onCheckedChange={(checked) => onStoreLiveStatusChange(checked ? "online" : "offline")}
            className="data-[state=checked]:bg-green-500"
          />
        </div>

        <div className="hidden md:flex relative items-center">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" size={16} />
          <input 
            placeholder="Search..." 
            className="h-9 w-64 rounded-full border bg-muted/30 pl-10 pr-4 text-xs font-medium outline-none transition-all focus:bg-background focus:ring-2 focus:ring-primary/20" 
          />
        </div>
        
        <div className="flex items-center gap-1.5 border-l pl-4">
          <Button variant="ghost" size="icon" className="h-9 w-9 rounded-full relative" aria-label="notifications">
            <Bell size={18} />
            <span className="absolute top-2 right-2 h-2 w-2 rounded-full bg-destructive border-2 border-card" />
          </Button>
          
          <Button
            variant="ghost"
            size="icon"
            className="h-9 w-9 rounded-full"
            onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
          >
            {theme === "dark" ? <Sun size={18} /> : <Moon size={18} />}
          </Button>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" className="ml-2 h-10 w-auto gap-2 rounded-full px-2 hover:bg-muted/50">
                <Avatar className="h-8 w-8 border">
                  <AvatarFallback className="bg-primary/10 text-primary text-xs font-bold">SM</AvatarFallback>
                </Avatar>
                <div className="hidden lg:flex flex-col items-start text-left leading-tight">
                  <span className="text-[11px] font-bold">Store Manager</span>
                  <span className="text-[10px] text-muted-foreground">Active now</span>
                </div>
                <ChevronDown size={14} className="text-muted-foreground" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56">
              <DropdownMenuLabel>My Account</DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem>Profile Settings</DropdownMenuItem>
              <DropdownMenuItem>Subscription</DropdownMenuItem>
              <DropdownMenuItem>Support & Feedback</DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem className="text-destructive">Sign Out</DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
    </header>
  );
}
