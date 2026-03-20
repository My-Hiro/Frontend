import { cn } from "../../lib/utils";

interface StatCardProps {
  title: string;
  value: string | number;
  description?: string;
  icon?: React.ReactNode;
  trend?: {
    value: number;
    isUp: boolean;
  };
  className?: string;
  loading?: boolean;
}

export function StatCard({ title, value, description, icon, trend, className, loading }: StatCardProps) {
  if (loading) {
    return (
      <div className={cn("bg-card border rounded-xl p-6 space-y-3", className)}>
        <div className="flex items-center justify-between">
          <div className="h-4 w-24 bg-muted animate-pulse rounded" />
          <div className="h-5 w-5 bg-muted animate-pulse rounded-full" />
        </div>
        <div className="h-8 w-16 bg-muted animate-pulse rounded" />
        <div className="h-3 w-32 bg-muted animate-pulse rounded" />
      </div>
    );
  }

  return (
    <div className={cn("bg-card border rounded-xl p-6 shadow-sm hover:shadow-md transition-shadow group relative overflow-hidden", className)}>
      <div className="flex items-start justify-between">
        <div className="space-y-1">
          <p className="text-sm font-medium text-muted-foreground group-hover:text-foreground transition-colors uppercase tracking-wider">{title}</p>
          <h3 className="text-2xl font-bold tracking-tight">{value}</h3>
          {description && <p className="text-xs text-muted-foreground">{description}</p>}
        </div>
        {icon && <div className="p-2 rounded-lg bg-primary/5 text-primary group-hover:bg-primary/10 transition-colors">{icon}</div>}
      </div>
      {trend && (
        <div className="mt-4 flex items-center gap-1.5">
          <span className={cn(
            "text-xs font-bold px-1.5 py-0.5 rounded",
            trend.isUp ? "bg-green-100 text-green-700" : "bg-red-100 text-red-700"
          )}>
            {trend.isUp ? "+" : "-"}{trend.value}%
          </span>
          <span className="text-[10px] text-muted-foreground font-medium">vs last period</span>
        </div>
      )}
      <div className="absolute bottom-0 left-0 w-full h-1 bg-primary/10 scale-x-0 group-hover:scale-x-100 transition-transform origin-left duration-300" />
    </div>
  );
}
