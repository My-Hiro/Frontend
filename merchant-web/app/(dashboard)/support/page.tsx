'use client';

import { Mail, MessageCircle, Phone } from "lucide-react";
import { useEffect, useState } from "react";
import { storeService } from "@/lib/api/store.service";

const SUPPORT_CONTACTS = [
  {
    icon: Phone,
    title: "Call Support",
    value: "+233 30 700 7000",
    href: "tel:+233307007000"
  },
  {
    icon: MessageCircle,
    title: "WhatsApp",
    value: "+233 24 700 7000",
    href: "https://wa.me/233247007000"
  },
  {
    icon: Mail,
    title: "Email",
    value: "support@myhiro.gh",
    href: "mailto:support@myhiro.gh"
  }
];

export default function SupportPage() {
  const [banner, setBanner] = useState<{
    id: string;
    title: string;
    subtitle: string;
    image: string;
    link?: string;
  } | null>(null);

  useEffect(() => {
    let mounted = true;
    void storeService
      .getSupportBanner()
      .then((row) => {
        if (!mounted) return;
        setBanner(row);
      })
      .catch(() => undefined);
    return () => {
      mounted = false;
    };
  }, []);

  return (
    <div className="flex flex-col gap-6">
      {banner && (
        <section 
          className="relative h-48 overflow-hidden rounded-xl cursor-pointer group" 
          role="button" 
          tabIndex={0} 
          onClick={() => banner.link && window.open(banner.link, "_blank", "noopener,noreferrer")} 
          data-tour="support-banner"
        >
          <img src={banner.image} alt={banner.title} className="absolute inset-0 h-full w-full object-cover transition-transform duration-500 group-hover:scale-105" loading="lazy" />
          <div className="absolute inset-0 bg-gradient-to-r from-black/60 to-transparent flex flex-col justify-center px-8">
            <h3 className="text-2xl font-bold text-white mb-2">{banner.title}</h3>
            <p className="text-white/80 max-w-md">{banner.subtitle}</p>
          </div>
        </section>
      )}

      <div className="grid gap-6">
        <div className="flex flex-col gap-1">
          <h3 className="text-xl font-bold tracking-tight">myHiro Help & Support</h3>
          <p className="text-sm text-muted-foreground">Need help with discovery listings, ads, or verification? Reach us directly.</p>
        </div>
        
        <div className="grid gap-4 md:grid-cols-3" data-tour="support-contacts">
          {SUPPORT_CONTACTS.map((entry) => {
            const Icon = entry.icon;
            return (
              <a 
                key={entry.title} 
                href={entry.href} 
                className="flex flex-col gap-3 rounded-xl border bg-card p-5 transition-all hover:border-primary hover:shadow-md" 
                target="_blank" 
                rel="noreferrer"
              >
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold uppercase tracking-widest text-muted-foreground">{entry.title}</span>
                  <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center text-primary">
                    <Icon size={18} />
                  </div>
                </div>
                <p className="text-lg font-bold">{entry.value}</p>
              </a>
            );
          })}
        </div>
      </div>
    </div>
  );
}
