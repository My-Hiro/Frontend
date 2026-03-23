"use client";

import React, { useState, useRef, useEffect } from "react";
import { Edit3, MapPin, Navigation, X } from "lucide-react";
import { useAppStore } from "@/store/useAppStore";

interface LocationAccessPromptProps {
  onLocationSelect: (label: string) => void;
  onClose: () => void;
}

export function LocationAccessPrompt({
  onLocationSelect,
  onClose
}: LocationAccessPromptProps) {
  const { location: currentStoreLocation } = useAppStore();
  const [showManualLocation, setShowManualLocation] = useState(false);
  const [locating, setLocating] = useState(false);
  const [manualLocation, setManualLocation] = useState(currentStoreLocation);
  const [locationError, setLocationError] = useState<string | null>(null);
  const [mapsError, setMapsError] = useState<string | null>(null);
  const [mapsReady, setMapsReady] = useState(false);

  const manualLocationInputRef = useRef<HTMLInputElement>(null);
  const manualMapContainerRef = useRef<HTMLDivElement>(null);

  // Simple location detection
  const handleUseMyLocation = () => {
    setLocating(true);
    setLocationError(null);
    
    if (!navigator.geolocation) {
      setLocationError("Geolocation is not supported by your browser.");
      setLocating(false);
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (position) => {
        // In a real app, you'd geocode these coordinates.
        // For this refactor, we'll simulate success.
        onLocationSelect("Current Location");
        setLocating(false);
      },
      (error) => {
        setLocationError("Unable to retrieve your location.");
        setLocating(false);
      }
    );
  };

  const handleUseSelectedLocation = () => {
    if (manualLocation.trim()) {
      onLocationSelect(manualLocation);
    } else {
      setLocationError("Please enter a location.");
    }
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm" role="dialog" aria-modal="true" aria-label="Location access prompt">
      <div className="bg-card w-full max-w-md rounded-2xl shadow-2xl overflow-hidden border border-border">
        {!showManualLocation ? (
          <div className="p-6 flex flex-col items-center text-center">
            <div className="w-16 h-16 bg-primary rounded-full flex items-center justify-center mb-6">
              <MapPin className="w-8 h-8 text-primary-foreground" />
            </div>
            <div className="mb-6">
              <h2 className="text-xl font-semibold mb-2">Enable location access</h2>
              <p className="text-sm text-muted-foreground">
                Allow location access to automatically see stores around you, or set a preferred
                location manually to still view stores in any area.
              </p>
            </div>

            {locationError && <div className="mb-4 text-xs text-destructive bg-destructive/10 p-2 rounded-lg w-full">{locationError}</div>}

            <div className="flex flex-col gap-3 w-full">
              <button
                type="button"
                onClick={handleUseMyLocation}
                className="flex items-center justify-center gap-2 w-full py-3 bg-primary text-primary-foreground rounded-xl font-medium transition-opacity hover:opacity-90 disabled:opacity-50"
                disabled={locating}
              >
                <Navigation className="w-4 h-4" />
                {locating ? "Getting location..." : "Allow location access"}
              </button>
              <button
                type="button"
                onClick={() => setShowManualLocation(true)}
                className="flex items-center justify-center gap-2 w-full py-3 bg-secondary text-secondary-foreground rounded-xl font-medium border border-border transition-colors hover:bg-secondary/80"
              >
                <Edit3 className="w-4 h-4" />
                Set location manually
              </button>
              <button
                type="button"
                onClick={onClose}
                className="w-full py-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
              >
                Skip for now
              </button>
            </div>
            <p className="mt-6 text-[10px] text-muted-foreground">
              Your location is private and only used to improve discovery results.
            </p>
          </div>
        ) : (
          <div className="p-6">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-lg font-semibold">Set your location</h2>
              <button
                type="button"
                onClick={() => setShowManualLocation(false)}
                className="p-2 rounded-full hover:bg-muted transition-colors"
                aria-label="Back to location options"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            
            <div className="flex flex-col gap-4">
              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-medium text-muted-foreground">Location Name</label>
                <input
                  ref={manualLocationInputRef}
                  value={manualLocation}
                  onChange={(event) => setManualLocation(event.target.value)}
                  placeholder="Accra, Kumasi, Takoradi..."
                  className="w-full px-4 py-2.5 bg-input-background border border-border rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary/20"
                />
              </div>

              <div className="aspect-video bg-muted rounded-xl overflow-hidden border border-border relative">
                <iframe
                  title="Google Maps location preview"
                  src={`https://www.google.com/maps?q=${encodeURIComponent(
                    manualLocation || "Accra, Ghana"
                  )}&output=embed`}
                  className="w-full h-full border-0"
                  loading="lazy"
                  referrerPolicy="no-referrer-when-downgrade"
                />
              </div>

              {mapsError && <div className="text-xs text-amber-600 bg-amber-50 p-2 rounded-lg">{mapsError}</div>}
              {locationError && <div className="text-xs text-destructive bg-destructive/10 p-2 rounded-lg">{locationError}</div>}

              <div className="flex gap-3 mt-2">
                <button
                  type="button"
                  onClick={handleUseSelectedLocation}
                  className="flex-1 py-3 bg-primary text-primary-foreground rounded-xl font-medium transition-opacity hover:opacity-90"
                >
                  Use this location
                </button>
                <button
                  type="button"
                  onClick={() => setShowManualLocation(false)}
                  className="flex-1 py-3 bg-secondary text-secondary-foreground rounded-xl font-medium border border-border transition-colors hover:bg-secondary/80"
                >
                  Back
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
