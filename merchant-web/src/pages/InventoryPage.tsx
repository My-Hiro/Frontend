import { Edit3, Plus, ScanLine, Search, Trash2, Upload, Download, SlidersHorizontal } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { deriveInventoryStatus } from "../lib/inventoryStatus";
import { StatusBadge } from "../components/shared/StatusBadge";
import { merchantApi } from "../state/api";
import { useMerchant } from "../state/merchantContext";
import { useTutorial } from "../tutorial/TutorialContext";
import type {
  Category,
  InventoryItem,
  InventoryStatus,
  PlacementAudience,
  Supplier
} from "../state/types";

interface Props {
  items: InventoryItem[];
  categories: Category[];
  suppliers: Supplier[];
  onAdd: (item: InventoryItem) => void;
  onUpdate: (itemId: string, next: Partial<InventoryItem>) => void;
  onDelete: (itemId: string) => void;
  onDeleteMany: (itemIds: string[]) => void;
  onAdjustStock: (input: {
    itemId: string;
    quantity: number;
    reason: string;
    warehouse: string;
  }) => Promise<InventoryItem | undefined>;
  onImportCsv: (csv: string) => Promise<{ imported: number; skipped: number }>;
}

interface ProductFormState {
  id?: string;
  name: string;
  sku: string;
  barcode: string;
  imageUrl?: string;
  placements: Array<{
    categoryId: string;
    subcategoryMode: "preset" | "custom";
    subcategoryLabel: string;
    audienceLabel: PlacementAudience;
  }>;
  quantity: number;
  minQuantity: number;
  maxQuantity: number;
  unit: string;
  unitOther?: string;
  costPrice: number;
  sellingPrice: number;
  taxMode: "percent" | "fixed";
  taxValue: number;
  supplier: string;
  location: string;
  expiryDate?: string;
  batchNumber?: string;
  description?: string;
}

const emptyForm: ProductFormState = {
  name: "",
  sku: "",
  barcode: "",
  imageUrl: "",
  placements: [
    {
      categoryId: "",
      subcategoryMode: "preset",
      subcategoryLabel: "",
      audienceLabel: "general"
    }
  ],
  quantity: 0,
  minQuantity: 0,
  maxQuantity: 100,
  unit: "units",
  unitOther: "",
  costPrice: 0,
  sellingPrice: 0,
  taxMode: "percent",
  taxValue: 0,
  supplier: "",
  location: "Main Store",
  expiryDate: "",
  batchNumber: "",
  description: ""
};

interface AdjustState {
  itemId: string;
  quantity: number;
  reason: string;
  warehouse: string;
}

const AUDIENCE_OPTIONS: Array<{
  value: PlacementAudience;
  label: string;
}> = [
  { value: "general", label: "General" },
  { value: "men", label: "Men" },
  { value: "women", label: "Women" },
  { value: "boys", label: "Boys" },
  { value: "girls", label: "Girls" }
];

const normalizePlacementAudience = (value: unknown): PlacementAudience => {
  const raw = String(value ?? "").trim().toLowerCase();
  if (raw === "men" || raw === "women" || raw === "boys" || raw === "girls") {
    return raw;
  }
  return "general";
};

const parseNumberInput = (value: string): number => {
  const trimmed = value.trim();
  if (!trimmed) {
    return 0;
  }
  const parsed = Number(trimmed);
  return Number.isFinite(parsed) ? parsed : 0;
};

const numberValueOrPlaceholder = (value: number): string =>
  Number.isFinite(value) && value !== 0 ? String(value) : "";

export function InventoryPage({
  items,
  categories,
  suppliers,
  onAdd,
  onUpdate,
  onDelete,
  onDeleteMany,
  onAdjustStock,
  onImportCsv
}: Props) {
  const { formatMoney } = useMerchant();
  const { isTourRunning, currentStep } = useTutorial();
  const [toast, setToast] = useState("");
  const [search, setSearch] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState<InventoryStatus | "all">("all");
  const [sortBy, setSortBy] = useState<"name" | "quantity" | "price" | "expiry">("name");
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [showProductModal, setShowProductModal] = useState(false);
  const [showScanModal, setShowScanModal] = useState(false);
  const [showAdjustModal, setShowAdjustModal] = useState(false);
  const [showImportModal, setShowImportModal] = useState(false);
  const [form, setForm] = useState<ProductFormState>(emptyForm);
  const [adjust, setAdjust] = useState<AdjustState>({
    itemId: "",
    quantity: 0,
    reason: "Stock count correction",
    warehouse: "Main Store"
  });
  const [manualBarcode, setManualBarcode] = useState("");
  const [cameraBusy, setCameraBusy] = useState(false);
  const [cameraStatus, setCameraStatus] = useState("");
  const [importFile, setImportFile] = useState<File | null>(null);
  const [importBusy, setImportBusy] = useState(false);
  const [importError, setImportError] = useState("");
  const [imageUploadBusy, setImageUploadBusy] = useState(false);
  const [imageUploadError, setImageUploadError] = useState("");
  const [saveBusy, setSaveBusy] = useState(false);

  useEffect(() => {
    if (!isTourRunning || !showProductModal) {
      return;
    }

    const target = currentStep?.target;
    if (!target) {
      return;
    }

    if (target === '[data-tour="inventory-filters"]' || target === '[data-tour="inventory-table"]') {
      setShowProductModal(false);
    }
  }, [currentStep?.target, isTourRunning, showProductModal]);

  const categoryNameById = useMemo(
    () => new Map(categories.map((category) => [category.id, category.name] as const)),
    [categories]
  );

  const orderedCategories = useMemo(() => {
    return categories
      .map((category, index) => ({ category, index }))
      .sort((a, b) => {
        const ap = a.category.id === "more" ? 1 : 0;
        const bp = b.category.id === "more" ? 1 : 0;
        if (ap !== bp) {
          return ap - bp;
        }
        return a.index - b.index;
      })
      .map(({ category }) => category);
  }, [categories]);

  const canonicalSubcategoriesByCategoryId = useMemo(() => {
    const map = new Map<string, Set<string>>();
    categories.forEach((category) => {
      map.set(category.id, new Set(category.subcategories));
    });
    return map;
  }, [categories]);

  const customSubcategoriesByCategoryId = useMemo(() => {
    const reserved = new Set(["Other (Specify)", "More", "General"]);
    const collected = new Map<string, Set<string>>();

    for (const item of items) {
      const placements =
        Array.isArray(item.placements) && item.placements.length > 0
          ? item.placements
          : [
              {
                categoryId: item.category,
                subcategoryLabel: item.subcategory || "General",
                audienceLabel: "general"
              }
            ];

      for (const placement of placements) {
        const categoryId = String(placement.categoryId ?? "").trim();
        const label = String(placement.subcategoryLabel ?? "").trim();
        if (!categoryId || !label) {
          continue;
        }
        if (reserved.has(label)) {
          continue;
        }
        const canonical = canonicalSubcategoriesByCategoryId.get(categoryId);
        if (canonical?.has(label)) {
          continue;
        }
        if (!collected.has(categoryId)) {
          collected.set(categoryId, new Set());
        }
        collected.get(categoryId)?.add(label);
      }
    }

    const result = new Map<string, string[]>();
    for (const [categoryId, labels] of collected.entries()) {
      result.set(
        categoryId,
        Array.from(labels).sort((a, b) => a.localeCompare(b))
      );
    }
    return result;
  }, [items, canonicalSubcategoriesByCategoryId]);

  const filtered = useMemo(() => {
    const base = items
      .filter((item) => {
        const q = search.trim().toLowerCase();
        if (!q) {
          return true;
        }
        return (
          item.name.toLowerCase().includes(q) ||
          item.sku.toLowerCase().includes(q) ||
          item.barcode.includes(q)
        );
      })
      .filter((item) => {
        if (categoryFilter === "all") {
          return true;
        }
        const placements =
          Array.isArray(item.placements) && item.placements.length > 0
            ? item.placements
            : [
                {
                  categoryId: item.category,
                  subcategoryLabel: item.subcategory || "General",
                  audienceLabel: "general"
                }
              ];
        return placements.some((placement) => placement.categoryId === categoryFilter);
      })
      .filter((item) => (statusFilter === "all" ? true : item.status === statusFilter))
      .sort((a, b) => {
        if (sortBy === "quantity") {
          return b.quantity - a.quantity;
        }
        if (sortBy === "price") {
          return b.sellingPrice - a.sellingPrice;
        }
        if (sortBy === "expiry") {
          const ad = a.expiryDate ? new Date(a.expiryDate).getTime() : Number.MAX_SAFE_INTEGER;
          const bd = b.expiryDate ? new Date(b.expiryDate).getTime() : Number.MAX_SAFE_INTEGER;
          return ad - bd;
        }
        return a.name.localeCompare(b.name);
      });
    return base;
  }, [items, search, categoryFilter, statusFilter, sortBy]);

  const openCreate = () => {
    setForm(emptyForm);
    setImageUploadBusy(false);
    setImageUploadError("");
    setShowProductModal(true);
  };

  const openEdit = (item: InventoryItem) => {
    const placements = (
      Array.isArray(item.placements) && item.placements.length > 0
        ? item.placements
        : [
            {
              categoryId: item.category,
              subcategoryLabel: item.subcategory || "General",
              audienceLabel: "general"
            }
          ]
    ).map((placement) => {
      const category = categories.find((entry) => entry.id === placement.categoryId);
      const label = placement.subcategoryLabel.trim();
      const lower = label.toLowerCase();
      const isOtherSpecify = lower === "other (specify)";
      const isMore = lower === "more";
      const isGeneral = lower === "general" || lower === "";
      const customOptions = customSubcategoriesByCategoryId.get(placement.categoryId) ?? [];
      const isKnownCustom = customOptions.includes(label);
      const isPreset =
        !isOtherSpecify &&
        (isMore || isGeneral || isKnownCustom || Boolean(category?.subcategories.includes(label)));
      return {
        categoryId: placement.categoryId,
        subcategoryMode: isPreset ? ("preset" as const) : ("custom" as const),
        subcategoryLabel: isOtherSpecify ? "" : isGeneral ? "" : isMore ? "More" : label,
        audienceLabel: normalizePlacementAudience(placement.audienceLabel)
      };
    });
    setForm({
      id: item.id,
      name: item.name,
      sku: item.sku,
      barcode: item.barcode,
      imageUrl: item.imageUrl ?? "",
      placements: placements.length > 0 ? placements : emptyForm.placements,
      quantity: item.quantity,
      minQuantity: item.minQuantity,
      maxQuantity: item.maxQuantity,
      unit: ["units", "kg", "liter", "box", "bottle", "pack"].includes(item.unit) ? item.unit : "other",
      unitOther: ["units", "kg", "liter", "box", "bottle", "pack"].includes(item.unit) ? "" : item.unit,
      costPrice: item.costPrice,
      sellingPrice: item.sellingPrice,
      taxMode: item.taxMode ?? "percent",
      taxValue: item.taxValue ?? 0,
      supplier: item.supplier,
      location: item.location,
      expiryDate: item.expiryDate ?? "",
      batchNumber: item.batchNumber ?? "",
      description: item.description ?? ""
    });
    setImageUploadBusy(false);
    setImageUploadError("");
    setShowProductModal(true);
  };

  const uploadPhoto = async (file: File) => {
    setImageUploadError("");
    if (file.size > 3_000_000) {
      setImageUploadError("Please choose an image under 3MB.");
      return;
    }
    if (!String(file.type ?? "").toLowerCase().startsWith("image/")) {
      setImageUploadError("Please choose an image file (JPG/PNG/WebP).");
      return;
    }

    setImageUploadBusy(true);
    try {
      const url = await merchantApi.uploadProductImage(file);
      setForm((current) => ({ ...current, imageUrl: url }));
      setToast("Photo uploaded");
      setTimeout(() => setToast(""), 2200);
    } catch (error) {
      setImageUploadError(error instanceof Error ? error.message : "Upload failed. Try again.");
    } finally {
      setImageUploadBusy(false);
    }
  };

  const setPlacements = (
    updater: (current: ProductFormState["placements"]) => ProductFormState["placements"]
  ) => {
    setForm((current) => ({
      ...current,
      placements: updater(current.placements)
    }));
  };

  const addPlacement = () => {
    setPlacements((current) => [
      ...current,
      {
        categoryId: "",
        subcategoryMode: "preset",
        subcategoryLabel: "",
        audienceLabel: "general"
      }
    ]);
  };

  const removePlacement = (index: number) => {
    setPlacements((current) => {
      const next = current.filter((_, i) => i !== index);
      return next.length > 0 ? next : current;
    });
  };

  const makePrimaryPlacement = (index: number) => {
    if (index <= 0) {
      return;
    }
    setPlacements((current) => {
      const next = [...current];
      const [picked] = next.splice(index, 1);
      next.unshift(picked);
      return next;
    });
  };

  const updatePlacement = (
    index: number,
    patch: Partial<ProductFormState["placements"][number]>
  ) => {
    setPlacements((current) =>
      current.map((entry, i) => (i === index ? { ...entry, ...patch } : entry))
    );
  };

  const submitProduct = async () => {
    if (saveBusy) {
      return;
    }

    setImageUploadError("");
    setSaveBusy(true);

    let imageUrl = form.imageUrl?.trim() ? form.imageUrl.trim() : "";
    try {
      if (imageUrl && /^https?:\/\//i.test(imageUrl) && !imageUrl.includes("/uploads/")) {
        imageUrl = await merchantApi.ingestProductImageUrl(imageUrl);
        setForm((current) => ({ ...current, imageUrl }));
      }
    } catch (error) {
      setImageUploadError(
        error instanceof Error
          ? `Could not use that image URL: ${error.message}`
          : "Could not use that image URL. Please upload a photo instead."
      );
      setSaveBusy(false);
      return;
    }

    const normalizedPlacements = form.placements
      .map((entry) => {
        const categoryId = entry.categoryId.trim();
        if (!categoryId) {
          return null;
        }
        const rawLabel = entry.subcategoryLabel.trim();
        const fallback = entry.subcategoryMode === "custom" ? "More" : "General";
        return {
          categoryId,
          subcategoryLabel: rawLabel || fallback,
          audienceLabel: entry.audienceLabel || "general"
        };
      })
      .filter((entry): entry is NonNullable<typeof entry> => entry !== null);

    const deduped = new Map<string, typeof normalizedPlacements[number]>();
    normalizedPlacements.forEach((entry) => {
      if (!deduped.has(entry.categoryId)) {
        deduped.set(entry.categoryId, entry);
      }
    });
    const placements = Array.from(deduped.values());

    if (!form.name || !form.sku || !form.barcode || placements.length === 0) {
      setSaveBusy(false);
      return;
    }
    const resolvedUnit =
      form.unit === "other"
        ? (form.unitOther?.trim() || "units")
        : form.unit;

    const payload: InventoryItem = {
      id: form.id ?? String(Date.now()),
      name: form.name,
      sku: form.sku,
      barcode: form.barcode,
      imageUrl: imageUrl || undefined,
      category: placements[0].categoryId,
      subcategory: placements[0].subcategoryLabel,
      placements,
      quantity: form.quantity,
      minQuantity: form.minQuantity,
      maxQuantity: form.maxQuantity,
      unit: resolvedUnit,
      costPrice: form.costPrice,
      sellingPrice: form.sellingPrice,
      taxMode: form.taxMode,
      taxValue: form.taxValue,
      supplier: form.supplier,
      location: form.location,
      status: deriveInventoryStatus(form),
      expiryDate: form.expiryDate || undefined,
      batchNumber: form.batchNumber || undefined,
      description: form.description || undefined
    };
    if (form.id) {
      onUpdate(form.id, payload);
    } else {
      onAdd(payload);
    }
    setShowProductModal(false);
    setSaveBusy(false);
  };

  const exportCsv = () => {
    const encodePlacements = (item: InventoryItem): string => {
      const placements =
        Array.isArray(item.placements) && item.placements.length > 0
          ? item.placements
          : [
              {
                categoryId: item.category,
                subcategoryLabel: item.subcategory || "General",
                audienceLabel: "general"
              }
            ];
      return placements
        .map(
          (placement) =>
            `${placement.categoryId}:${placement.subcategoryLabel}|${placement.audienceLabel || "general"}`
        )
        .join(";");
    };
    const rows = [
      [
        "SKU",
        "Name",
        "Barcode",
        "Category",
        "Quantity",
        "Min Qty",
        "Cost Price",
        "Selling Price",
        "Supplier",
        "Location",
        "Unit",
        "Placements"
      ].join(",")
    ];
    filtered.forEach((item) => {
      const primary = item.placements?.[0];
      rows.push(
        [
          item.sku,
          item.name,
          item.barcode,
          primary?.categoryId ?? item.category,
          item.quantity,
          item.minQuantity,
          item.costPrice,
          item.sellingPrice,
          item.supplier,
          item.location,
          item.unit,
          encodePlacements(item)
        ].join(",")
      );
    });
    const csv = rows.join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `inventory-${new Date().toISOString().slice(0, 10)}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  };

  const toggleSelect = (id: string) => {
    setSelectedIds((current) =>
      current.includes(id) ? current.filter((entry) => entry !== id) : [...current, id]
    );
  };

  const submitAdjust = () => {
    if (!adjust.itemId) {
      return;
    }
    setShowAdjustModal(false);
    void onAdjustStock(adjust)
      .then(() => {
        setToast("Stock updated");
        setTimeout(() => setToast(""), 2200);
      })
      .catch(() => {
        setToast("Could not update stock (API unavailable)");
        setTimeout(() => setToast(""), 2600);
      });
  };

  const downloadTemplate = () => {
    const template = [
      "SKU,Name,Barcode,Category,Quantity,Min Qty,Cost Price,Selling Price,Supplier,Location,Unit,Placements",
      "MILK-001,Organic Whole Milk,1234567890123,groceries_food,10,5,20.00,25.00,Fresh Farms Co.,Main Store,liter,groceries_food:Dairy & Eggs"
    ].join("\n");
    const blob = new Blob([template], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = "inventory-import-template.csv";
    link.click();
    URL.revokeObjectURL(url);
  };

  const submitImport = async () => {
    setImportError("");
    if (!importFile) {
      setImportError("Please select a CSV file to import.");
      return;
    }
    setImportBusy(true);
    try {
      const csv = await importFile.text();
      const result = await onImportCsv(csv);
      setToast(`Imported ${result.imported} items (skipped ${result.skipped})`);
      setTimeout(() => setToast(""), 2600);
      setShowImportModal(false);
      setImportFile(null);
    } catch {
      setImportError("Import failed. Check your file and try again.");
    } finally {
      setImportBusy(false);
    }
  };

  const scanBarcode = (value: string) => {
    const item = items.find((entry) => entry.barcode === value);
    if (item) {
      openEdit(item);
      setShowScanModal(false);
      return;
    }
    setForm({ ...emptyForm, barcode: value });
    setShowScanModal(false);
    setShowProductModal(true);
  };

  const startCameraScan = async () => {
    if (cameraBusy) {
      return;
    }
    setCameraBusy(true);
    setCameraStatus("Requesting camera access...");
    try {
      if (!navigator.mediaDevices?.getUserMedia) {
        setCameraStatus("Camera not supported on this device. Use manual barcode entry.");
        return;
      }
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: "environment" }
      });
      setCameraStatus("Camera active. Scanning...");
      const track = stream.getTracks()[0];
      setTimeout(() => {
        const scanned = manualBarcode.trim()
          ? manualBarcode.trim()
          : String(
              Math.floor(Math.random() * 9_000_000_000_000) + 1_000_000_000_000
            );
        track.stop();
        setCameraStatus("Scan complete.");
        scanBarcode(scanned);
      }, 1400);
    } catch {
      setCameraStatus("Camera access denied. Enter barcode manually.");
    } finally {
      setTimeout(() => setCameraBusy(false), 250);
    }
  };

  return (
    <div className="page-stack">
      {toast && <div className="toast">{toast}</div>}
      <div className="toolbar-row">
        <div className="inline-actions">
          <button className="btn btn-primary" onClick={openCreate} data-tour="add-product">
            <Plus size={16} /> Add Product
          </button>
          <button
            className="btn btn-outline"
            onClick={() => {
              setCameraStatus("");
              setCameraBusy(false);
              setManualBarcode("");
              setShowScanModal(true);
            }}
          >
            <ScanLine size={16} /> Scan Barcode
          </button>
        </div>
        <div className="inline-actions">
          <button className="btn btn-outline" onClick={exportCsv}>
            <Download size={16} /> Export
          </button>
          <button className="btn btn-outline" onClick={() => setShowImportModal(true)}>
            <Upload size={16} /> Import
          </button>
        </div>
      </div>

      <section className="panel">
        <div className="filter-grid" data-tour="inventory-filters">
          <label className="search-field">
            <Search size={16} />
            <input
              placeholder="Search by name, SKU, or barcode..."
              value={search}
              onChange={(event) => setSearch(event.target.value)}
            />
          </label>
          <select value={categoryFilter} onChange={(event) => setCategoryFilter(event.target.value)}>
            <option value="all">All Categories</option>
            {orderedCategories.map((category) => (
              <option value={category.id} key={category.id}>
                {category.name}
              </option>
            ))}
          </select>
          <select
            value={statusFilter}
            onChange={(event) => setStatusFilter(event.target.value as InventoryStatus | "all")}
          >
            <option value="all">All Status</option>
            <option value="in-stock">In Stock</option>
            <option value="low-stock">Low Stock</option>
            <option value="out-of-stock">Out of Stock</option>
            <option value="expired">Expired</option>
          </select>
          <select value={sortBy} onChange={(event) => setSortBy(event.target.value as typeof sortBy)}>
            <option value="name">Sort by Name</option>
            <option value="quantity">Sort by Quantity</option>
            <option value="price">Sort by Price</option>
            <option value="expiry">Sort by Expiry</option>
          </select>
          <button className="btn btn-outline">
            <SlidersHorizontal size={16} /> Filters
          </button>
        </div>

        {selectedIds.length > 0 && (
          <div className="selection-banner">
            <span>{selectedIds.length} items selected</span>
            <div className="inline-actions">
              <button
                className="btn btn-danger"
                onClick={() => {
                  onDeleteMany(selectedIds);
                  setSelectedIds([]);
                }}
              >
                <Trash2 size={16} /> Delete Selected
              </button>
              <button className="btn btn-outline" onClick={() => setSelectedIds([])}>
                Cancel
              </button>
            </div>
          </div>
        )}

        <div className="table-wrap" data-tour="inventory-table">
          <table>
            <thead>
              <tr>
                <th>
                  <input
                    type="checkbox"
                    checked={filtered.length > 0 && selectedIds.length === filtered.length}
                    onChange={() =>
                      setSelectedIds(
                        selectedIds.length === filtered.length ? [] : filtered.map((item) => item.id)
                      )
                    }
                  />
                </th>
                <th>SKU</th>
                <th>Product name</th>
                <th>Category</th>
                <th>Stock</th>
                <th>Reorder status</th>
                <th>Warehouse</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((item) => (
                <tr key={item.id}>
                  <td>
                    <input
                      type="checkbox"
                      checked={selectedIds.includes(item.id)}
                      onChange={() => toggleSelect(item.id)}
                    />
                  </td>
                  <td>
                    <div>
                      <strong>{item.sku}</strong>
                      <small>{item.barcode}</small>
                    </div>
                  </td>
                  <td>
                    <div className="product-cell">
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
                        <small>{item.expiryDate ? `Exp: ${item.expiryDate}` : "No expiry"}</small>
                        {!item.imageUrl && (
                          <small className="warning-line">Add a photo to show on Discovery</small>
                        )}
                      </div>
                    </div>
                  </td>
                  <td>
                    {(() => {
                      const placements =
                        Array.isArray(item.placements) && item.placements.length > 0
                          ? item.placements
                          : [
                              {
                                categoryId: item.category,
                                subcategoryLabel: item.subcategory || "General",
                                audienceLabel: "general"
                              }
                            ];
                      const primary = placements[0];
                      const extras = Math.max(0, placements.length - 1);
                      const categoryName =
                        categoryNameById.get(primary.categoryId) ?? primary.categoryId;
                      return (
                        <div>
                          <strong>{categoryName}</strong>
                          <small>
                            {primary.subcategoryLabel}
                            {` · ${
                              AUDIENCE_OPTIONS.find(
                                (option) => option.value === (primary.audienceLabel || "general")
                              )?.label || "General"
                            }`}
                            {extras > 0 ? ` · +${extras} more` : ""}
                          </small>
                        </div>
                      );
                    })()}
                  </td>
                  <td>
                    <div>
                      <strong>
                        {item.quantity} {item.unit}
                      </strong>
                      <small>Min: {item.minQuantity}</small>
                    </div>
                  </td>
                  <td>
                    <StatusBadge status={item.status} />
                  </td>
                  <td>{item.location}</td>
                  <td>
                    <div className="inline-actions">
                      <button className="icon-btn" onClick={() => openEdit(item)} aria-label="edit">
                        <Edit3 size={14} />
                      </button>
                      <button
                        className="icon-btn"
                        onClick={() => {
                          setAdjust({
                            itemId: item.id,
                            quantity: 0,
                            reason: "Stock count correction",
                            warehouse: item.location
                          });
                          setShowAdjustModal(true);
                        }}
                        aria-label="adjust"
                      >
                        <Plus size={14} />
                      </button>
                      <button className="icon-btn danger" onClick={() => onDelete(item.id)} aria-label="delete">
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      {showProductModal && (
        <div className="modal-backdrop">
          <div className="modal large" data-tour="inventory-product-modal">
            <header>
              <h3>{form.id ? "Edit Product" : "Add Product"}</h3>
              <button className="icon-btn" onClick={() => setShowProductModal(false)}>
                X
              </button>
            </header>
            <div className="modal-body form-grid">
              <label>
                Product Name
                <input value={form.name} onChange={(event) => setForm({ ...form, name: event.target.value })} />
              </label>
              <label>
                SKU
                <input value={form.sku} onChange={(event) => setForm({ ...form, sku: event.target.value })} />
              </label>
              <label>
                Barcode
                <input value={form.barcode} onChange={(event) => setForm({ ...form, barcode: event.target.value })} />
              </label>

              <label className="full">
                Product Photo (required for Discovery)
                <div className="photo-row">
                  <img
                    className="photo-preview"
                    src={
                      form.imageUrl?.trim() ||
                      "https://images.unsplash.com/photo-1515168833906-d2a3b82b302c?w=200&q=60"
                    }
                    alt=""
                    loading="lazy"
                  />
                  <div className="photo-actions">
                    <div className="line-item">
                      <input
                        type="file"
                        accept="image/*"
                        disabled={imageUploadBusy}
                        onChange={(event) => {
                          const file = event.target.files?.[0];
                          event.target.value = "";
                          if (!file) return;
                          void uploadPhoto(file);
                        }}
                      />
                      {form.imageUrl?.trim() && (
                        <button
                          className="btn btn-outline"
                          type="button"
                          onClick={() => setForm((current) => ({ ...current, imageUrl: "" }))}
                        >
                          Remove
                        </button>
                      )}
                    </div>
                    <small className="muted">
                      Products without a photo won&apos;t appear on Discovery. Uploaded photos are auto-cropped to a
                      square for consistent display.
                    </small>
                    {imageUploadBusy && <small className="muted">Uploading photo...</small>}
                    {imageUploadError && <small className="danger-text">{imageUploadError}</small>}
                    <details className="photo-url">
                      <summary>Use external image URL (advanced)</summary>
                      <small className="muted">
                        External images can break later and may not load reliably on low-bandwidth networks. Uploading is
                        recommended.
                      </small>
                      <input
                        placeholder="https://..."
                        value={form.imageUrl ?? ""}
                        onChange={(event) => setForm({ ...form, imageUrl: event.target.value })}
                      />
                    </details>
                  </div>
                </div>
              </label>

              <label>
                Unit
                <select value={form.unit} onChange={(event) => setForm({ ...form, unit: event.target.value })}>
                  <option value="units">Units</option>
                  <option value="kg">Kilograms</option>
                  <option value="liter">Liters</option>
                  <option value="box">Boxes</option>
                  <option value="bottle">Bottles</option>
                  <option value="pack">Packs</option>
                  <option value="other">Other (Specify)</option>
                </select>
              </label>
              {form.unit === "other" && (
                <label>
                  Other Unit
                  <input
                    value={form.unitOther ?? ""}
                    onChange={(event) =>
                      setForm({ ...form, unitOther: event.target.value })
                    }
                    placeholder="e.g. crate, service, bundle"
                  />
                </label>
              )}

              <div className="full placements-editor" aria-label="Product categories" data-tour="inventory-placements">
                <div className="placements-head">
                  <div>
                    <strong>Categories for discovery</strong>
                    <small className="muted">
                      Add this product to one or more segments. Primary segment is used for reports.
                    </small>
                  </div>
                  <button className="btn btn-outline" type="button" onClick={addPlacement}>
                    Add another category
                  </button>
                </div>

                <div className="placements-list">
                  {form.placements.map((placement, index) => {
                    const used = new Set(
                      form.placements
                        .filter((_, i) => i !== index)
                        .map((entry) => entry.categoryId)
                        .filter(Boolean)
                    );
                    const selectedCategory = categories.find((entry) => entry.id === placement.categoryId);
                    const subcategories = (selectedCategory?.subcategories ?? []).filter(
                      (name) => name !== "Other (Specify)"
                    );
                    const customSubcategories =
                      placement.categoryId ? customSubcategoriesByCategoryId.get(placement.categoryId) ?? [] : [];
                    const isCustom = placement.subcategoryMode === "custom";
                    const subcategorySelectValue = isCustom
                      ? "__other__"
                      : placement.subcategoryLabel === "More"
                        ? "__more__"
                        : placement.subcategoryLabel || "";

                    return (
                      <div className="placement-row" key={`${index}-${placement.categoryId || "new"}`}>
                        <div className="placement-meta">
                          <span className={index === 0 ? "pill primary" : "pill"}>
                            {index === 0 ? "Primary" : "Also listed"}
                          </span>
                        </div>

                        <label className="placement-audience-field">
                          Audience
                          <select
                            value={placement.audienceLabel || "general"}
                            onChange={(event) =>
                              updatePlacement(index, {
                                audienceLabel: event.target.value as PlacementAudience
                              })
                            }
                          >
                            {AUDIENCE_OPTIONS.map((option) => (
                              <option key={option.value} value={option.value}>
                                {option.label}
                              </option>
                            ))}
                          </select>
                        </label>

                        <label>
                          Category
                          <select
                            value={placement.categoryId}
                            onChange={(event) => {
                              const categoryId = event.target.value;
                              updatePlacement(index, {
                                categoryId,
                                subcategoryMode: "preset",
                                subcategoryLabel: ""
                              });
                            }}
                          >
                            <option value="">Select category</option>
                            {orderedCategories.map((category) => (
                              <option
                                key={category.id}
                                value={category.id}
                                disabled={used.has(category.id)}
                              >
                                {category.name}
                              </option>
                            ))}
                          </select>
                        </label>

                        <label>
                          Subcategory
                          <select
                            value={subcategorySelectValue}
                            onChange={(event) => {
                              const value = event.target.value;
                              if (value === "__more__") {
                                updatePlacement(index, { subcategoryMode: "preset", subcategoryLabel: "More" });
                                return;
                              }
                              if (value === "__other__") {
                                updatePlacement(index, { subcategoryMode: "custom", subcategoryLabel: "" });
                                return;
                              }
                              updatePlacement(index, { subcategoryMode: "preset", subcategoryLabel: value });
                            }}
                            disabled={!placement.categoryId}
                          >
                            <option value="">General</option>
                            {subcategories.map((name) => (
                              <option key={name} value={name}>
                                {name}
                              </option>
                            ))}
                            {customSubcategories.map((name) => (
                              <option key={name} value={name}>
                                {name}
                              </option>
                            ))}
                            <option value="__more__">More</option>
                            <option value="__other__">Other (Specify)</option>
                          </select>
                        </label>

                        {isCustom && (
                          <label className="placement-custom">
                            Other subcategory
                            <input
                              value={placement.subcategoryLabel}
                              placeholder="Type a subcategory (e.g. Baby Toiletries)"
                              onChange={(event) =>
                                updatePlacement(index, { subcategoryLabel: event.target.value })
                              }
                            />
                          </label>
                        )}

                        <div className="placement-actions">
                          {index > 0 && (
                            <button
                              className="btn btn-outline"
                              type="button"
                              onClick={() => makePrimaryPlacement(index)}
                            >
                              Make primary
                            </button>
                          )}
                          {form.placements.length > 1 && (
                            <button
                              className="btn btn-outline"
                              type="button"
                              onClick={() => removePlacement(index)}
                            >
                              Remove
                            </button>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
              <label>
                Current Quantity
                <input
                  type="number"
                  value={numberValueOrPlaceholder(form.quantity)}
                  onChange={(event) => setForm({ ...form, quantity: parseNumberInput(event.target.value) })}
                  placeholder="0"
                />
              </label>
              <label>
                Minimum Quantity
                <input
                  type="number"
                  value={numberValueOrPlaceholder(form.minQuantity)}
                  onChange={(event) => setForm({ ...form, minQuantity: parseNumberInput(event.target.value) })}
                  placeholder="0"
                />
              </label>
              <label>
                Maximum Quantity
                <input
                  type="number"
                  value={numberValueOrPlaceholder(form.maxQuantity)}
                  onChange={(event) => setForm({ ...form, maxQuantity: parseNumberInput(event.target.value) })}
                  placeholder="0"
                />
              </label>
              <label>
                Cost Price
                <input
                  type="number"
                  step="0.01"
                  value={numberValueOrPlaceholder(form.costPrice)}
                  onChange={(event) => setForm({ ...form, costPrice: parseNumberInput(event.target.value) })}
                  placeholder="0"
                />
              </label>
              <label>
                Selling Price
                <input
                  type="number"
                  step="0.01"
                  value={numberValueOrPlaceholder(form.sellingPrice)}
                  onChange={(event) => setForm({ ...form, sellingPrice: parseNumberInput(event.target.value) })}
                  placeholder="0"
                />
              </label>
              <label>
                Tax Mode
                <select
                  value={form.taxMode}
                  onChange={(event) =>
                    setForm({
                      ...form,
                      taxMode:
                        event.target.value === "fixed" ? "fixed" : "percent"
                    })
                  }
                >
                  <option value="percent">Percent (%)</option>
                  <option value="fixed">Fixed amount</option>
                </select>
              </label>
              <label>
                Tax Value
                <input
                  type="number"
                  step="0.01"
                  value={numberValueOrPlaceholder(form.taxValue)}
                  onChange={(event) =>
                    setForm({ ...form, taxValue: parseNumberInput(event.target.value) })
                  }
                  placeholder={form.taxMode === "fixed" ? "0" : "0"}
                />
              </label>
              <label>
                Supplier
                <select value={form.supplier} onChange={(event) => setForm({ ...form, supplier: event.target.value })}>
                  <option value="">Select supplier</option>
                  {suppliers.map((supplier) => (
                    <option value={supplier.name} key={supplier.id}>
                      {supplier.name}
                    </option>
                  ))}
                </select>
              </label>
              <label>
                Location
                <select value={form.location} onChange={(event) => setForm({ ...form, location: event.target.value })}>
                  <option>Main Store</option>
                  <option>Warehouse A</option>
                  <option>Warehouse B</option>
                </select>
              </label>
              <label>
                Expiry Date
                <input
                  type="date"
                  value={form.expiryDate}
                  onChange={(event) => setForm({ ...form, expiryDate: event.target.value })}
                />
              </label>
              <label>
                Batch Number
                <input
                  value={form.batchNumber}
                  onChange={(event) => setForm({ ...form, batchNumber: event.target.value })}
                />
              </label>
              <label className="full">
                Description
                <textarea
                  rows={3}
                  value={form.description}
                  onChange={(event) => setForm({ ...form, description: event.target.value })}
                />
              </label>
            </div>
            <footer>
              <button
                className="btn btn-outline"
                onClick={() => setShowProductModal(false)}
                disabled={saveBusy || imageUploadBusy}
                data-tour="inventory-close-product-modal"
              >
                Cancel
              </button>
              <button
                className="btn btn-primary"
                onClick={() => void submitProduct()}
                disabled={saveBusy || imageUploadBusy}
                data-tour="inventory-save-product"
              >
                {saveBusy ? "Saving..." : form.id ? "Update Product" : "Add Product"}
              </button>
            </footer>
          </div>
        </div>
      )}

      {showScanModal && (
        <div className="modal-backdrop">
          <div className="modal">
            <header>
              <h3>Scan Barcode</h3>
              <button className="icon-btn" onClick={() => setShowScanModal(false)}>
                X
              </button>
            </header>
            <div className="modal-body">
              <button
                className="scan-dashed"
                onClick={() => void startCameraScan()}
                disabled={cameraBusy}
              >
                <ScanLine size={30} />
                <div>
                  <strong>Scan with Camera</strong>
                  <small>
                    {cameraBusy ? "Scanning..." : "Allow camera access to scan barcode"}
                  </small>
                </div>
              </button>
              {cameraStatus && <p className="muted">{cameraStatus}</p>}
              <div className="divider">or</div>
              <label>
                Enter Barcode Manually
                <input value={manualBarcode} onChange={(event) => setManualBarcode(event.target.value)} />
              </label>
              <button className="btn btn-primary" onClick={() => scanBarcode(manualBarcode.trim())}>
                Scan
              </button>
            </div>
          </div>
        </div>
      )}

      {showAdjustModal && (
        <div className="modal-backdrop">
          <div className="modal">
            <header>
              <h3>Stock Adjustment</h3>
              <button className="icon-btn" onClick={() => setShowAdjustModal(false)}>
                X
              </button>
            </header>
            <div className="modal-body">
              <label>
                Quantity Change
                <input
                  type="number"
                  value={adjust.quantity}
                  onChange={(event) => setAdjust({ ...adjust, quantity: Number(event.target.value) || 0 })}
                />
              </label>
              <label>
                Reason
                <select value={adjust.reason} onChange={(event) => setAdjust({ ...adjust, reason: event.target.value })}>
                  <option>Stock count correction</option>
                  <option>Damaged items</option>
                  <option>Restock received</option>
                  <option>Manual correction</option>
                </select>
              </label>
              <label>
                Warehouse
                <select
                  value={adjust.warehouse}
                  onChange={(event) => setAdjust({ ...adjust, warehouse: event.target.value })}
                >
                  <option>Main Store</option>
                  <option>Warehouse A</option>
                  <option>Warehouse B</option>
                </select>
              </label>
            </div>
            <footer>
              <button className="btn btn-outline" onClick={() => setShowAdjustModal(false)}>
                Cancel
              </button>
              <button className="btn btn-primary" onClick={submitAdjust}>
                Confirm
              </button>
            </footer>
          </div>
        </div>
      )}

      {showImportModal && (
        <div className="modal-backdrop">
          <div className="modal">
            <header>
              <h3>Import Inventory CSV</h3>
              <button className="icon-btn" onClick={() => setShowImportModal(false)}>
                X
              </button>
            </header>
            <div className="modal-body">
              <p className="muted">
                Upload a CSV with columns: SKU, Name, Barcode, Category, Quantity, Min Qty, Cost Price, Selling Price,
                Supplier, Location, Unit.
              </p>
              <div className="line-item">
                <button className="btn btn-outline" onClick={downloadTemplate}>
                  Download template
                </button>
              </div>
              <label>
                CSV File
                <input
                  type="file"
                  accept=".csv,text/csv"
                  onChange={(event) => {
                    const file = event.target.files?.[0] ?? null;
                    setImportFile(file);
                    setImportError("");
                  }}
                />
              </label>
              {importError && <p className="danger-text">{importError}</p>}
            </div>
            <footer>
              <button className="btn btn-outline" onClick={() => setShowImportModal(false)} disabled={importBusy}>
                Cancel
              </button>
              <button className="btn btn-primary" onClick={() => void submitImport()} disabled={importBusy}>
                {importBusy ? "Importing..." : "Import"}
              </button>
            </footer>
          </div>
        </div>
      )}
    </div>
  );
}






