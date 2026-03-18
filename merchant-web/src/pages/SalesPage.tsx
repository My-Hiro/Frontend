import { Minus, Plus, ShoppingCart } from "lucide-react";
import { useMemo, useState } from "react";
import { merchantApi } from "../state/api";
import { useMerchant } from "../state/merchantContext";
import type { InventoryItem, Sale, SaleLine } from "../state/types";

interface Props {
  items: InventoryItem[];
  sales: Sale[];
  onCompleteSale: (sale: Omit<Sale, "id" | "date">) => Promise<Sale>;
}

interface CartLine {
  item: InventoryItem;
  quantity: number;
}

const paymentLabels: Record<"Cash" | "Card" | "Mobile", string> = {
  Cash: "Cash",
  Card: "Card",
  Mobile: "Mobile Money"
};

const calculateLine = (item: InventoryItem, quantity: number) => {
  const lineSubtotal = Number((quantity * item.sellingPrice).toFixed(2));
  const taxAmount =
    item.taxMode === "fixed"
      ? Number((item.taxValue * quantity).toFixed(2))
      : Number((lineSubtotal * (item.taxValue / 100)).toFixed(2));
  const lineTotal = Number((lineSubtotal + taxAmount).toFixed(2));
  return { lineSubtotal, taxAmount, lineTotal };
};

export function SalesPage({ items, sales, onCompleteSale }: Props) {
  const { formatMoney, formatDateTime, storeName, storeId } = useMerchant();
  const [tab, setTab] = useState<"pos" | "history">("pos");
  const [search, setSearch] = useState("");
  const [cart, setCart] = useState<CartLine[]>([]);
  const [paymentMethod, setPaymentMethod] = useState<"Cash" | "Card" | "Mobile">("Cash");
  const [customerContact, setCustomerContact] = useState("");
  const [customerEmail, setCustomerEmail] = useState("");
  const [toast, setToast] = useState("");
  const [receipt, setReceipt] = useState<Sale | null>(null);
  const [receiptEmail, setReceiptEmail] = useState("");
  const [receiptPhone, setReceiptPhone] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [receiptBusy, setReceiptBusy] = useState<"" | "pdf" | "email" | "whatsapp">("");

  const options = useMemo(() => {
    const q = search.toLowerCase().trim();
    return items.filter((item) => {
      if (!q) {
        return true;
      }
      return (
        item.name.toLowerCase().includes(q) ||
        item.sku.toLowerCase().includes(q) ||
        item.barcode.includes(q)
      );
    });
  }, [items, search]);

  const addToCart = (item: InventoryItem) => {
    if (item.quantity === 0) {
      return;
    }
    setCart((current) => {
      const found = current.find((line) => line.item.id === item.id);
      if (!found) {
        return [...current, { item, quantity: 1 }];
      }
      if (found.quantity >= item.quantity) {
        return current;
      }
      return current.map((line) =>
        line.item.id === item.id ? { ...line, quantity: line.quantity + 1 } : line
      );
    });
  };

  const updateQuantity = (itemId: string, delta: number) => {
    setCart((current) =>
      current
        .map((line) => {
          if (line.item.id !== itemId) {
            return line;
          }
          const next = line.quantity + delta;
          if (next <= 0 || next > line.item.quantity) {
            return line;
          }
          return { ...line, quantity: next };
        })
        .filter((line) => line.quantity > 0)
    );
  };

  const setQuantity = (itemId: string, nextQuantity: number) => {
    setCart((current) =>
      current
        .map((line) => {
          if (line.item.id !== itemId) {
            return line;
          }
          const clamped = Math.max(1, Math.min(line.item.quantity, Math.floor(nextQuantity || 1)));
          return { ...line, quantity: clamped };
        })
        .filter((line) => line.quantity > 0)
    );
  };

  const removeItem = (itemId: string) => {
    setCart((current) => current.filter((line) => line.item.id !== itemId));
  };

  const summary = useMemo(() => {
    const subtotal = cart.reduce((sum, line) => sum + calculateLine(line.item, line.quantity).lineSubtotal, 0);
    const taxTotal = cart.reduce((sum, line) => sum + calculateLine(line.item, line.quantity).taxAmount, 0);
    const grandTotal = subtotal + taxTotal;
    return {
      subtotal: Number(subtotal.toFixed(2)),
      taxTotal: Number(taxTotal.toFixed(2)),
      grandTotal: Number(grandTotal.toFixed(2))
    };
  }, [cart]);

  const todaySales = sales.filter((sale) => {
    const date = new Date(sale.date);
    const now = new Date();
    return (
      date.getDate() === now.getDate() &&
      date.getMonth() === now.getMonth() &&
      date.getFullYear() === now.getFullYear()
    );
  });
  const todayRevenue = todaySales.reduce((sum, sale) => sum + sale.total, 0);

  const complete = async () => {
    if (cart.length === 0 || submitting) {
      return;
    }
    setSubmitting(true);
    try {
      const lines: SaleLine[] = cart.map((line) => {
        const { lineSubtotal, taxAmount, lineTotal } = calculateLine(line.item, line.quantity);
        return {
          itemId: line.item.id,
          itemName: line.item.name,
          quantity: line.quantity,
          price: line.item.sellingPrice,
          taxMode: line.item.taxMode,
          taxValue: line.item.taxValue,
          lineSubtotal,
          taxAmount,
          lineTotal
        };
      });

      const saved = await onCompleteSale({
        items: lines,
        subtotal: summary.subtotal,
        taxTotal: summary.taxTotal,
        grandTotal: summary.grandTotal,
        total: summary.grandTotal,
        customerContact: customerContact.trim() || undefined,
        customerEmail: customerEmail.trim() || undefined,
        paymentMethod,
        cashier: "Store Manager"
      });

      setReceipt(saved);
      setReceiptEmail(saved.customerEmail ?? "");
      setReceiptPhone(saved.customerContact ?? "");
      setCart([]);
      setCustomerContact("");
      setCustomerEmail("");
      setToast("Sale completed");
      setTimeout(() => setToast(""), 2200);
    } catch {
      setToast("Could not complete sale");
      setTimeout(() => setToast(""), 2600);
    } finally {
      setSubmitting(false);
    }
  };

  const downloadReceiptPdf = async () => {
    if (!receipt || receiptBusy) return;
    setReceiptBusy("pdf");
    try {
      const blob = await merchantApi.downloadReceiptPdf(storeId, receipt.id);
      const url = URL.createObjectURL(blob);
      window.open(url, "_blank", "noopener,noreferrer");
      setTimeout(() => URL.revokeObjectURL(url), 5_000);
    } catch {
      setToast("Could not open receipt PDF");
      setTimeout(() => setToast(""), 2600);
    } finally {
      setReceiptBusy("");
    }
  };

  const printReceipt = async () => {
    if (!receipt || receiptBusy) return;
    setReceiptBusy("pdf");
    try {
      const blob = await merchantApi.downloadReceiptPdf(storeId, receipt.id);
      const url = URL.createObjectURL(blob);
      const popup = window.open(url, "_blank", "noopener,noreferrer");
      setTimeout(() => {
        popup?.print();
      }, 450);
      setTimeout(() => URL.revokeObjectURL(url), 8_000);
    } catch {
      setToast("Could not print receipt");
      setTimeout(() => setToast(""), 2600);
    } finally {
      setReceiptBusy("");
    }
  };

  const sendReceiptEmail = async () => {
    if (!receipt || receiptBusy) return;
    const email = receiptEmail.trim();
    if (!email) {
      setToast("Enter customer email first.");
      setTimeout(() => setToast(""), 2600);
      return;
    }
    setReceiptBusy("email");
    try {
      await merchantApi.sendReceiptEmail(storeId, receipt.id, email);
      setToast("Receipt sent by email");
      setTimeout(() => setToast(""), 2400);
    } catch {
      setToast("Could not send email");
      setTimeout(() => setToast(""), 2600);
    } finally {
      setReceiptBusy("");
    }
  };

  const sendReceiptWhatsApp = async () => {
    if (!receipt || receiptBusy) return;
    const phone = receiptPhone.trim();
    if (!phone) {
      setToast("Enter customer contact first.");
      setTimeout(() => setToast(""), 2600);
      return;
    }
    setReceiptBusy("whatsapp");
    try {
      const response = await merchantApi.createReceiptWhatsAppLink(storeId, receipt.id, phone);
      window.open(response.whatsapp_link, "_blank", "noopener,noreferrer");
      setToast("Opening WhatsApp...");
      setTimeout(() => setToast(""), 2200);
    } catch {
      setToast("Could not create WhatsApp receipt link");
      setTimeout(() => setToast(""), 2800);
    } finally {
      setReceiptBusy("");
    }
  };

  return (
    <div className="page-stack">
      {toast && <div className="toast">{toast}</div>}
      {receipt && (
        <div className="modal-backdrop">
          <div className="modal large" role="dialog" aria-modal="true" aria-label="Receipt">
            <header>
              <h3>Receipt</h3>
              <button className="icon-btn" onClick={() => setReceipt(null)} aria-label="Close receipt">
                X
              </button>
            </header>
            <div className="modal-body">
              <div className="panel soft">
                <div className="line-item">
                  <div>
                    <strong>{storeName}</strong>
                    <small className="muted">{formatDateTime(receipt.date)}</small>
                  </div>
                  <strong>{formatMoney(receipt.grandTotal ?? receipt.total)}</strong>
                </div>
                <p className="muted" style={{ margin: "8px 0 0" }}>
                  Payment: {paymentLabels[receipt.paymentMethod]}
                </p>
              </div>

              <div className="table-wrap" style={{ marginTop: 12 }}>
                <table>
                  <thead>
                    <tr>
                      <th>Item</th>
                      <th>Qty</th>
                      <th>Subtotal</th>
                      <th>Tax</th>
                      <th>Total</th>
                    </tr>
                  </thead>
                  <tbody>
                    {receipt.items.map((line, index) => (
                      <tr key={`${receipt.id}-${index}`}>
                        <td>{line.itemName}</td>
                        <td>{line.quantity}</td>
                        <td>{formatMoney(line.lineSubtotal ?? line.quantity * line.price)}</td>
                        <td>{formatMoney(line.taxAmount ?? 0)}</td>
                        <td>{formatMoney(line.lineTotal ?? line.quantity * line.price)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <div className="form-grid receipt-contact-grid" style={{ marginTop: 12 }}>
                <label>
                  Customer contact
                  <input
                    placeholder="+233..."
                    value={receiptPhone}
                    onChange={(event) => setReceiptPhone(event.target.value)}
                  />
                </label>
                <label>
                  Customer email
                  <input
                    placeholder="customer@email.com"
                    value={receiptEmail}
                    onChange={(event) => setReceiptEmail(event.target.value)}
                  />
                </label>
              </div>

              <div className="inline-actions" style={{ marginTop: 12, justifyContent: "flex-end" }}>
                <button className="btn btn-outline" onClick={() => void printReceipt()} disabled={receiptBusy !== ""}>
                  Print
                </button>
                <button
                  className="btn btn-outline"
                  onClick={() => void downloadReceiptPdf()}
                  disabled={receiptBusy !== ""}
                >
                  PDF
                </button>
                <button
                  className="btn btn-outline"
                  onClick={() => void sendReceiptEmail()}
                  disabled={receiptBusy !== ""}
                >
                  Send email
                </button>
                <button
                  className="btn btn-primary"
                  onClick={() => void sendReceiptWhatsApp()}
                  disabled={receiptBusy !== ""}
                >
                  Send WhatsApp
                </button>
              </div>
            </div>
            <footer>
              <button className="btn btn-outline" onClick={() => setReceipt(null)}>
                Close
              </button>
            </footer>
          </div>
        </div>
      )}

      <div className="toolbar-row">
        <div>
          <h3>Sales & Point of Sale</h3>
          <p>Process sales and view transaction history</p>
        </div>
        <div className="inline-actions">
          <div className="pill">
            <small>Today's Sales</small>
            <strong>{todaySales.length} transactions</strong>
          </div>
          <div className="pill">
            <small>Today's Revenue</small>
            <strong>{formatMoney(todayRevenue)}</strong>
          </div>
        </div>
      </div>

      <section className="panel">
        <div className="tab-row" data-tour="sales-tab-pos">
          <button className={tab === "pos" ? "tab active" : "tab"} onClick={() => setTab("pos")}>
            Point of Sale
          </button>
          <button className={tab === "history" ? "tab active" : "tab"} onClick={() => setTab("history")}>
            Sales History
          </button>
        </div>

        {tab === "pos" ? (
          <div className="pos-grid">
            <div className="panel soft" data-tour="sales-product-grid">
              <input
                className="full-input"
                placeholder="Search products..."
                value={search}
                onChange={(event) => setSearch(event.target.value)}
              />
              <p className="muted" style={{ margin: "8px 0 0" }}>
                Tap a product to add it to the cart.
              </p>
              <div className="product-grid">
                {options.map((item) => (
                  <button
                    key={item.id}
                    className={`product-card ${item.quantity === 0 ? "disabled" : ""}`}
                    onClick={() => addToCart(item)}
                    disabled={item.quantity === 0}
                  >
                    <img
                      className="product-thumb"
                      src={
                        item.imageUrl ||
                        "https://images.unsplash.com/photo-1515168833906-d2a3b82b302c?w=200&q=60"
                      }
                      alt=""
                      loading="lazy"
                    />
                    <strong>{item.name}</strong>
                    <small>{item.sku}</small>
                    <div className="line-item">
                      <strong>{formatMoney(item.sellingPrice)}</strong>
                      <small>Stock: {item.quantity}</small>
                    </div>
                  </button>
                ))}
              </div>
            </div>

            <div className="panel soft" data-tour="sales-cart-panel">
              <div className="line-item">
                <h4>
                  <ShoppingCart size={16} /> Cart ({cart.length})
                </h4>
                <small className="muted">Type quantity or use + / -</small>
              </div>
              <div className="list-stack">
                {cart.map((line) => {
                  const breakdown = calculateLine(line.item, line.quantity);
                  return (
                    <div className="cart-line" key={line.item.id}>
                      <div>
                        <strong>{line.item.name}</strong>
                        <small className="muted">{formatMoney(breakdown.lineSubtotal)}</small>
                        <small className="muted">Tax {formatMoney(breakdown.taxAmount)}</small>
                        <small className="muted">{formatMoney(breakdown.lineTotal)}</small>
                      </div>
                      <div className="inline-actions">
                        <button className="icon-btn" onClick={() => updateQuantity(line.item.id, -1)}>
                          <Minus size={14} />
                        </button>
                        <input
                          className="qty-input"
                          type="number"
                          inputMode="numeric"
                          min={1}
                          max={line.item.quantity}
                          value={line.quantity}
                          onChange={(event) => setQuantity(line.item.id, Number(event.target.value) || 1)}
                        />
                        <button className="icon-btn" onClick={() => updateQuantity(line.item.id, 1)}>
                          <Plus size={14} />
                        </button>
                        <button className="icon-btn danger" onClick={() => removeItem(line.item.id)}>
                          X
                        </button>
                      </div>
                    </div>
                  );
                })}
                {cart.length === 0 && <p className="muted">Cart is empty</p>}
              </div>

              <div className="form-grid cart-contact-grid" style={{ marginTop: 10 }}>
                <label>
                  Customer contact
                  <input
                    placeholder="+233..."
                    value={customerContact}
                    onChange={(event) => setCustomerContact(event.target.value)}
                  />
                </label>
                <label>
                  Customer email
                  <input
                    placeholder="customer@email.com"
                    value={customerEmail}
                    onChange={(event) => setCustomerEmail(event.target.value)}
                  />
                </label>
              </div>

              <div className="line-item" style={{ marginTop: 10 }}>
                <span>Payment Method</span>
              </div>
              <div className="inline-actions" data-tour="sales-payment-methods">
                {(["Cash", "Card", "Mobile"] as const).map((option) => (
                  <button
                    key={option}
                    className={paymentMethod === option ? "btn btn-primary" : "btn btn-outline"}
                    onClick={() => setPaymentMethod(option)}
                  >
                    {paymentLabels[option]}
                  </button>
                ))}
              </div>
              <div className="line-item" style={{ marginTop: 10 }}>
                <span>Subtotal</span>
                <strong>{formatMoney(summary.subtotal)}</strong>
              </div>
              <div className="line-item">
                <span>Tax</span>
                <strong>{formatMoney(summary.taxTotal)}</strong>
              </div>
              <div className="line-item">
                <strong>Total</strong>
                <strong>{formatMoney(summary.grandTotal)}</strong>
              </div>
              <button
                className="btn btn-primary full"
                onClick={() => void complete()}
                disabled={cart.length === 0 || submitting}
                data-tour="sales-complete-sale"
              >
                {submitting ? "Completing..." : "Complete Sale"}
              </button>
            </div>
          </div>
        ) : (
          <div className="list-stack">
            {sales.map((sale) => (
              <article className="history-item" key={sale.id}>
                <div className="line-item">
                  <div>
                    <strong>{formatDateTime(sale.date)}</strong>
                    <small>
                      {paymentLabels[sale.paymentMethod]} - Cashier: {sale.cashier}
                    </small>
                  </div>
                  <div className="inline-actions">
                    <strong>{formatMoney(sale.grandTotal ?? sale.total)}</strong>
                    <button className="btn btn-outline" onClick={() => setReceipt(sale)}>
                      Receipt
                    </button>
                  </div>
                </div>
                <div className="line-items-inline">
                  {sale.items.map((line, index) => (
                    <span key={`${sale.id}-${index}`}>
                      {line.itemName} x {line.quantity}
                    </span>
                  ))}
                </div>
              </article>
            ))}
            {sales.length === 0 && <p className="muted">No sales recorded yet</p>}
          </div>
        )}
      </section>
    </div>
  );
}
