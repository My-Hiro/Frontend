import {
  ArrowDown,
  ArrowUp,
  Bell,
  Copy,
  Download,
  FileCheck2,
  Link2,
  LockKeyhole,
  Mail,
  MessageCircle,
  Save,
  Share2,
  Smartphone,
  Upload
} from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import { ImageCropModal } from "../components/media/ImageCropModal";
import { GHANA_REGIONS } from "../constants/ghanaRegions";
import { loadGoogleMapsJs } from "../lib/googleMaps";
import { merchantApi } from "../state/api";
import type {
  Category,
  InventoryItem,
  NotificationChannel,
  NotificationPreferences,
  StoreVerificationDocument,
  StoreOpenHour,
  StoreProfile
} from "../state/types";

interface Props {
  preferences: NotificationPreferences;
  onChange: (next: NotificationPreferences) => void;
  storeProfile: StoreProfile;
  onSaveStoreProfile: (next: StoreProfile) => Promise<void>;
  items: InventoryItem[];
  categories: Category[];
  onImportCsv: (csv: string) => Promise<{ imported: number; skipped: number }>;
}

const labels: Record<NotificationChannel, string> = {
  in_app: "In-app",
  email: "Email",
  whatsapp: "WhatsApp",
  sms: "SMS"
};

const channelIcon: Record<NotificationChannel, JSX.Element> = {
  in_app: <Bell size={16} />,
  email: <Mail size={16} />,
  whatsapp: <MessageCircle size={16} />,
  sms: <Smartphone size={16} />
};

const weekDays: StoreOpenHour["day"][] = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

export function SettingsPage({
  preferences,
  onChange,
  storeProfile,
  onSaveStoreProfile,
  items,
  categories,
  onImportCsv
}: Props) {
  const [draft, setDraft] = useState<StoreProfile>(storeProfile);
  const [toast, setToast] = useState("");
  const [saving, setSaving] = useState(false);

  const [showImportModal, setShowImportModal] = useState(false);
  const [importFile, setImportFile] = useState<File | null>(null);
  const [importBusy, setImportBusy] = useState(false);
  const [importError, setImportError] = useState("");
  const [locationQuery, setLocationQuery] = useState("");
  const [mapsReady, setMapsReady] = useState(false);
  const [mapsError, setMapsError] = useState("");
  const [photoUploadBusy, setPhotoUploadBusy] = useState(false);
  const [photoUploadError, setPhotoUploadError] = useState("");
  const [pendingPhotoTarget, setPendingPhotoTarget] = useState<"logo" | "banner" | null>(null);
  const [pendingPhotoFile, setPendingPhotoFile] = useState<File | null>(null);
  const locationInputRef = useRef<HTMLInputElement | null>(null);
  const mapContainerRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<any>(null);
  const markerRef = useRef<any>(null);
  const autocompleteRef = useRef<any>(null);
  const geocoderRef = useRef<any>(null);

  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [verificationDocs, setVerificationDocs] = useState<StoreVerificationDocument[]>([]);
  const [verificationBusy, setVerificationBusy] = useState(false);
  const [verificationDocType, setVerificationDocType] =
    useState<StoreVerificationDocument["docType"]>("business_document");
  const [verificationDocLabel, setVerificationDocLabel] = useState("");

  useEffect(() => {
    setDraft(storeProfile);
  }, [storeProfile]);

  useEffect(() => {
    let mounted = true;
    setVerificationBusy(true);
    void merchantApi
      .listVerificationDocuments(storeProfile.storeId)
      .then((rows) => {
        if (!mounted) return;
        setVerificationDocs(rows);
      })
      .catch(() => {
        if (!mounted) return;
        setVerificationDocs([]);
      })
      .finally(() => {
        if (!mounted) return;
        setVerificationBusy(false);
      });
    return () => {
      mounted = false;
    };
  }, [storeProfile.storeId]);

  useEffect(() => {
    const fallback = [draft.address, draft.city, draft.region].filter(Boolean).join(", ");
    setLocationQuery(fallback || "Accra, Ghana");
  }, [draft.address, draft.city, draft.region]);

  const updateOpenHoursByDay = (next: StoreOpenHour[]) => {
    const summary = next
      .map((entry) =>
        entry.closed ? `${entry.day}: Closed` : `${entry.day}: ${entry.open}-${entry.close}`
      )
      .join(", ");
    setDraft((current) => ({
      ...current,
      openHoursByDay: next,
      openHours: summary
    }));
  };

  useEffect(() => {
    let cancelled = false;
    const initMaps = async () => {
      try {
        const maps = await loadGoogleMapsJs();
        if (cancelled) return;
        setMapsReady(true);
        setMapsError("");
        const center = {
          lat: Number.isFinite(draft.lat) ? Number(draft.lat) : 5.6037,
          lng: Number.isFinite(draft.lng) ? Number(draft.lng) : -0.187
        };

        if (mapContainerRef.current && !mapRef.current) {
          mapRef.current = new maps.Map(mapContainerRef.current, {
            center,
            zoom: 13,
            mapTypeControl: false,
            streetViewControl: false,
            fullscreenControl: false,
            clickableIcons: false
          });
          markerRef.current = new maps.Marker({
            map: mapRef.current,
            position: center
          });
          mapRef.current.addListener("click", (event: any) => {
            const lat = event?.latLng?.lat?.();
            const lng = event?.latLng?.lng?.();
            if (!Number.isFinite(lat) || !Number.isFinite(lng)) return;
            setDraft((current) => ({ ...current, lat, lng }));
            markerRef.current?.setPosition({ lat, lng });
            geocoderRef.current?.geocode?.(
              { location: { lat, lng } },
              (results: any, status: string) => {
                if (status === "OK" && Array.isArray(results) && results[0]?.formatted_address) {
                  setLocationQuery(String(results[0].formatted_address));
                }
              }
            );
          });
        }

        if (locationInputRef.current && !autocompleteRef.current) {
          autocompleteRef.current = new maps.places.Autocomplete(locationInputRef.current, {
            fields: ["formatted_address", "geometry", "name"]
          });
          autocompleteRef.current.addListener("place_changed", () => {
            const place = autocompleteRef.current?.getPlace?.();
            const lat = place?.geometry?.location?.lat?.();
            const lng = place?.geometry?.location?.lng?.();
            if (!Number.isFinite(lat) || !Number.isFinite(lng)) return;
            const label = String(place.formatted_address || place.name || "").trim();
            setLocationQuery(label);
            setDraft((current) => ({ ...current, lat, lng }));
            mapRef.current?.panTo({ lat, lng });
            markerRef.current?.setPosition({ lat, lng });
          });
        }

        if (!geocoderRef.current) {
          geocoderRef.current = new maps.Geocoder();
        }
      } catch (error) {
        if (cancelled) return;
        setMapsReady(false);
        setMapsError(error instanceof Error ? error.message : "Google Maps unavailable.");
      }
    };
    void initMaps();
    return () => {
      cancelled = true;
    };
  }, [draft.lat, draft.lng]);

  const enabledChannels = useMemo(
    () => Object.entries(preferences.channels).filter(([, enabled]) => enabled).map(([channel]) => channel as NotificationChannel),
    [preferences.channels]
  );

  const movePriority = (channel: NotificationChannel, direction: -1 | 1) => {
    const idx = preferences.channelPriority.indexOf(channel);
    const next = idx + direction;
    if (idx < 0 || next < 0 || next >= preferences.channelPriority.length) {
      return;
    }
    const updated = [...preferences.channelPriority];
    [updated[idx], updated[next]] = [updated[next], updated[idx]];
    onChange({ ...preferences, channelPriority: updated });
  };

  const toggleChannel = (channel: NotificationChannel) => {
    if (preferences.lowStockEnabled && preferences.channels[channel] && enabledChannels.length === 1) {
      setToast("Keep at least one channel enabled, or turn off Low Stock Alerts.");
      setTimeout(() => setToast(""), 2600);
      return;
    }
    onChange({
      ...preferences,
      channels: {
        ...preferences.channels,
        [channel]: !preferences.channels[channel]
      }
    });
  };

  const testSend = async (channel: NotificationChannel) => {
    const destination =
      channel === "email"
        ? preferences.emails[0]
        : channel === "in_app"
          ? draft.storeId
          : preferences.phones[0];

    if (!destination) {
      setToast(
        channel === "email"
          ? "Add an email address first."
          : channel === "in_app"
            ? "In-app destination missing."
            : "Add a phone number first (+233...)."
      );
      setTimeout(() => setToast(""), 2600);
      return;
    }

    try {
      const result = await merchantApi.testNotificationChannel(draft.storeId, { channel, destination });
      const status = String(result.status ?? "sent");
      const provider = String(result.provider ?? "provider");
      setToast(`Test ${labels[channel]}: ${status} via ${provider}`);
      setTimeout(() => setToast(""), 2600);
    } catch {
      setToast(`Test ${labels[channel]} failed`);
      setTimeout(() => setToast(""), 2600);
    }
  };

  const saveProfile = async () => {
    setSaving(true);
    try {
      await onSaveStoreProfile(draft);
      setToast("Settings saved");
      setTimeout(() => setToast(""), 2400);
    } catch {
      setToast("Could not save settings (API unavailable)");
      setTimeout(() => setToast(""), 3000);
    } finally {
      setSaving(false);
    }
  };

  const cancelChanges = () => {
    setDraft(storeProfile);
    setToast("Changes discarded");
    setTimeout(() => setToast(""), 2200);
  };

  const exportInventory = () => {
    const encodePlacements = (item: InventoryItem): string => {
      const placements =
        Array.isArray(item.placements) && item.placements.length > 0
          ? item.placements
          : [
              {
                categoryId: item.category,
                subcategoryLabel: item.subcategory || "General"
              }
            ];
      return placements
        .map((placement) => `${placement.categoryId}:${placement.subcategoryLabel}`)
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
    items.forEach((item) => {
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
    link.download = `inventory-export-${new Date().toISOString().slice(0, 10)}.csv`;
    link.click();
    URL.revokeObjectURL(url);
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

  const updatePassword = () => {
    if (!currentPassword || !newPassword || !confirmPassword) {
      setToast("Fill in all password fields.");
      setTimeout(() => setToast(""), 2400);
      return;
    }
    if (newPassword.length < 8) {
      setToast("New password should be at least 8 characters.");
      setTimeout(() => setToast(""), 2400);
      return;
    }
    if (newPassword !== confirmPassword) {
      setToast("New password and confirmation do not match.");
      setTimeout(() => setToast(""), 2400);
      return;
    }
    setCurrentPassword("");
    setNewPassword("");
    setConfirmPassword("");
    setToast("Password updated (demo)");
    setTimeout(() => setToast(""), 2400);
  };

  const toggleCategory = (categoryId: string) => {
    setDraft((current) => {
      const exists = current.categories.includes(categoryId);
      const categories = exists
        ? current.categories.filter((entry) => entry !== categoryId)
        : [...current.categories, categoryId];
      return {
        ...current,
        categories,
        category: categories[0] ?? current.category
      };
    });
  };

  const useCurrentLocation = () => {
    if (!navigator.geolocation) {
      setToast("Geolocation is not supported on this device.");
      setTimeout(() => setToast(""), 2600);
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const lat = pos.coords.latitude;
        const lng = pos.coords.longitude;
        setDraft((current) => ({ ...current, lat, lng }));
        mapRef.current?.panTo({ lat, lng });
        markerRef.current?.setPosition({ lat, lng });
        geocoderRef.current?.geocode?.({ location: { lat, lng } }, (results: any, status: string) => {
          if (status === "OK" && Array.isArray(results) && results[0]?.formatted_address) {
            setLocationQuery(String(results[0].formatted_address));
          }
        });
      },
      () => {
        setToast("Could not read your location.");
        setTimeout(() => setToast(""), 2600);
      },
      { enableHighAccuracy: true, timeout: 9000 }
    );
  };

  const uploadStorePhoto = async (file: File, target: "logo" | "banner") => {
    setPhotoUploadError("");
    if (!String(file.type ?? "").toLowerCase().startsWith("image/")) {
      setPhotoUploadError("Please select an image file.");
      return;
    }
    setPendingPhotoTarget(target);
    setPendingPhotoFile(file);
  };

  const closePhotoCrop = () => {
    if (photoUploadBusy) return;
    setPendingPhotoTarget(null);
    setPendingPhotoFile(null);
  };

  const applyPhotoCrop = async (blob: Blob) => {
    if (!pendingPhotoTarget) {
      return;
    }
    setPhotoUploadBusy(true);
    setPhotoUploadError("");
    try {
      const filename = `${pendingPhotoTarget}-${Date.now()}.webp`;
      const file = new File([blob], filename, { type: "image/webp" });
      const preset = pendingPhotoTarget === "logo" ? "store_logo" : "store_banner";
      const url = await merchantApi.uploadMedia(file, preset);
      setDraft((current) =>
        pendingPhotoTarget === "logo" ? { ...current, logoUrl: url } : { ...current, bannerUrl: url }
      );
      setPendingPhotoTarget(null);
      setPendingPhotoFile(null);
      setToast(pendingPhotoTarget === "logo" ? "Store logo uploaded" : "Store banner uploaded");
      setTimeout(() => setToast(""), 2200);
    } catch (error) {
      setPhotoUploadError(error instanceof Error ? error.message : "Upload failed.");
    } finally {
      setPhotoUploadBusy(false);
    }
  };

  const discoveryShareLink = merchantApi.getDiscoveryStoreShareLink(draft.storeId);

  const copyShareLink = async () => {
    try {
      await navigator.clipboard.writeText(discoveryShareLink);
      setToast("Store page link copied.");
      setTimeout(() => setToast(""), 2200);
    } catch {
      setToast("Could not copy link.");
      setTimeout(() => setToast(""), 2200);
    }
  };

  const shareStoreLink = async () => {
    if ((navigator as Navigator & { share?: (data: ShareData) => Promise<void> }).share) {
      try {
        await (navigator as Navigator & { share: (data: ShareData) => Promise<void> }).share({
          title: `${draft.name} on myHiro`,
          text: "Shop our store on myHiro Discovery",
          url: discoveryShareLink
        });
      } catch {
        // User canceled or share failed.
      }
      return;
    }
    void copyShareLink();
  };

  const uploadVerificationFile = async (file: File) => {
    if (!verificationDocLabel.trim()) {
      setToast("Add a document label first.");
      setTimeout(() => setToast(""), 2400);
      return;
    }
    setVerificationBusy(true);
    try {
      const fileUrl = await merchantApi.uploadMedia(file, "verification_document");
      const row = await merchantApi.uploadVerificationDocument(draft.storeId, {
        docType: verificationDocType,
        label: verificationDocLabel.trim(),
        fileUrl
      });
      setVerificationDocs((current) => [row, ...current]);
      setVerificationDocLabel("");
      setToast("Verification document uploaded.");
      setTimeout(() => setToast(""), 2200);
    } catch {
      setToast("Document upload failed.");
      setTimeout(() => setToast(""), 2400);
    } finally {
      setVerificationBusy(false);
    }
  };

  const submitVerification = async () => {
    setVerificationBusy(true);
    try {
      await merchantApi.submitVerificationDocuments(draft.storeId);
      setDraft((current) => ({ ...current, verificationSubmitted: true }));
      setToast("Documents submitted for admin review.");
      setTimeout(() => setToast(""), 2400);
    } catch {
      setToast("Could not submit verification.");
      setTimeout(() => setToast(""), 2400);
    } finally {
      setVerificationBusy(false);
    }
  };

  return (
    <div className="page-stack settings-page">
      {toast && <div className="toast">{toast}</div>}
      <section className="panel" data-tour="settings-store-info">
        <div className="panel-head">
          <div>
            <h3>Store Information</h3>
            <p>Basic store details</p>
          </div>
        </div>
        <div className="form-grid">
          <label>
            Store Name
            <input
              value={draft.name}
              onChange={(event) => setDraft({ ...draft, name: event.target.value })}
            />
          </label>
          <label>
            Email Address
            <input
              value={draft.contactEmail}
              onChange={(event) => setDraft({ ...draft, contactEmail: event.target.value })}
            />
          </label>
          <label>
            Phone Number
            <input
              value={draft.contactPhone}
              onChange={(event) => setDraft({ ...draft, contactPhone: event.target.value })}
              placeholder="+233 24 000 0000"
            />
          </label>
          <label>
            Store Type
            <select
              value={draft.storeType}
              onChange={(event) => setDraft({ ...draft, storeType: event.target.value })}
            >
              <option>Supermarket</option>
              <option>Provision Shop</option>
              <option>Pharmacy</option>
              <option>Spare Parts</option>
              <option>Electronics</option>
              <option>Retail Store</option>
              <option>Other</option>
            </select>
          </label>
          <label className="full">
            Store Categories
            <div className="category-select-grid">
              {categories.map((entry) => {
                const selected = draft.categories.includes(entry.id);
                return (
                  <button
                    key={entry.id}
                    type="button"
                    className={selected ? "pill primary" : "pill"}
                    onClick={() => toggleCategory(entry.id)}
                  >
                    {entry.name}
                  </button>
                );
              })}
            </div>
            <small className="muted">
              Selected:{" "}
              {draft.categories.length > 0
                ? draft.categories
                    .map((id) => categories.find((entry) => entry.id === id)?.name ?? id)
                    .join(", ")
                : "No categories selected"}
            </small>
          </label>
          <label>
            City
            <input
              value={draft.city ?? ""}
              onChange={(event) => setDraft({ ...draft, city: event.target.value })}
              placeholder="Accra"
            />
          </label>
          <label>
            Region
            <select
              value={draft.region ?? ""}
              onChange={(event) => setDraft({ ...draft, region: event.target.value })}
            >
              <option value="">Select region</option>
              {GHANA_REGIONS.map((region) => (
                <option key={region} value={region}>
                  {region}
                </option>
              ))}
            </select>
          </label>
          <label className="full">
            Open Hours
            <div className="open-hours-grid">
              {weekDays.map((day) => {
                const row =
                  draft.openHoursByDay.find((entry) => entry.day === day) ??
                  { day, open: "07:00", close: "21:00", closed: false };
                return (
                  <div key={day} className="open-hours-row">
                    <strong>{day}</strong>
                    <label className="check-inline">
                      <input
                        type="checkbox"
                        checked={Boolean(row.closed)}
                        onChange={(event) =>
                          updateOpenHoursByDay(
                            draft.openHoursByDay.map((entry) =>
                              entry.day === day ? { ...entry, closed: event.target.checked } : entry
                            )
                          )
                        }
                      />
                      <span>Closed</span>
                    </label>
                    <div className="open-hours-time-wrap">
                      <input
                        type="time"
                        value={row.open}
                        disabled={Boolean(row.closed)}
                        onChange={(event) =>
                          updateOpenHoursByDay(
                            draft.openHoursByDay.map((entry) =>
                              entry.day === day ? { ...entry, open: event.target.value } : entry
                            )
                          )
                        }
                      />
                      <span>to</span>
                      <input
                        type="time"
                        value={row.close}
                        disabled={Boolean(row.closed)}
                        onChange={(event) =>
                          updateOpenHoursByDay(
                            draft.openHoursByDay.map((entry) =>
                              entry.day === day ? { ...entry, close: event.target.value } : entry
                            )
                          )
                        }
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          </label>

          <label className="full">
            Store Photos
            <div className="photo-row">
              <div className="photo-actions">
                <small className="muted">Logo (used in discovery listings)</small>
                {draft.logoUrl && <img className="photo-preview" src={draft.logoUrl} alt="Store logo preview" />}
                <div className="line-item">
                  <input
                    type="file"
                    accept="image/*"
                    onChange={(event) => {
                      const file = event.target.files?.[0];
                      if (file) {
                        void uploadStorePhoto(file, "logo");
                      }
                      event.target.value = "";
                    }}
                  />
                </div>
              </div>
              <div className="photo-actions">
                <small className="muted">Banner (used on store profile)</small>
                {draft.bannerUrl && (
                  <img className="photo-preview" src={draft.bannerUrl} alt="Store banner preview" />
                )}
                <div className="line-item">
                  <input
                    type="file"
                    accept="image/*"
                    onChange={(event) => {
                      const file = event.target.files?.[0];
                      if (file) {
                        void uploadStorePhoto(file, "banner");
                      }
                      event.target.value = "";
                    }}
                  />
                </div>
              </div>
            </div>
            {photoUploadBusy && <small className="muted">Uploading photo...</small>}
            {photoUploadError && <small className="danger-text">{photoUploadError}</small>}
          </label>
          <label className="full">
            Address
            <textarea
              rows={3}
              value={draft.address}
              onChange={(event) => setDraft({ ...draft, address: event.target.value })}
              placeholder="Enter store address"
            />
          </label>
          <label className="full" data-tour="settings-location">
            Set Location (Google Maps)
            <small className="muted">
              If you skipped this during onboarding, be at your primary business location and set it now.
            </small>
            <input
              ref={locationInputRef}
              value={locationQuery}
              onChange={(event) => setLocationQuery(event.target.value)}
              placeholder="Search by area or landmark"
            />
            <div
              style={{
                marginTop: 8,
                border: "1px solid var(--line)",
                borderRadius: 10,
                overflow: "hidden",
                aspectRatio: "16 / 9",
                background: "var(--panel)"
              }}
            >
              {mapsReady ? (
                <div ref={mapContainerRef} style={{ width: "100%", height: "100%" }} />
              ) : (
                <iframe
                  title="Store location preview"
                  src={`https://www.google.com/maps?q=${encodeURIComponent(
                    locationQuery || "Accra, Ghana"
                  )}&output=embed`}
                  style={{ width: "100%", height: "100%", border: 0 }}
                  loading="lazy"
                  referrerPolicy="no-referrer-when-downgrade"
                />
              )}
            </div>
            {mapsError && <small className="danger-text">{mapsError}</small>}
            <div className="inline-actions" style={{ marginTop: 8 }}>
              <button type="button" className="btn btn-outline" onClick={useCurrentLocation} data-tour="settings-use-current-location">
                Use current location
              </button>
              <input
                type="number"
                step="0.000001"
                value={draft.lat ?? ""}
                placeholder="Latitude"
                onChange={(event) =>
                  setDraft({
                    ...draft,
                    lat: event.target.value ? Number(event.target.value) : undefined
                  })
                }
              />
              <input
                type="number"
                step="0.000001"
                value={draft.lng ?? ""}
                placeholder="Longitude"
                onChange={(event) =>
                  setDraft({
                    ...draft,
                    lng: event.target.value ? Number(event.target.value) : undefined
                  })
                }
              />
            </div>
          </label>

          <label className="full">
            Store Team & Usage Privileges
            <div className="list-stack">
              {draft.staffAccounts.map((account) => (
                <div key={account.id} className="line-item">
                  <div style={{ minWidth: 0 }}>
                    <strong>{account.name}</strong>
                    <small>{account.email}</small>
                  </div>
                  <div className="inline-actions">
                    <select
                      value={account.role}
                      onChange={(event) =>
                        setDraft((current) => ({
                          ...current,
                          staffAccounts: current.staffAccounts.map((entry) =>
                            entry.id === account.id
                              ? {
                                  ...entry,
                                  role: event.target.value as typeof entry.role
                                }
                              : entry
                          )
                        }))
                      }
                    >
                      <option value="admin">Admin</option>
                      <option value="manager">Manager</option>
                      <option value="cashier">Cashier</option>
                      <option value="viewer">Viewer</option>
                    </select>
                    <label className="check-inline">
                      <input
                        type="checkbox"
                        checked={account.active}
                        onChange={(event) =>
                          setDraft((current) => ({
                            ...current,
                            staffAccounts: current.staffAccounts.map((entry) =>
                              entry.id === account.id ? { ...entry, active: event.target.checked } : entry
                            )
                          }))
                        }
                      />
                      <span>Active</span>
                    </label>
                  </div>
                </div>
              ))}
              <button
                type="button"
                className="btn btn-outline"
                onClick={() =>
                  setDraft((current) => ({
                    ...current,
                    staffAccounts: [
                      ...current.staffAccounts,
                      {
                        id: `acct-${Date.now()}`,
                        name: "New Staff",
                        email: "",
                        role: "viewer",
                        active: true
                      }
                    ]
                  }))
                }
              >
                Add account
              </button>
            </div>
          </label>
        </div>
      </section>

      <section className="panel">
        <div className="panel-head">
          <div>
            <h3>Share Link to Your Store Page</h3>
            <p>Use this discovery link for ads, social media, and customer campaigns.</p>
          </div>
        </div>
        <div className="line-item">
          <div style={{ minWidth: 0 }}>
            <strong className="line-with-icon">
              <Link2 size={14} /> Discovery Store URL
            </strong>
            <small className="truncate">{discoveryShareLink}</small>
          </div>
          <div className="inline-actions">
            <button type="button" className="btn btn-outline" onClick={() => void copyShareLink()}>
              <Copy size={14} /> Copy
            </button>
            <button type="button" className="btn btn-primary" onClick={() => void shareStoreLink()}>
              <Share2 size={14} /> Share
            </button>
          </div>
        </div>
      </section>

      <section className="panel">
        <div className="panel-head">
          <div>
            <h3>Store Verification Documents</h3>
            <p>Upload business/store documents and national ID for verification review.</p>
          </div>
        </div>

        <div className="form-grid">
          <label>
            Document Type
            <select
              value={verificationDocType}
              onChange={(event) =>
                setVerificationDocType(event.target.value as StoreVerificationDocument["docType"])
              }
            >
              <option value="business_document">Business document</option>
              <option value="national_id">National ID</option>
              <option value="other">Other</option>
            </select>
          </label>
          <label className="full">
            Document Label
            <input
              value={verificationDocLabel}
              onChange={(event) => setVerificationDocLabel(event.target.value)}
              placeholder="E.g. Registrar General certificate"
            />
          </label>
          <label className="full">
            Upload Document
            <input
              type="file"
              accept="image/*,.pdf"
              onChange={(event) => {
                const file = event.target.files?.[0];
                if (!file) return;
                void uploadVerificationFile(file);
                event.target.value = "";
              }}
            />
          </label>
        </div>

        <div className="list-stack">
          {verificationDocs.map((doc) => (
            <div key={doc.id} className="line-item">
              <div style={{ minWidth: 0 }}>
                <strong className="line-with-icon">
                  <FileCheck2 size={14} />
                  {doc.label}
                </strong>
                <small>
                  {doc.docType.replace("_", " ")} | Uploaded{" "}
                  {new Date(doc.uploadedAt).toLocaleDateString("en-GH")}
                </small>
              </div>
              <span
                className={`pill ${
                  doc.status === "approved"
                    ? "pill-success"
                    : doc.status === "rejected"
                      ? "pill-danger"
                      : "pill-warning"
                }`}
              >
                {doc.status}
              </span>
            </div>
          ))}
          {!verificationBusy && verificationDocs.length === 0 && (
            <small className="muted">No verification documents uploaded yet.</small>
          )}
        </div>

        <div className="inline-actions" style={{ justifyContent: "flex-end", marginTop: 12 }}>
          <button
            type="button"
            className="btn btn-primary"
            onClick={() => void submitVerification()}
            disabled={verificationBusy || verificationDocs.length === 0}
          >
            {verificationBusy ? "Submitting..." : "Submit for admin review"}
          </button>
        </div>
      </section>

      <section className="panel">
        <div className="panel-head">
          <div>
            <h3>Regional Settings</h3>
            <p>Language and currency preferences</p>
          </div>
        </div>
        <div className="form-grid">
          <label>
            Currency
            <select
              value={draft.currency}
              onChange={(event) => setDraft({ ...draft, currency: event.target.value })}
            >
              <option value="GHS">GHS - Ghana Cedi</option>
              <option value="USD">USD - US Dollar</option>
            </select>
          </label>
          <label>
            Language
            <select
              value={draft.language}
              onChange={(event) => setDraft({ ...draft, language: event.target.value })}
            >
              <option value="en">English</option>
              <option value="fr">French</option>
            </select>
          </label>
          <label>
            Timezone
            <select
              value={draft.timezone}
              onChange={(event) => setDraft({ ...draft, timezone: event.target.value })}
            >
              <option value="Africa/Accra">Africa/Accra</option>
              <option value="UTC">UTC</option>
            </select>
          </label>
          <label>
            Date Format
            <select
              value={draft.dateFormat}
              onChange={(event) =>
                setDraft({ ...draft, dateFormat: event.target.value as StoreProfile["dateFormat"] })
              }
            >
              <option value="dmy">DD/MM/YYYY</option>
              <option value="mdy">MM/DD/YYYY</option>
              <option value="ymd">YYYY-MM-DD</option>
            </select>
          </label>
        </div>
      </section>

      <section className="panel">
        <div className="panel-head">
          <div>
            <h3>Notifications</h3>
            <p>Low-stock alerts via in-app, email, WhatsApp, and SMS</p>
          </div>
        </div>

        <div className="line-item" data-tour="low-stock-alerts">
          <div>
            <strong>Low Stock Alerts</strong>
            <small>Enable/disable low-stock alerts</small>
          </div>
          <label className="switch">
            <input
              type="checkbox"
              checked={preferences.lowStockEnabled}
              onChange={(event) => {
                const enabled = event.target.checked;
                if (enabled && enabledChannels.length === 0) {
                  onChange({
                    ...preferences,
                    lowStockEnabled: true,
                    channels: { ...preferences.channels, in_app: true }
                  });
                  return;
                }
                onChange({ ...preferences, lowStockEnabled: enabled });
              }}
            />
            <span />
          </label>
        </div>

        <div className="line-item">
          <div>
            <strong>Expiring Products</strong>
            <small>Get notified about products nearing expiry</small>
          </div>
          <label className="switch">
            <input
              type="checkbox"
              checked={preferences.expiringProductsEnabled}
              onChange={(event) =>
                onChange({ ...preferences, expiringProductsEnabled: event.target.checked })
              }
            />
            <span />
          </label>
        </div>

        <div className="line-item">
          <div>
            <strong>Daily Reports</strong>
            <small>Receive a daily summary via email</small>
          </div>
          <label className="switch">
            <input
              type="checkbox"
              checked={preferences.dailyReportEnabled}
              onChange={(event) => onChange({ ...preferences, dailyReportEnabled: event.target.checked })}
            />
            <span />
          </label>
        </div>

        <div className="line-item">
          <label>
            Threshold Mode
            <select
              value={preferences.thresholdMode}
              onChange={(event) =>
                onChange({
                  ...preferences,
                  thresholdMode: event.target.value as NotificationPreferences["thresholdMode"]
                })
              }
            >
              <option value="per_item_min">Per item minimum</option>
              <option value="absolute">Absolute threshold</option>
            </select>
          </label>
          {preferences.thresholdMode === "absolute" && (
            <label>
              Absolute Threshold
              <input
                type="number"
                value={preferences.absoluteThreshold}
                onChange={(event) =>
                  onChange({ ...preferences, absoluteThreshold: Number(event.target.value) || 1 })
                }
              />
            </label>
          )}
        </div>

        <div className="channel-matrix">
          {preferences.channelPriority.map((channel) => (
            <article className="channel-row" key={channel}>
              <div className="channel-main">
                <label className="check-inline">
                  <input
                    type="checkbox"
                    checked={preferences.channels[channel]}
                    onChange={() => toggleChannel(channel)}
                  />
                  <span>
                    {channelIcon[channel]} {labels[channel]}
                  </span>
                </label>
                <small>
                  {channel === "email"
                    ? "Destination: " + preferences.emails.join(", ")
                    : channel === "in_app"
                      ? "Destination: merchant dashboard inbox"
                      : "Destination: " + preferences.phones.join(", ")}
                </small>
              </div>
              <div className="inline-actions">
                <span className="verified-badge">Verified</span>
                <button className="btn btn-outline" onClick={() => void testSend(channel)}>
                  Send text
                </button>
                <button className="icon-btn" onClick={() => movePriority(channel, -1)}>
                  <ArrowUp size={14} />
                </button>
                <button className="icon-btn" onClick={() => movePriority(channel, 1)}>
                  <ArrowDown size={14} />
                </button>
              </div>
            </article>
          ))}
        </div>

        <div className="line-item">
          <div>
            <strong>Fallback Escalation</strong>
            <small>If WhatsApp fails, fallback to SMS/email by priority</small>
          </div>
          <label className="switch">
            <input
              type="checkbox"
              checked={preferences.fallbackEnabled}
              onChange={(event) => onChange({ ...preferences, fallbackEnabled: event.target.checked })}
            />
            <span />
          </label>
        </div>

        <div className="line-item">
          <label>
            Quiet Hours Start
            <input
              type="time"
              value={preferences.quietHoursStart}
              onChange={(event) => onChange({ ...preferences, quietHoursStart: event.target.value })}
            />
          </label>
          <label>
            Quiet Hours End
            <input
              type="time"
              value={preferences.quietHoursEnd}
              onChange={(event) => onChange({ ...preferences, quietHoursEnd: event.target.value })}
            />
          </label>
        </div>

        <div className="line-item">
          <label>
            Quiet Hours Timezone
            <select
              value={preferences.timezone}
              onChange={(event) => onChange({ ...preferences, timezone: event.target.value })}
            >
              <option value="Africa/Accra">Africa/Accra</option>
              <option value="UTC">UTC</option>
            </select>
          </label>
        </div>
      </section>

      <section className="panel">
        <div className="panel-head">
          <div>
            <h3>Data Management</h3>
            <p>Import, export, and backup your data</p>
          </div>
        </div>
        <div className="list-stack">
          <div className="line-item">
            <div>
              <strong>Export Data</strong>
              <small>Download all your inventory data</small>
            </div>
            <button className="btn btn-primary" onClick={exportInventory}>
              <Download size={16} /> Export
            </button>
          </div>
          <div className="line-item">
            <div>
              <strong>Import Data</strong>
              <small>Upload inventory data from CSV</small>
            </div>
            <button className="btn btn-outline" onClick={() => setShowImportModal(true)}>
              <Upload size={16} /> Import
            </button>
          </div>
          <div className="line-item danger-line">
            <div>
              <strong>Reset Data</strong>
              <small>Clear all data (cannot be undone)</small>
            </div>
            <button
              className="btn btn-danger"
              onClick={() => {
                setToast("Reset is disabled in this demo build.");
                setTimeout(() => setToast(""), 2600);
              }}
            >
              Reset
            </button>
          </div>
        </div>
      </section>

      <section className="panel">
        <div className="panel-head">
          <div>
            <h3>Security</h3>
            <p>Password and access control</p>
          </div>
        </div>
        <div className="form-grid">
          <label className="full">
            Current Password
            <input
              type="password"
              value={currentPassword}
              onChange={(event) => setCurrentPassword(event.target.value)}
              placeholder="Enter current password"
            />
          </label>
          <label>
            New Password
            <input
              type="password"
              value={newPassword}
              onChange={(event) => setNewPassword(event.target.value)}
              placeholder="Enter new password"
            />
          </label>
          <label>
            Confirm Password
            <input
              type="password"
              value={confirmPassword}
              onChange={(event) => setConfirmPassword(event.target.value)}
              placeholder="Confirm new password"
            />
          </label>
          <div className="full inline-actions" style={{ justifyContent: "flex-end" }}>
            <button className="btn btn-outline" onClick={updatePassword}>
              <LockKeyhole size={16} /> Update Password
            </button>
          </div>
        </div>
      </section>

      <footer className="settings-footer">
        <button className="btn btn-outline" onClick={cancelChanges} disabled={saving}>
          Cancel
        </button>
        <button className="btn btn-primary" onClick={() => void saveProfile()} disabled={saving} data-tour="settings-save">
          <Save size={16} /> Save Changes
        </button>
      </footer>

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

      <ImageCropModal
        open={Boolean(pendingPhotoTarget)}
        file={pendingPhotoFile}
        title={pendingPhotoTarget === "logo" ? "Adjust store logo" : "Adjust store banner"}
        aspectRatio={pendingPhotoTarget === "logo" ? 1 : 1440 / 560}
        outputWidth={pendingPhotoTarget === "logo" ? 512 : 1440}
        outputHeight={pendingPhotoTarget === "logo" ? 512 : 560}
        onCancel={closePhotoCrop}
        onApply={applyPhotoCrop}
      />
    </div>
  );
}
