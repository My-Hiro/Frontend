"use client";

import { Search, Bell, Sun, Moon, LogOut, ChevronDown } from "lucide-react";
import { usePathname } from "next/navigation";
import { useAppStore, type RangeMode, type PlatformRankingView } from "../../store/useAppStore";
import { adminAuthApi } from "../../lib/api/auth";
import { cn } from "../../lib/utils";

export function Topbar() {
  const pathname = usePathname();
  const theme = useAppStore((state) => state.theme);
  const toggleTheme = useAppStore((state) => state.toggleTheme);
  
  const rangeMode = useAppStore((state) => state.rangeMode);
  const setRangeMode = useAppStore((state) => state.setRangeMode);

  const platformRankingView = useAppStore((state) => state.platformRankingView);
  const setPlatformRankingView = useAppStore((state) => state.setPlatformRankingView);

  const customStart = useAppStore((state) => state.customStart);
  const setCustomStart = useAppStore((state) => state.setCustomStart);
  const customEnd = useAppStore((state) => state.customEnd);
  const setCustomEnd = useAppStore((state) => state.setCustomEnd);

  const handleSignOut = () => {
    if (window.confirm("Are you sure you want to sign out?")) {
      void adminAuthApi.clearSession().finally(() => window.location.reload());
    }
  };

  return (
    <header className="h-16 border-b bg-card px-8 flex items-center justify-between sticky top-0 z-30 shadow-sm">
      <div className="flex items-center gap-6 flex-1">
        <div className="relative w-full max-w-md hidden lg:block">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" size={16} />
          <input 
            placeholder="Search platform resources..." 
            className="w-full pl-10 pr-4 py-2 bg-secondary/50 rounded-full text-sm border-none focus:ring-2 focus:ring-primary/20 transition-all outline-none"
          />
        </div>
      </div>

      <div className="flex items-center gap-4">
        {/* Global Controls */}
        <div className="flex items-center gap-2 mr-4 border-r pr-4">
          <select 
            value={rangeMode} 
            onChange={(e) => setRangeMode(e.target.value as RangeMode)}
            className="text-xs font-semibold bg-transparent border-none focus:ring-0 cursor-pointer text-muted-foreground hover:text-foreground transition-colors"
          >
            <option value="7days">Last 7 days</option>
            <option value="30days">Last 30 days</option>
            <option value="3months">Last 3 months</option>
            <option value="custom">Custom Range</option>
          </select>

          {pathname === "/" && (
            <select
              value={platformRankingView}
              onChange={(e) => setPlatformRankingView(e.target.value as PlatformRankingView)}
              className="text-xs font-semibold bg-transparent border-none focus:ring-0 cursor-pointer text-muted-foreground hover:text-foreground transition-colors border-l pl-2"
            >
              <option value="ranked-searches">Ranked searches</option>
              <option value="top-stores">Top stores</option>
              <option value="full-store-ranking">Full store ranking</option>
              <option value="product-sales-ranking">Product sales</option>
              <option value="sales-dimension-ranking">Dimension</option>
              <option value="customer-purchase-intelligence">Customer Intel</option>
            </select>
          )}
        </div>

        {rangeMode === "custom" && (
          <div className="flex items-center gap-2 bg-secondary/30 p-1 rounded-md px-2 mr-4 text-[10px] font-bold">
            <input type="date" value={customStart} onChange={(e) => setCustomStart(e.target.value)} className="bg-transparent border-none outline-none" />
            <span className="text-muted-foreground">→</span>
            <input type="date" value={customEnd} onChange={(e) => setCustomEnd(e.target.value)} className="bg-transparent border-none outline-none" />
          </div>
        )}

        <button 
          onClick={toggleTheme}
          className="p-2 rounded-full hover:bg-accent text-muted-foreground transition-colors"
        >
          {theme === "dark" ? <Sun size={18} /> : <Moon size={18} />}
        </button>

        <button className="p-2 rounded-full hover:bg-accent text-muted-foreground transition-colors relative">
          <Bell size={18} />
          <span className="absolute top-1.5 right-1.5 h-2 w-2 bg-destructive rounded-full border-2 border-card" />
        </button>

        <div className="h-8 w-px bg-border mx-2" />

        <div className="flex items-center gap-3 group cursor-pointer" onClick={handleSignOut}>
          <div className="h-8 w-8 rounded-full bg-primary/10 border border-primary/20 flex items-center justify-center text-primary font-bold text-xs">
            AD
          </div>
          <div className="hidden sm:block">
            <p className="text-xs font-bold leading-none">Admin User</p>
            <p className="text-[10px] text-muted-foreground mt-1 text-right">Super Oversight</p>
          </div>
          <LogOut size={14} className="text-muted-foreground group-hover:text-destructive transition-colors ml-1" />
        </div>
      </div>
    </header>
  );
}
