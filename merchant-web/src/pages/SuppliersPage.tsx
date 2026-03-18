import { Mail, MessageCircle, Phone, Plus, Star } from "lucide-react";
import { useMemo, useState } from "react";
import { useMerchant } from "../state/merchantContext";
import type { InventoryItem, Supplier } from "../state/types";

interface Props {
  suppliers: Supplier[];
  items: InventoryItem[];
  onAddSupplier: (supplier: Supplier) => void;
}

const toWhatsAppNumber = (phone: string): string => phone.replace(/[^\d]/g, "");

export function SuppliersPage({ suppliers, items, onAddSupplier }: Props) {
  const { formatMoney, storeName } = useMerchant();
  const [toast, setToast] = useState("");
  const [selected, setSelected] = useState<Supplier | null>(null);
  const [requested, setRequested] = useState<Record<string, number>>({});
  const [customRequests, setCustomRequests] = useState<
    Array<{ id: string; name: string; quantity: number; unit: string }>
  >([]);
  const [deliveryDate, setDeliveryDate] = useState("");
  const [note, setNote] = useState("");
  const [showAddModal, setShowAddModal] = useState(false);
  const [supplierDraft, setSupplierDraft] = useState({
    name: "",
    contact: "",
    email: "",
    phone: "",
    address: ""
  });

  const selectedItems = useMemo(() => {
    if (!selected) {
      return [];
    }
    return items.filter((item) => item.supplier === selected.name);
  }, [items, selected]);

  const openRequest = (supplier: Supplier) => {
    setSelected(supplier);
    setRequested({});
    setCustomRequests([]);
    setDeliveryDate("");
    setNote("");
  };

  const buildMessage = (): string | null => {
    if (!selected) {
      return null;
    }
    const lines = selectedItems
      .map((item) => ({
        item,
        qty: Math.max(0, requested[item.id] ?? 0)
      }))
      .filter((row) => row.qty > 0);

    const customLines = customRequests
      .map((row) => ({
        name: row.name.trim(),
        qty: Math.max(0, row.quantity || 0),
        unit: row.unit.trim() || "units"
      }))
      .filter((row) => row.name && row.qty > 0);

    if (lines.length === 0 && customLines.length === 0) {
      return null;
    }

    const prettyLinkedLines = lines
      .map((row) => `- ${row.item.name} (${row.item.sku}): ${row.qty} ${row.item.unit}`)
      .join("\n");
    const prettyCustomLines = customLines
      .map((row) => `- ${row.name}: ${row.qty} ${row.unit}`)
      .join("\n");
    const prettyLines = [prettyLinkedLines, prettyCustomLines].filter(Boolean).join("\n");

    const when = deliveryDate ? `Preferred delivery: ${deliveryDate}\n` : "";
    const extra = note.trim() ? `Note: ${note.trim()}\n` : "";

    return [
      `Hello ${selected.contact},`,
      ``,
      `This is ${storeName}. Please help us restock:`,
      prettyLines,
      ``,
      when + extra + `Thank you.`
    ]
      .join("\n")
      .trim();
  };

  const requireMessage = (): string | null => {
    const message = buildMessage();
    if (!message) {
      setToast("Add at least one item quantity to request.");
      setTimeout(() => setToast(""), 2600);
      return null;
    }
    return message;
  };

  const sendWhatsApp = () => {
    if (!selected) {
      return;
    }
    const message = requireMessage();
    if (!message) {
      return;
    }
    const number = toWhatsAppNumber(selected.phone);
    if (!number) {
      setToast("Supplier phone number is missing.");
      setTimeout(() => setToast(""), 2600);
      return;
    }
    window.open(`https://wa.me/${number}?text=${encodeURIComponent(message)}`, "_blank", "noopener,noreferrer");
    setToast("Opening WhatsApp...");
    setTimeout(() => setToast(""), 2000);
  };

  const sendEmail = () => {
    if (!selected) {
      return;
    }
    const message = requireMessage();
    if (!message) {
      return;
    }
    const subject = `Supply request - ${storeName}`;
    window.location.href = `mailto:${encodeURIComponent(selected.email)}?subject=${encodeURIComponent(
      subject
    )}&body=${encodeURIComponent(message)}`;
  };

  const copyRequest = async () => {
    const message = requireMessage();
    if (!message) {
      return;
    }
    try {
      await navigator.clipboard.writeText(message);
      setToast("Request copied to clipboard");
      setTimeout(() => setToast(""), 2200);
    } catch {
      setToast("Could not copy. Select and copy manually.");
      setTimeout(() => setToast(""), 2600);
    }
  };

  const submitSupplier = () => {
    const name = supplierDraft.name.trim();
    const contact = supplierDraft.contact.trim();
    const email = supplierDraft.email.trim();
    const phone = supplierDraft.phone.trim();
    if (!name || !contact || !email || !phone) {
      setToast("Please fill name, contact, email, and phone.");
      setTimeout(() => setToast(""), 2600);
      return;
    }
    onAddSupplier({
      id: `sup-${Date.now()}`,
      name,
      contact,
      email,
      phone,
      address: supplierDraft.address.trim(),
      rating: 0
    });
    setShowAddModal(false);
    setSupplierDraft({ name: "", contact: "", email: "", phone: "", address: "" });
    setToast("Supplier added");
    setTimeout(() => setToast(""), 2200);
  };

  return (
    <div className="page-stack">
      {toast && <div className="toast">{toast}</div>}
      <section className="panel" data-tour="suppliers-list">
        <div className="panel-head">
          <div>
            <h3>Supplier Management</h3>
            <p>Request stock quickly by WhatsApp, call, or email</p>
          </div>
          <button
            className="btn btn-primary"
            onClick={() => setShowAddModal(true)}
          >
            <Plus size={16} /> Add Supplier
          </button>
        </div>
        <div className="card-grid two">
          {suppliers.map((supplier) => {
            const rows = items.filter((item) => item.supplier === supplier.name);
            const inventoryCost = rows.reduce((sum, row) => sum + row.quantity * row.costPrice, 0);
            const lowStock = rows.filter(
              (row) => row.status === "low-stock" || row.status === "out-of-stock"
            ).length;
            return (
              <article className="stat-card supplier-card" key={supplier.id}>
                <div className="line-item">
                  <div>
                    <h4>{supplier.name}</h4>
                    <small>{supplier.contact}</small>
                  </div>
                  <strong>
                    <Star size={14} /> {supplier.rating}
                  </strong>
                </div>
                <div className="supplier-contacts">
                  <div className="supplier-contact">
                    <Mail size={14} /> <span>{supplier.email}</span>
                  </div>
                  <div className="supplier-contact">
                    <Phone size={14} /> <span>{supplier.phone}</span>
                  </div>
                </div>
                <p className="muted">{supplier.address}</p>
                <div className="line-item">
                  <span>Products Supplied</span>
                  <strong>{rows.length}</strong>
                </div>
                <div className="line-item">
                  <span>Inventory Cost</span>
                  <strong>{formatMoney(inventoryCost)}</strong>
                </div>
                <div className="line-item">
                  <span>Low Stock Items</span>
                  <strong>{lowStock}</strong>
                </div>
                <div className="supplier-actions">
                  <button
                    className="btn btn-primary"
                    onClick={() => openRequest(supplier)}
                    data-tour="request-supply"
                  >
                    <MessageCircle size={16} /> Request Supply
                  </button>
                  <a className="btn btn-outline" href={`tel:${supplier.phone}`}>
                    <Phone size={16} /> Call
                  </a>
                </div>
              </article>
            );
          })}
        </div>
      </section>

      {selected && (
        <div className="modal-backdrop">
          <div className="modal large">
            <header>
              <h3>Request Supply</h3>
              <button className="icon-btn" onClick={() => setSelected(null)}>
                X
              </button>
            </header>
            <div className="modal-body">
              <div className="panel soft" style={{ marginBottom: 12 }} data-tour="supplier-select">
                <div className="line-item">
                  <div>
                    <strong>{selected.name}</strong>
                    <small className="muted">Contact: {selected.contact}</small>
                  </div>
                  <span className="verified-badge">WhatsApp</span>
                </div>
                <p className="muted" style={{ margin: 0 }}>
                  Choose quantities below. Only items with quantity &gt; 0 will be sent.
                </p>
              </div>

              {selectedItems.length === 0 ? (
                <p className="muted">No products linked to this supplier yet. Add custom items below.</p>
              ) : (
                <div className="request-grid">
                  {selectedItems.map((item) => (
                    <div className="request-row" key={item.id}>
                      <div className="request-meta">
                        <img
                          className="thumb"
                          src={
                            item.imageUrl ||
                            "https://images.unsplash.com/photo-1515168833906-d2a3b82b302c?w=200&q=60"
                          }
                          alt=""
                          loading="lazy"
                        />
                        <div>
                          <strong>{item.name}</strong>
                          <small className="muted">
                            Stock: {item.quantity} {item.unit} - SKU: {item.sku}
                          </small>
                        </div>
                      </div>
                      <label className="qty-inline">
                        <span>Qty</span>
                        <input
                          type="number"
                          inputMode="numeric"
                          min={0}
                          value={requested[item.id] ?? 0}
                          onChange={(event) =>
                            setRequested((current) => ({
                              ...current,
                              [item.id]: Math.max(0, Number(event.target.value) || 0)
                            }))
                          }
                        />
                      </label>
                    </div>
                  ))}
                </div>
              )}

              <div className="panel soft" style={{ marginTop: 12 }} data-tour="supply-items">
                <div className="line-item">
                  <strong>Add New Product Request</strong>
                  <button
                    type="button"
                    className="btn btn-outline"
                    onClick={() =>
                      setCustomRequests((current) => [
                        ...current,
                        { id: `custom-${Date.now()}-${current.length}`, name: "", quantity: 0, unit: "units" }
                      ])
                    }
                  >
                    <Plus size={14} /> Add item
                  </button>
                </div>
                {customRequests.length === 0 && (
                  <small className="muted">Use this if the product has not been supplied before.</small>
                )}
                <div className="list-stack" style={{ marginTop: 8 }}>
                  {customRequests.map((row) => (
                    <div key={row.id} className="request-row">
                      <div className="request-meta" style={{ flex: 1 }}>
                        <input
                          placeholder="Product name"
                          value={row.name}
                          onChange={(event) =>
                            setCustomRequests((current) =>
                              current.map((entry) =>
                                entry.id === row.id ? { ...entry, name: event.target.value } : entry
                              )
                            )
                          }
                          style={{ width: "100%" }}
                        />
                      </div>
                      <label className="qty-inline">
                        <span>Qty</span>
                        <input
                          type="number"
                          min={0}
                          value={row.quantity}
                          onChange={(event) =>
                            setCustomRequests((current) =>
                              current.map((entry) =>
                                entry.id === row.id
                                  ? { ...entry, quantity: Math.max(0, Number(event.target.value) || 0) }
                                  : entry
                              )
                            )
                          }
                        />
                      </label>
                      <label className="qty-inline">
                        <span>Unit</span>
                        <input
                          value={row.unit}
                          onChange={(event) =>
                            setCustomRequests((current) =>
                              current.map((entry) =>
                                entry.id === row.id ? { ...entry, unit: event.target.value } : entry
                              )
                            )
                          }
                        />
                      </label>
                      <button
                        type="button"
                        className="icon-btn danger"
                        onClick={() =>
                          setCustomRequests((current) =>
                            current.filter((entry) => entry.id !== row.id)
                          )
                        }
                        aria-label="Remove custom request item"
                      >
                        x
                      </button>
                    </div>
                  ))}
                </div>
              </div>

              <div className="form-grid" style={{ marginTop: 12 }}>
                <label>
                  Preferred Delivery Date
                  <input
                    type="date"
                    value={deliveryDate}
                    onChange={(event) => setDeliveryDate(event.target.value)}
                  />
                </label>
                <label className="full">
                  Note (optional)
                  <textarea rows={3} value={note} onChange={(event) => setNote(event.target.value)} />
                </label>
              </div>

              <div className="panel soft" style={{ marginTop: 12 }}>
                <strong>Preview</strong>
                <pre className="request-preview">
                  {buildMessage() ?? "Add quantities to generate a request message."}
                </pre>
              </div>
            </div>
            <footer>
              <button className="btn btn-outline" onClick={() => setSelected(null)}>
                Close
              </button>
              <button className="btn btn-outline" onClick={() => void copyRequest()}>
                Copy
              </button>
              <button className="btn btn-outline" onClick={sendEmail}>
                <Mail size={16} /> Email
              </button>
              <button className="btn btn-primary" onClick={sendWhatsApp} data-tour="send-supply-request">
                <MessageCircle size={16} /> WhatsApp
              </button>
            </footer>
          </div>
        </div>
      )}

      {showAddModal && (
        <div className="modal-backdrop">
          <div className="modal">
            <header>
              <h3>Add Supplier</h3>
              <button className="icon-btn" onClick={() => setShowAddModal(false)}>
                X
              </button>
            </header>
            <div className="modal-body form-grid">
              <label>
                Supplier Name
                <input
                  value={supplierDraft.name}
                  onChange={(event) =>
                    setSupplierDraft({ ...supplierDraft, name: event.target.value })
                  }
                />
              </label>
              <label>
                Contact Person
                <input
                  value={supplierDraft.contact}
                  onChange={(event) =>
                    setSupplierDraft({ ...supplierDraft, contact: event.target.value })
                  }
                />
              </label>
              <label>
                Email
                <input
                  type="email"
                  value={supplierDraft.email}
                  onChange={(event) =>
                    setSupplierDraft({ ...supplierDraft, email: event.target.value })
                  }
                />
              </label>
              <label>
                Phone
                <input
                  value={supplierDraft.phone}
                  onChange={(event) =>
                    setSupplierDraft({ ...supplierDraft, phone: event.target.value })
                  }
                  placeholder="+233..."
                />
              </label>
              <label className="full">
                Address
                <textarea
                  rows={3}
                  value={supplierDraft.address}
                  onChange={(event) =>
                    setSupplierDraft({ ...supplierDraft, address: event.target.value })
                  }
                />
              </label>
            </div>
            <footer>
              <button className="btn btn-outline" onClick={() => setShowAddModal(false)}>
                Cancel
              </button>
              <button className="btn btn-primary" onClick={submitSupplier}>
                Add Supplier
              </button>
            </footer>
          </div>
        </div>
      )}
    </div>
  );
}
