"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { 
  BarChart3, 
  AlertTriangle, 
  Megaphone, 
  UserCog, 
  Building2, 
  Store, 
  ShieldCheck,
  ChevronLeft,
  ChevronRight,
  LayoutDashboard
} from "lucide-react";
import { useState } from "react";
import { cn } from "../../lib/utils";

const menuItems = [
  { group: "Analytics", items: [
    { id: "platform", path: "/", label: "Platform Overview", icon: LayoutDashboard },
    { id: "overlap", path: "/overlap", label: "Inventory Overlap", icon: AlertTriangle },
    { id: "merchant-health", path: "/merchant-health", label: "Merchant Health", icon: Building2 },
  ]},
  { group: "Operations", items: [
    { id: "stores", path: "/stores", label: "Store Management", icon: Store },
    { id: "moderation", path: "/moderation", label: "Moderation Queue", icon: ShieldCheck },
    { id: "ads", path: "/ads", label: "Ad Placements", icon: Megaphone },
  ]},
  { group: "Users", items: [
    { id: "accounts", path: "/accounts", label: "Account Control", icon: UserCog },
  ]}
];

export function Sidebar() {
  const pathname = usePathname();
  const [collapsed, setCollapsed] = useState(false);

  return (
    <aside className={cn(
      "flex flex-col border-r bg-card transition-all duration-300 z-40",
      collapsed ? "w-[70px]" : "w-[260px]"
    )}>
      <div className="flex h-16 items-center justify-between px-4 border-b">
        {!collapsed && <span className="text-lg font-bold tracking-tight text-primary">myHiro <span className="text-foreground">Admin</span></span>}
        <button 
          onClick={() => setCollapsed(!collapsed)}
          className="p-1.5 rounded-md hover:bg-accent text-muted-foreground transition-colors"
        >
          {collapsed ? <ChevronRight size={18} /> : <ChevronLeft size={18} />}
        </button>
      </div>

      <nav className="flex-1 overflow-y-auto py-4">
        {menuItems.map((group, idx) => (
          <div key={idx} className="mb-6 px-3">
            {!collapsed && <h4 className="mb-2 px-3 text-[11px] font-bold uppercase tracking-wider text-muted-foreground/70">{group.group}</h4>}
            <div className="space-y-1">
              {group.items.map((item) => {
                const active = pathname === item.path;
                return (
                  <Link
                    key={item.id}
                    href={item.path}
                    className={cn(
                      "flex items-center gap-3 px-3 py-2 rounded-md text-sm font-medium transition-all group",
                      active 
                        ? "bg-primary text-primary-foreground shadow-md" 
                        : "text-muted-foreground hover:bg-accent hover:text-foreground"
                    )}
                  >
                    <item.icon size={18} className={cn(
                      "shrink-0",
                      active ? "text-primary-foreground" : "text-muted-foreground group-hover:text-foreground"
                    )} />
                    {!collapsed && <span>{item.label}</span>}
                  </Link>
                );
              })}
            </div>
          </div>
        ))}
      </nav>

      <div className="p-4 border-t">
        {!collapsed ? (
          <div className="bg-accent/50 rounded-lg p-3">
            <p className="text-xs font-medium text-muted-foreground mb-1">Status</p>
            <div className="flex items-center gap-2">
              <div className="h-2 w-2 rounded-full bg-green-500 animate-pulse" />
              <span className="text-xs font-bold uppercase tracking-tighter">Live Oversight</span>
            </div>
          </div>
        ) : (
          <div className="flex justify-center">
             <div className="h-2 w-2 rounded-full bg-green-500 animate-pulse" />
          </div>
        )}
      </div>
    </aside>
  );
}
