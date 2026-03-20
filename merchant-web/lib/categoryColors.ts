const CATEGORY_COLOR_OVERRIDES: Record<string, string> = {
  groceries_food: "#3257D0",
  kids_babies: "#16A34A",
  pharmacy_health_wellness: "#DC2626",
  household_cleaning: "#0EA5E9",
  personal_care_beauty: "#DB2777",
  electronics_appliances: "#9333EA",
  auto_spare_parts: "#D97706",
  lighting_hardware: "#0891B2",
  office_school: "#14B8A6",
  fashion_clothing: "#EC4899",
  more: "#64748B"
};

const FALLBACK_PALETTE = [
  "#3257D0",
  "#16A34A",
  "#DC2626",
  "#9333EA",
  "#D97706",
  "#0891B2",
  "#14B8A6",
  "#EC4899",
  "#0EA5E9",
  "#7C3AED",
  "#B45309"
];

export const getCategoryColor = (
  categoryId: string,
  fallback?: string,
  index = 0
): string => {
  const normalized = categoryId.trim().toLowerCase();
  if (CATEGORY_COLOR_OVERRIDES[normalized]) {
    return CATEGORY_COLOR_OVERRIDES[normalized];
  }
  if (fallback && fallback.trim()) {
    return fallback;
  }
  return FALLBACK_PALETTE[index % FALLBACK_PALETTE.length];
};

