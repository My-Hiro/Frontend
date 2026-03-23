"use client";

import { usePathname, useRouter } from "next/navigation";
import { TopBar } from "../TopBar";
import { BottomNav, type TabId } from "../BottomNav";
import { SideNav } from "../SideNav";
import { AuthGate } from "../auth/AuthGate";
import { LocationAccessPrompt } from "../LocationAccessPrompt";
import { useAppStore } from "@/store/useAppStore";
import { useEffect, useState } from "react";
import { loadGoogleMapsJs } from "@/lib/googleMaps";

export function LayoutShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const {
    location,
    setLocation,
    authPromptOpen,
    setAuthPromptOpen,
    authMode,
    setAuthMode,
    locationPromptOpen,
    setLocationPromptOpen,
    setSession,
    searchQuery,
    setSearchQuery,
  } = useAppStore();

  const [mounted, setMounted] = useState(false);
  const [mapsReady, setMapsReady] = useState(false);

  useEffect(() => {
    setMounted(true);
    loadGoogleMapsJs()
      .then(() => setMapsReady(true))
      .catch(() => console.error("Failed to load Google Maps"));
  }, []);

  const getActiveTab = (): TabId => {
    if (pathname === "/") return "home";
    if (pathname.startsWith("/search")) return "search";
    if (pathname.startsWith("/categories") || pathname.startsWith("/category")) return "categories";
    if (pathname.startsWith("/saved")) return "saved";
    if (pathname.startsWith("/profile")) return "profile";
    return "home";
  };

  const handleTabChange = (tab: TabId) => {
    switch (tab) {
      case "home":
        router.push("/");
        break;
      case "search":
        router.push("/search");
        break;
      case "categories":
        router.push("/categories");
        break;
      case "saved":
        router.push("/saved");
        break;
      case "profile":
        router.push("/profile");
        break;
    }
  };

  if (!mounted) return null;

  return (
    <div className="flex h-screen bg-background text-foreground overflow-hidden">
      {/* Side Nav for Desktop - fixed height, own scroll if needed */}
      <SideNav activeTab={getActiveTab()} onTabChange={handleTabChange} />

      <div className="flex-1 flex flex-col min-w-0 h-full overflow-y-auto">
        <TopBar
          location={location}
          onLocationClick={() => setLocationPromptOpen(true)}
          onSearchFocus={() => router.push("/search")}
          showSearchInput={pathname === "/search"}
          searchValue={searchQuery}
          onSearchChange={setSearchQuery}
          onBack={pathname !== "/" ? () => router.back() : undefined}
        />

        <main className="flex-1  max-w-7xl mx-auto w-full px-4 lg:px-6 py-6 pb-32 lg:pb-12 ">
          {children}
        </main>

        {/* Bottom Nav for Mobile */}
        <BottomNav activeTab={getActiveTab()} onTabChange={handleTabChange} />
      </div>

      {/* Global Modals */}
      {authPromptOpen && (
        <AuthGate
          onAuthenticated={(session) => {
            setSession(session);
            setAuthPromptOpen(false);
          }}
          onLater={() => setAuthPromptOpen(false)}
        />
      )}

      {locationPromptOpen && (
        <LocationAccessPrompt
          onLocationSelect={(label) => {
            setLocation(label);
            setLocationPromptOpen(false);
          }}
          onClose={() => setLocationPromptOpen(false)}
        />
      )}
    </div>
  );
}