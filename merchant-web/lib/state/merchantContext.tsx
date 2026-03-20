import { createContext, useContext } from "react";

export interface MerchantContextValue {
  storeId: string;
  storeName: string;
  currency: string;
  language: string;
  locale: string;
  timezone: string;
  formatMoney: (amount: number) => string;
  formatDateTime: (iso: string) => string;
}

const MerchantContext = createContext<MerchantContextValue | null>(null);

export const MerchantProvider = MerchantContext.Provider;

export const useMerchant = (): MerchantContextValue => {
  const ctx = useContext(MerchantContext);
  if (!ctx) {
    throw new Error("MerchantProvider missing in component tree");
  }
  return ctx;
};

