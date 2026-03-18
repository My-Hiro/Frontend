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
import type { MenuMode, ViewId } from "../../state/types";

interface Props {
  currentView: ViewId;
  onChange: (view: ViewId) => void;
  menuMode: MenuMode;
  onMenuModeChange: (mode: MenuMode) => void;
  onSignOut: () => void;
}

const menu: Array<{ id: ViewId; label: string; icon: typeof LayoutDashboard }> = [
  { id: "dashboard", label: "Dashboard", icon: LayoutDashboard },
  { id: "inventory", label: "Inventory", icon: Package },
  { id: "categories", label: "Categories", icon: Tags },
  { id: "suppliers", label: "Suppliers", icon: Truck },
  { id: "sales", label: "Sales", icon: ShoppingCart },
  { id: "messages", label: "Messages", icon: MessageSquare },
  { id: "reports", label: "Reports", icon: BarChart3 },
  { id: "support", label: "Support", icon: LifeBuoy },
  { id: "settings", label: "Settings", icon: Settings }
];

const basicMenuIds = new Set<ViewId>(["inventory", "sales", "messages", "settings"]);

export function MobileNav({
  currentView,
  onChange,
  menuMode,
  onMenuModeChange,
  onSignOut
}: Props) {
  const visibleMenu = menuMode === "basic" ? menu.filter((entry) => basicMenuIds.has(entry.id)) : menu;

  return (
    <nav className="mobile-nav-shell" aria-label="Merchant navigation">
      <div className="mobile-nav-rail">
        <div className="mobile-mode-toggle" aria-label="Navigation mode">
          <button
            type="button"
            className={`mobile-mode-toggle-btn ${menuMode === "basic" ? "active" : ""}`}
            onClick={() => onMenuModeChange("basic")}
          >
            Basic
          </button>
          <button
            type="button"
            className={`mobile-mode-toggle-btn ${menuMode === "advanced" ? "active" : ""}`}
            onClick={() => onMenuModeChange("advanced")}
          >
            Advanced
          </button>
        </div>
        {visibleMenu.map((entry) => {
          const Icon = entry.icon;
          const active = currentView === entry.id;
          return (
            <button
              key={entry.id}
              type="button"
              className={`mobile-nav-item ${active ? "active" : ""}`}
              onClick={() => onChange(entry.id)}
              data-tour={`nav-${entry.id}`}
              aria-current={active ? "page" : undefined}
            >
              <Icon size={16} />
              <span>{entry.label}</span>
            </button>
          );
        })}
        <button
          type="button"
          className="mobile-nav-item mobile-nav-signout"
          onClick={onSignOut}
          data-tour="nav-signout"
        >
          <LogOut size={16} />
          <span>Sign out</span>
        </button>
      </div>
    </nav>
  );
}
