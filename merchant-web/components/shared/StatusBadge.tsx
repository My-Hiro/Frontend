import { AlertTriangle, CheckCircle2, CircleOff, Clock3 } from "lucide-react";
import type { InventoryStatus } from "@/types";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

interface Props {
  status: InventoryStatus;
  className?: string;
}

export function StatusBadge({ status, className }: Props) {
  if (status === "in-stock") {
    return (
      <Badge variant="outline" className={cn("bg-green-500/10 text-green-600 border-green-500/20 gap-1.5", className)}>
        <CheckCircle2 size={14} />
        In stock
      </Badge>
    );
  }
  if (status === "low-stock") {
    return (
      <Badge variant="outline" className={cn("bg-amber-500/10 text-amber-600 border-amber-500/20 gap-1.5", className)}>
        <AlertTriangle size={14} />
        Low stock
      </Badge>
    );
  }
  if (status === "out-of-stock") {
    return (
      <Badge variant="outline" className={cn("bg-red-500/10 text-red-600 border-red-500/20 gap-1.5", className)}>
        <CircleOff size={14} />
        Out of stock
      </Badge>
    );
  }
  return (
    <Badge variant="outline" className={cn("bg-slate-500/10 text-slate-600 border-slate-500/20 gap-1.5", className)}>
      <Clock3 size={14} />
      Expired
    </Badge>
  );
}
