import React from "react";
import { BadgeCheck, ShieldCheck } from "lucide-react";
import type { VerificationStatus } from "../state/types";

interface VerificationBadgeProps {
  status: VerificationStatus;
  // Kept for backward compatibility; label now always shown.
  showLabel?: boolean;
  className?: string;
}

const config: Record<
  VerificationStatus,
  { label: string; icon: React.ReactNode; labelColor: string }
> = {
  unverified: {
    label: "Unverified",
    icon: (
      <span
        className="inline-flex items-center justify-center w-4 h-4 rounded-full border border-[#9CA3AF]"
        aria-hidden="true"
      />
    ),
    labelColor: "#6B7280"
  },
  verified: {
    label: "Verified",
    icon: (
      <span
        className="inline-flex items-center justify-center w-4 h-4 rounded-full bg-primary/10 border border-primary/30"
        aria-hidden="true"
      >
        <ShieldCheck className="w-2.5 h-2.5 text-primary" />
      </span>
    ),
    labelColor: "var(--primary)"
  },
  partner: {
    label: "Partner",
    icon: (
      <span
        className="inline-flex items-center justify-center w-4 h-4 rounded-full bg-[#dcfce7] border border-[#86efac]"
        aria-hidden="true"
      >
        <BadgeCheck className="w-2.5 h-2.5 text-[#16A34A]" />
      </span>
    ),
    labelColor: "#166534"
  }
};

export function VerificationBadge({
  status,
  showLabel: _showLabel = true,
  className = ""
}: VerificationBadgeProps) {
  const cfg = config[status];

  return (
    <span
      className={`inline-flex items-center gap-1 ${className}`}
      title={cfg.label}
      aria-label={`Store status: ${cfg.label}`}
    >
      {cfg.icon}
      <span className="text-[10px] leading-none" style={{ color: cfg.labelColor }}>
        {cfg.label}
      </span>
    </span>
  );
}
