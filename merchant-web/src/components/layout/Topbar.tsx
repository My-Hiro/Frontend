import { Bell, BookOpen, Moon, Search, Sun, UserCircle2 } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import type { MerchantLiveStatus } from "../../state/liveStatus";
import type { ViewId } from "../../state/types";
import { useMerchant } from "../../state/merchantContext";
import { TutorialMenu } from "../../tutorial/TutorialMenu";

const titles: Record<ViewId, string> = {
  dashboard: "Dashboard",
  inventory: "Inventory Management",
  categories: "Categories",
  suppliers: "Suppliers",
  sales: "Sales & Transactions",
  messages: "Store Messages",
  reports: "Reports",
  support: "Support",
  settings: "Settings"
};

interface Props {
  view: ViewId;
  theme: "light" | "dark";
  onToggleTheme: () => void;
  storeLiveStatus: MerchantLiveStatus;
  onStoreLiveStatusChange: (status: MerchantLiveStatus) => void;
  storeStatusBusy?: boolean;
}

export function Topbar({
  view,
  theme,
  onToggleTheme,
  storeLiveStatus,
  onStoreLiveStatusChange,
  storeStatusBusy
}: Props) {
  const { storeName } = useMerchant();
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
    <header className="topbar">
      <div>
        <h2>{titles[view]}</h2>
        <p>Manage your inventory efficiently</p>
      </div>
      <div className="topbar-actions">
        <div className="store-live-control">
          <div className="store-live-copy">
            <small>Store mode</small>
            <span className={`store-live-pill ${storeLiveStatus === "online" ? "is-online" : "is-offline"}`}>
              {storeLiveStatus === "online" ? "Online" : "Offline"}
            </span>
          </div>
          <label className="switch" aria-label="toggle store online status">
            <input
              type="checkbox"
              checked={storeLiveStatus === "online"}
              disabled={Boolean(storeStatusBusy)}
              onChange={(event) =>
                onStoreLiveStatusChange(event.target.checked ? "online" : "offline")
              }
            />
            <span />
          </label>
        </div>

        <label className="global-search">
          <Search size={18} />
          <input placeholder="Search products, SKU, barcode..." />
        </label>
        <button className="icon-btn" aria-label="notifications">
          <Bell size={18} />
          <span className="dot" />
        </button>
        <div className="tutorial-menu-anchor" ref={tutorialMenuRef}>
          <button
            className={`icon-btn ${menuOpen ? "active" : ""}`}
            aria-label="tutorial"
            aria-haspopup="menu"
            aria-expanded={menuOpen}
            data-tour="help-tutorial"
            onClick={() => setMenuOpen((prev) => !prev)}
          >
            <BookOpen size={18} />
          </button>
          {menuOpen && (
            <TutorialMenu
              currentView={view}
              onClose={() => setMenuOpen(false)}
            />
          )}
        </div>
        <button
          className="icon-btn theme-toggle-btn"
          type="button"
          onClick={onToggleTheme}
          aria-label={theme === "dark" ? "Switch to light mode" : "Switch to dark mode"}
          title={theme === "dark" ? "Light view" : "Night view"}
        >
          {theme === "dark" ? <Sun size={18} /> : <Moon size={18} />}
        </button>
        <div className="user-chip">
          <div>
            <strong>Store Manager</strong>
            <small>{storeName}</small>
          </div>
          <UserCircle2 size={22} />
        </div>
      </div>
    </header>
  );
}
