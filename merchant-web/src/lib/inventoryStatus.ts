import type { InventoryItem, InventoryStatus } from "../state/types";

type InventoryStatusInput = Pick<InventoryItem, "quantity" | "minQuantity" | "expiryDate">;

export const deriveInventoryStatus = (item: InventoryStatusInput): InventoryStatus => {
  if (item.quantity <= 0) {
    return "out-of-stock";
  }
  if (item.quantity <= item.minQuantity) {
    return "low-stock";
  }
  if (item.expiryDate && new Date(item.expiryDate).getTime() < Date.now()) {
    return "expired";
  }
  return "in-stock";
};
