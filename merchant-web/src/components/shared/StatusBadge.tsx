import { AlertTriangle, CheckCircle2, CircleOff, Clock3 } from "lucide-react";
import type { InventoryStatus } from "../../state/types";

interface Props {
  status: InventoryStatus;
}

export function StatusBadge({ status }: Props) {
  if (status === "in-stock") {
    return (
      <span className="status-badge status-in-stock">
        <CheckCircle2 size={14} />
        In stock
      </span>
    );
  }
  if (status === "low-stock") {
    return (
      <span className="status-badge status-low-stock">
        <AlertTriangle size={14} />
        Low stock
      </span>
    );
  }
  if (status === "out-of-stock") {
    return (
      <span className="status-badge status-out-of-stock">
        <CircleOff size={14} />
        Out of stock
      </span>
    );
  }
  return (
    <span className="status-badge status-expired">
      <Clock3 size={14} />
      Expired
    </span>
  );
}

