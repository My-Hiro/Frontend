import { useMemo } from "react";
import { useAppStore } from "./useAppStore";

const isoFromDateInput = (value: string): string | undefined => {
  const trimmed = value.trim();
  if (!trimmed) return undefined;
  const ms = new Date(trimmed).getTime();
  if (!Number.isFinite(ms)) return undefined;
  return new Date(ms).toISOString();
};

export function useRangeInput() {
  const rangeMode = useAppStore((state) => state.rangeMode);
  const customStart = useAppStore((state) => state.customStart);
  const customEnd = useAppStore((state) => state.customEnd);

  return useMemo(() => {
    if (rangeMode === "custom") {
      return { start: isoFromDateInput(customStart), end: isoFromDateInput(customEnd) };
    }
    return { range: rangeMode };
  }, [rangeMode, customStart, customEnd]);
}
