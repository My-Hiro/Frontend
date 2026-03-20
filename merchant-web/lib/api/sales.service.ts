import { jsonFetch } from "./baseClient";
import type { Sale, SaleLine } from "@/types";

export const toUiSale = (row: Record<string, unknown>): Sale => ({
  id: String(row.id),
  items: Array.isArray(row.lines)
    ? row.lines.map((line: any) => {
        const entry = line as Record<string, unknown>;
        return {
          itemId: String(entry.item_id),
          itemName: String(entry.item_name),
          quantity: Number(entry.quantity ?? 0),
          price: Number(entry.unit_price ?? 0),
          taxMode: String(entry.tax_mode ?? "percent") === "fixed" ? "fixed" : "percent",
          taxValue: Number(entry.tax_value ?? 0),
          lineSubtotal: Number(entry.line_subtotal ?? 0),
          taxAmount: Number(entry.tax_amount ?? 0),
          lineTotal: Number(entry.line_total ?? 0)
        };
      })
    : [],
  subtotal: Number(row.subtotal ?? 0),
  taxTotal: Number(row.tax_total ?? 0),
  grandTotal: Number(row.grand_total ?? row.total ?? 0),
  total: Number(row.total ?? 0),
  customerContact: row.customer_contact ? String(row.customer_contact) : undefined,
  customerEmail: row.customer_email ? String(row.customer_email) : undefined,
  date: String(row.sold_at ?? new Date().toISOString()),
  paymentMethod: String(row.payment_method ?? "Cash") as Sale["paymentMethod"],
  cashier: String(row.cashier ?? "Store Manager")
});

export const salesService = {
  async completeSale(storeId: string, sale: Omit<Sale, "id" | "date">) {
    return jsonFetch<Record<string, unknown>>("/merchant/sales/complete", {
      method: "POST",
      body: JSON.stringify({
        store_id: storeId,
        payment_method: sale.paymentMethod,
        cashier: sale.cashier,
        customer_contact: sale.customerContact,
        customer_email: sale.customerEmail,
        lines: sale.items.map((line: SaleLine) => ({
          item_id: line.itemId,
          item_name: line.itemName,
          quantity: line.quantity,
          unit_price: line.price
        }))
      })
    }).then(toUiSale);
  },

  async downloadReceiptPdf(storeId: string, saleId: string): Promise<Blob> {
    const response = await fetch(
      `${process.env.VITE_API_BASE ?? "http://localhost:4000/api"}/merchant/sales/${encodeURIComponent(saleId)}/receipt.pdf?store_id=${encodeURIComponent(storeId)}`
    );
    if (!response.ok) {
      throw new Error(`Receipt download failed: ${response.status}`);
    }
    return response.blob();
  },

  async sendReceiptEmail(storeId: string, saleId: string, email: string) {
    return jsonFetch<Record<string, unknown>>(
      `/merchant/sales/${encodeURIComponent(saleId)}/receipt/email`,
      {
        method: "POST",
        body: JSON.stringify({ store_id: storeId, email })
      }
    );
  },

  async createReceiptWhatsAppLink(storeId: string, saleId: string, phone: string) {
    return jsonFetch<{
      sent: boolean;
      channel: string;
      destination: string;
      sale_id: string;
      receipt_url: string;
      whatsapp_link: string;
    }>(`/merchant/sales/${encodeURIComponent(saleId)}/receipt/whatsapp-link`, {
      method: "POST",
      body: JSON.stringify({ store_id: storeId, phone })
    });
  }
};
