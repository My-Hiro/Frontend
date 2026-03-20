import { jsonFetch } from "./baseClient";
import type { InventoryItem, ItemPlacement } from "@/types";

const normalizePlacementAudience = (
  raw: unknown
): NonNullable<ItemPlacement["audienceLabel"]> => {
  const value = String(raw ?? "").toLowerCase();
  if (value === "men" || value === "women" || value === "boys" || value === "girls") {
    return value;
  }
  return "general";
};

const normalizePlacements = (row: Record<string, unknown>): ItemPlacement[] => {
  const raw = row.placements;
  if (Array.isArray(raw) && raw.length > 0) {
    const parsed = raw
      .map((entry): ItemPlacement | null => {
        const candidate = entry as Record<string, unknown>;
        const categoryId = String(candidate.category_id ?? "").trim();
        const subcategoryLabel = String(candidate.subcategory_label ?? "").trim();
        if (!categoryId) {
          return null;
        }
        const placement: ItemPlacement = {
          categoryId,
          subcategoryLabel: subcategoryLabel || "General",
          audienceLabel: normalizePlacementAudience(candidate.audience_label)
        };
        if (candidate.subcategory_id) {
          placement.subcategoryId = String(candidate.subcategory_id);
        }
        return placement;
      })
      .filter((entry): entry is ItemPlacement => entry !== null);
    if (parsed.length > 0) {
      return parsed;
    }
  }
  const legacyCategory = String(row.category ?? "").trim();
  const legacySubcategory = String(row.subcategory ?? "").trim();
  return [
    {
      categoryId: legacyCategory || "groceries_food",
      subcategoryLabel: legacySubcategory || "General",
      audienceLabel: "general"
    }
  ];
};

export const toUiItem = (row: Record<string, unknown>): InventoryItem => {
  const placements = normalizePlacements(row);
  const primary = placements[0];
  return {
    id: String(row.id),
    name: String(row.name),
    sku: String(row.sku),
    barcode: String(row.barcode),
    category: primary?.categoryId ?? String(row.category ?? ""),
    subcategory: primary?.subcategoryLabel ?? String(row.subcategory ?? ""),
    placements,
    quantity: Number(row.quantity ?? 0),
    minQuantity: Number(row.min_quantity ?? 0),
    maxQuantity: Number(row.max_quantity ?? 0),
    unit: String(row.unit ?? "units"),
    costPrice: Number(row.cost_price ?? 0),
    sellingPrice: Number(row.selling_price ?? 0),
    taxMode: String(row.tax_mode ?? "percent") === "fixed" ? "fixed" : "percent",
    taxValue: Number(row.tax_value ?? 0),
    supplier: String(row.supplier ?? ""),
    location: String(row.location ?? "Main Store"),
    status: String(row.status ?? "in-stock") as InventoryItem["status"],
    expiryDate: row.expiry_date ? String(row.expiry_date) : undefined,
    batchNumber: row.batch_number ? String(row.batch_number) : undefined,
    lastRestocked: row.last_restocked ? String(row.last_restocked) : undefined,
    description: row.description ? String(row.description) : undefined,
    imageUrl: row.image_url ? String(row.image_url) : undefined
  };
};

const fromUiItem = (row: InventoryItem) => ({
  id: row.id,
  name: row.name,
  sku: row.sku,
  barcode: row.barcode,
  category: row.placements[0]?.categoryId ?? row.category,
  subcategory: row.placements[0]?.subcategoryLabel ?? row.subcategory,
  placements: row.placements.map((entry: ItemPlacement) => ({
    category_id: entry.categoryId,
    subcategory_id: entry.subcategoryId,
    subcategory_label: entry.subcategoryLabel,
    audience_label: normalizePlacementAudience(entry.audienceLabel)
  })),
  quantity: row.quantity,
  min_quantity: row.minQuantity,
  max_quantity: row.maxQuantity,
  unit: row.unit,
  cost_price: row.costPrice,
  selling_price: row.sellingPrice,
  tax_mode: row.taxMode,
  tax_value: row.taxValue,
  supplier: row.supplier,
  location: row.location,
  expiry_date: row.expiryDate,
  batch_number: row.batchNumber,
  last_restocked: row.lastRestocked,
  description: row.description,
  image_url: row.imageUrl
});

export const inventoryService = {
  async listInventory(storeId = "store-main-001", limit = 200) {
    const inventory = await jsonFetch<{ data: Array<Record<string, unknown>> }>(
      `/merchant/inventory?store_id=${storeId}&limit=${limit}`
    );
    return inventory.data.map(toUiItem);
  },

  async upsertItem(item: InventoryItem) {
    const payload = await jsonFetch<Record<string, unknown>>("/merchant/inventory/upsert", {
      method: "POST",
      body: JSON.stringify(fromUiItem(item))
    });
    return toUiItem(payload);
  },

  async adjustStock(
    storeId: string,
    input: { itemId: string; quantity: number; reason: string; warehouse: string }
  ) {
    const payload = await jsonFetch<Record<string, unknown>>("/merchant/inventory/adjust", {
      method: "POST",
      body: JSON.stringify({
        store_id: storeId,
        item_id: input.itemId,
        quantity: input.quantity,
        reason: input.reason,
        warehouse: input.warehouse
      })
    });
    return toUiItem(payload);
  },

  async importInventoryCsv(storeId: string, csv: string) {
    return jsonFetch<{ imported: number; skipped: number }>("/merchant/inventory/import-csv", {
      method: "POST",
      body: JSON.stringify({ store_id: storeId, csv })
    });
  },

  async deleteItem(storeId: string, itemId: string) {
    await jsonFetch(`/merchant/inventory/${itemId}?store_id=${storeId}`, {
      method: "DELETE"
    });
  }
};
