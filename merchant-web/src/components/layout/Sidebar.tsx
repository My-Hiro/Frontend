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
  Truck
} from "lucide-react";
import type { MenuMode, ViewId } from "../../state/types";

interface Props {
  currentView: ViewId;
  onChange: (view: ViewId) => void;
  menuMode: MenuMode;
  onMenuModeChange: (mode: MenuMode) => void;
  expanded: boolean;
  onToggle: () => void;
  onSignOut: () => void;
}

const menu = [
  { id: "dashboard", label: "Dashboard", icon: LayoutDashboard },
  { id: "inventory", label: "Inventory", icon: Package },
  { id: "categories", label: "Categories", icon: Tags },
  { id: "suppliers", label: "Suppliers", icon: Truck },
  { id: "sales", label: "Sales", icon: ShoppingCart },
  { id: "messages", label: "Messages", icon: MessageSquare },
  { id: "reports", label: "Reports", icon: BarChart3 },
  { id: "support", label: "Support", icon: LifeBuoy },
  { id: "settings", label: "Settings", icon: Settings }
] as const;

const basicMenuIds = new Set<ViewId>(["inventory", "sales", "messages", "settings"]);

export function Sidebar({
  currentView,
  onChange,
  menuMode,
  onMenuModeChange,
  expanded,
  onToggle,
  onSignOut
}: Props) {
  const visibleMenu = menuMode === "basic" ? menu.filter((entry) => basicMenuIds.has(entry.id)) : menu;

  return (
    <aside className={`sidebar ${expanded ? "expanded" : "collapsed"}`}>
      <div className="sidebar-brand">
        <div className="brand-icon">
          <Package size={20} />
        </div>
        {expanded && (
          <div>
            <h1>myHiro merchant</h1>
            <p>Store operations</p>
          </div>
        )}
      </div>
      <nav className="sidebar-nav">
        {visibleMenu.map((entry) => {
          const Icon = entry.icon;
          const active = entry.id === currentView;
          return (
            <button
              key={entry.id}
              type="button"
              className={`nav-item ${active ? "active" : ""}`}
              onClick={() => onChange(entry.id)}
              title={expanded ? "" : entry.label}
              data-tour={`nav-${entry.id}`}
            >
              <Icon size={18} />
              {expanded && <span>{entry.label}</span>}
            </button>
          );
        })}
        <div className={`menu-mode-toggle ${expanded ? "expanded" : "collapsed"}`}>
          {expanded && <small>Menu mode</small>}
          <div className="mode-toggle-row" aria-label="Navigation mode">
            <button
              type="button"
              className={`mode-toggle-btn ${menuMode === "basic" ? "active" : ""}`}
              onClick={() => onMenuModeChange("basic")}
            >
              {expanded ? "Basic" : "B"}
            </button>
            <button
              type="button"
              className={`mode-toggle-btn ${menuMode === "advanced" ? "active" : ""}`}
              onClick={() => onMenuModeChange("advanced")}
            >
              {expanded ? "Advanced" : "A"}
            </button>
          </div>
        </div>
        <button
          type="button"
          className="nav-item nav-item-signout"
          onClick={onSignOut}
          title={expanded ? "" : "Sign out"}
          data-tour="nav-signout"
        >
          <LogOut size={18} />
          {expanded && <span>Sign out</span>}
        </button>
      </nav>
      <button type="button" className="sidebar-toggle" onClick={onToggle}>
        {expanded ? "Collapse" : "Expand"}
      </button>
    </aside>
  );
}
