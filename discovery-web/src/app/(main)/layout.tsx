import { SideNav } from "@/components/shared/SideNav";
import { TopBar } from "@/components/shared/TopBar";
import { BottomNav } from "@/components/shared/BottomNav";

export default function MainLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen bg-background text-foreground flex">
      <SideNav />
      
      <div className="flex-1 flex flex-col min-w-0 pb-16 lg:pb-0 lg:pl-64">
        {/* TopBar can be used here or inside specific pages if needed */}
        {/* For global consistency, we'll keep it here, but pages can override it */}
        <div className="flex-1">
          {children}
        </div>

        <BottomNav />
      </div>
    </div>
  );
}
