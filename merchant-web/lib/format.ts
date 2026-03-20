export const resolveLocale = (language: string): string => {
  const normalized = language.trim().toLowerCase();
  if (normalized.startsWith("fr")) {
    return "fr-GH";
  }
  return "en-GH";
};

export const formatMoney = (amount: number, locale: string, currency: string): string => {
  const safeAmount = Number.isFinite(amount) ? amount : 0;
  const safeCurrency = currency?.trim() ? currency.trim().toUpperCase() : "GHS";
  if (safeCurrency === "GHS") {
    const formatted = new Intl.NumberFormat(locale, {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    }).format(safeAmount);
    return `GHC${formatted}`;
  }
  try {
    return new Intl.NumberFormat(locale, {
      style: "currency",
      currency: safeCurrency,
      maximumFractionDigits: 2
    }).format(safeAmount);
  } catch {
    // Fallback for unsupported currency/locale combos.
    return `${safeCurrency} ${safeAmount.toFixed(2)}`;
  }
};

export const formatDateTime = (
  iso: string,
  locale: string,
  timezone: string,
  dateFormat: "dmy" | "mdy" | "ymd" = "dmy"
): string => {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) {
    return iso;
  }
  try {
    const parts = new Intl.DateTimeFormat(locale, {
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
      hour12: false,
      timeZone: timezone
    }).formatToParts(date);

    const values: Record<string, string> = {};
    for (const part of parts) {
      if (part.type !== "literal") {
        values[part.type] = part.value;
      }
    }

    const year = values.year ?? "";
    const month = values.month ?? "";
    const day = values.day ?? "";
    const hour = values.hour ?? "";
    const minute = values.minute ?? "";

    const datePart =
      dateFormat === "ymd"
        ? `${year}-${month}-${day}`
        : dateFormat === "mdy"
          ? `${month}/${day}/${year}`
          : `${day}/${month}/${year}`;

    const timePart = hour && minute ? `${hour}:${minute}` : "";
    return timePart ? `${datePart} ${timePart}` : datePart;
  } catch {
    return date.toLocaleString();
  }
};
