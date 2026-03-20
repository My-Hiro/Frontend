import type { MerchantOnboardingDraft } from "../types";

interface Props {
  draft: MerchantOnboardingDraft;
  locating: boolean;
  onUseCurrentLocation: () => void;
  onChange: (next: MerchantOnboardingDraft) => void;
}

export function LocationStep({
  draft,
  locating,
  onUseCurrentLocation,
  onChange
}: Props) {
  const lat = Number.isFinite(draft.lat) ? Number(draft.lat).toFixed(6) : "";
  const lng = Number.isFinite(draft.lng) ? Number(draft.lng).toFixed(6) : "";
  const locationMissing = !Number.isFinite(draft.lat) || !Number.isFinite(draft.lng);

  return (
    <div className="merchant-onboarding-content">
      <h2>Store location</h2>
      <p>Set coordinates for accurate discovery ranking and map directions.</p>
      {locationMissing && (
        <div className="merchant-verification-note">
          <h4>Set your primary business location</h4>
          <p>
            If you skipped location earlier, go to your primary business location and set it now.
          </p>
        </div>
      )}
      <div className="merchant-onboarding-grid">
        <label>
          Latitude
          <input
            type="number"
            step="0.000001"
            value={lat}
            onChange={(event) =>
              onChange({
                ...draft,
                lat: event.target.value ? Number(event.target.value) : undefined
              })
            }
            placeholder="5.6037"
          />
        </label>
        <label>
          Longitude
          <input
            type="number"
            step="0.000001"
            value={lng}
            onChange={(event) =>
              onChange({
                ...draft,
                lng: event.target.value ? Number(event.target.value) : undefined
              })
            }
            placeholder="-0.1870"
          />
        </label>
      </div>
      <div className="merchant-onboarding-actions-inline">
        <button type="button" onClick={onUseCurrentLocation} disabled={locating}>
          {locating ? "Locating..." : "Use current location"}
        </button>
      </div>
    </div>
  );
}
