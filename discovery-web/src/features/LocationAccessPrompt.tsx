import React from "react";
import { Edit3, MapPin, Navigation, X } from "lucide-react";

interface LocationAccessPromptProps {
  showManualLocation: boolean;
  locating: boolean;
  manualLocation: string;
  mapsReady: boolean;
  mapsError: string | null;
  locationError: string | null;
  manualLocationInputRef: React.RefObject<HTMLInputElement>;
  manualMapContainerRef: React.RefObject<HTMLDivElement>;
  onManualLocationChange: (value: string) => void;
  onUseMyLocation: () => void;
  onShowManualLocation: () => void;
  onBackToPrompt: () => void;
  onUseSelectedLocation: () => void;
  onSkip: () => void;
}

export function LocationAccessPrompt({
  showManualLocation,
  locating,
  manualLocation,
  mapsReady,
  mapsError,
  locationError,
  manualLocationInputRef,
  manualMapContainerRef,
  onManualLocationChange,
  onUseMyLocation,
  onShowManualLocation,
  onBackToPrompt,
  onUseSelectedLocation,
  onSkip
}: LocationAccessPromptProps) {
  return (
    <div className="location-access-shell" role="dialog" aria-modal="true" aria-label="Location access prompt">
      <div className="location-access-card">
        {!showManualLocation ? (
          <div className="location-access-content">
            <div className="location-access-icon-wrap">
              <div className="location-access-icon">
                <MapPin className="w-8 h-8 text-white" />
              </div>
            </div>
            <div className="location-access-copy">
              <h2>Enable location access</h2>
              <p>
                Allow location access to automatically see stores around you, or set a preferred
                location manually to still view stores in any area.
              </p>
            </div>

            {locationError && <div className="location-access-error">{locationError}</div>}

            <div className="location-access-actions">
              <button
                type="button"
                onClick={onUseMyLocation}
                className="location-access-btn location-access-btn-primary"
                disabled={locating}
              >
                <Navigation className="w-4 h-4" />
                {locating ? "Getting location..." : "Allow location access"}
              </button>
              <button
                type="button"
                onClick={onShowManualLocation}
                className="location-access-btn location-access-btn-outline"
              >
                <Edit3 className="w-4 h-4" />
                Set location manually
              </button>
              <button
                type="button"
                onClick={onSkip}
                className="location-access-btn location-access-btn-ghost"
              >
                Skip for now
              </button>
            </div>
            <p className="location-access-note">
              Your location is private and only used to improve discovery results.
            </p>
          </div>
        ) : (
          <div className="location-access-content">
            <button
              type="button"
              onClick={onBackToPrompt}
              className="location-access-close"
              aria-label="Back to location options"
            >
              <X className="w-4 h-4" />
            </button>
            <div className="location-access-icon-wrap">
              <div className="location-access-icon-manual">
                <Edit3 className="w-7 h-7" />
              </div>
            </div>
            <div className="location-access-copy">
              <h2>Set your location</h2>
              <p>Search and pinpoint your address using Google Maps.</p>
            </div>

            <label className="location-access-label">Location</label>
            <input
              ref={manualLocationInputRef}
              value={manualLocation}
              onChange={(event) => onManualLocationChange(event.target.value)}
              placeholder="Accra, Kumasi, Takoradi..."
              className="location-access-input"
            />

            <div className="location-access-map">
              {mapsReady ? (
                <div
                  ref={manualMapContainerRef}
                  style={{ width: "100%", height: "100%" }}
                  aria-label="Manual location map"
                />
              ) : (
                <iframe
                  title="Google Maps location preview"
                  src={`https://www.google.com/maps?q=${encodeURIComponent(
                    manualLocation || "Accra, Ghana"
                  )}&output=embed`}
                  style={{ width: "100%", height: "100%", border: 0 }}
                  loading="lazy"
                  referrerPolicy="no-referrer-when-downgrade"
                />
              )}
            </div>

            {mapsError && <div className="location-access-warning">{mapsError}</div>}
            {locationError && <div className="location-access-error">{locationError}</div>}

            <div className="location-access-actions dual">
              <button
                type="button"
                onClick={onUseSelectedLocation}
                className="location-access-btn location-access-btn-primary"
              >
                Use this location
              </button>
              <button
                type="button"
                onClick={onBackToPrompt}
                className="location-access-btn location-access-btn-outline"
              >
                Back
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
