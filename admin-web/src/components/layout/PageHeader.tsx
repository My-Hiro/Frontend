"use client";

import Link from "next/link";
import { ChevronRight, Home } from "lucide-react";
import { usePathname } from "next/navigation";
import { cn } from "../../lib/utils";

interface PageHeaderProps {
  title: string;
  description?: string;
  actions?: React.ReactNode;
}

export function PageHeader({ title, description, actions }: PageHeaderProps) {
  const pathname = usePathname();
  const segments = pathname.split("/").filter(Boolean);

  return (
    <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between mb-8">
      <div className="space-y-2">
        <nav className="flex items-center gap-2 text-xs font-medium text-muted-foreground">
          <Link href="/" className="hover:text-primary transition-colors flex items-center gap-1">
            <Home size={12} />
            <span>Admin</span>
          </Link>
          {segments.map((segment, idx) => {
            const path = `/${segments.slice(0, idx + 1).join("/")}`;
            const isLast = idx === segments.length - 1;
            const label = segment.charAt(0).toUpperCase() + segment.slice(1).replace(/-/g, " ");
            
            return (
              <div key={path} className="flex items-center gap-2">
                <ChevronRight size={12} className="text-muted-foreground/50" />
                {isLast ? (
                  <span className="text-foreground font-bold">{label}</span>
                ) : (
                  <Link href={path} className="hover:text-primary transition-colors">
                    {label}
                  </Link>
                )}
              </div>
            );
          })}
        </nav>
        <div>
          <h2 className="text-3xl font-bold tracking-tight">{title}</h2>
          {description && <p className="text-muted-foreground mt-1">{description}</p>}
        </div>
      </div>
      {actions && <div className="flex items-center gap-3">{actions}</div>}
    </div>
  );
}
