import type { ReactNode } from "react";

interface Props {
  label: string;
  value: string;
  hint: string;
  icon: ReactNode;
}

export function MetricCard({ label, value, hint, icon }: Props) {
  return (
    <section className="metric-card">
      <div>
        <p>{label}</p>
        <h3>{value}</h3>
        <small>{hint}</small>
      </div>
      <div className="metric-icon">{icon}</div>
    </section>
  );
}

