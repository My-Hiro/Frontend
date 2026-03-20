import type { Metadata } from "next";
import { Providers } from "./Providers";
import { DashboardLayout } from "../components/layout/DashboardLayout";
import "./globals.css";

export const metadata: Metadata = {
  title: "myHiro Admin | Platform Oversight",
  description: "Advanced inventory and discovery management for myHiro platform.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className="antialiased">
        <Providers>
          <DashboardLayout>{children}</DashboardLayout>
        </Providers>
      </body>
    </html>
  );
}
