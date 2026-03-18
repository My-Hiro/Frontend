import { Mail, MessageCircle, Phone } from "lucide-react";
import { useEffect, useState } from "react";
import { merchantApi } from "../state/api";

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

export function SupportPage() {
  const [banner, setBanner] = useState<{
    id: string;
    title: string;
    subtitle: string;
    image: string;
    link?: string;
  } | null>(null);

  useEffect(() => {
    let mounted = true;
    void merchantApi
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
    <div className="page-stack">
      {banner && (
        <section className="panel support-banner" role="button" tabIndex={0} onClick={() => banner.link && window.open(banner.link, "_blank", "noopener,noreferrer")} data-tour="support-banner">
          <img src={banner.image} alt={banner.title} loading="lazy" />
          <div className="support-banner-overlay">
            <h3>{banner.title}</h3>
            <p>{banner.subtitle}</p>
          </div>
        </section>
      )}
      <section className="panel">
        <div className="panel-head">
          <div>
            <h3>myHiro Help & Support</h3>
            <p>Need help with discovery listings, ads, or verification? Reach us directly.</p>
          </div>
        </div>
        <div className="card-grid three" data-tour="support-contacts">
          {SUPPORT_CONTACTS.map((entry) => {
            const Icon = entry.icon;
            return (
              <a key={entry.title} href={entry.href} className="stat-card support-card" target="_blank" rel="noreferrer">
                <div className="line-item">
                  <strong>{entry.title}</strong>
                  <Icon size={18} />
                </div>
                <p>{entry.value}</p>
              </a>
            );
          })}
        </div>
      </section>
    </div>
  );
}
