'use client';

import { Sidebar } from "@/components/layout/Sidebar";
import { Topbar } from "@/components/layout/Topbar";
import { MobileNav } from "@/components/layout/MobileNav";
import { useUiStore } from "@/lib/store/ui-store";
import { useAuthStore } from "@/lib/store/auth-store";
import { useStoreProfile } from "@/hooks/useStoreProfile";
import { useRouter } from "next/navigation";
import { useEffect, useMemo } from "react";
import { MerchantProvider } from "@/lib/state/merchantContext";
import { resolveLocale } from "@/lib/format";

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { session, loading: authLoading, signOut } = useAuthStore();
  const router = useRouter();
  
  const { menuMode, setMenuMode } = useUiStore();
  
  const storeId = "store-main-001"; // Placeholder
  const { profile } = useStoreProfile(storeId);

  useEffect(() => {
    if (!authLoading && !session) {
      router.push("/login");
    }
  }, [session, authLoading, router]);

  const merchantContextValue = useMemo(() => ({
    storeId: profile?.storeId || storeId,
    storeName: profile?.name || "My Store",
    currency: profile?.currency || "GHS",
    language: profile?.language || "en",
    locale: resolveLocale(profile?.language || "en"),
    timezone: profile?.timezone || "Africa/Accra",
    formatMoney: (val: number) => `GHC ${val.toLocaleString()}`,
    formatDateTime: (iso: string) => new Date(iso).toLocaleString(),
  }), [profile]);

  if (authLoading || !session) return null;

  return (
    <MerchantProvider value={merchantContextValue}>
      <div className="flex h-screen overflow-hidden bg-background text-foreground">
        <Sidebar
          onSignOut={signOut}
        />
        <div className="flex flex-col flex-1 w-full overflow-hidden">
          <Topbar
            storeLiveStatus="offline"
            onStoreLiveStatusChange={() => {}} 
          />
          <main className="flex-1 overflow-auto p-4 lg:p-6 bg-muted/10">
            <div className="mx-auto max-w-7xl">
              {children}
            </div>
          </main>
          <MobileNav
            menuMode={menuMode}
            onMenuModeChange={setMenuMode}
            onSignOut={signOut}
          />
        </div>
      </div>
    </MerchantProvider>
  );
}
