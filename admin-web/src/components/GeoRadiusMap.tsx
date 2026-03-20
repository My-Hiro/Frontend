import React, { useEffect, useState, useRef } from "react";
import type { LeafletMouseEvent } from "leaflet";
import { MapContainer, TileLayer, Circle, CircleMarker, useMapEvents, useMap } from "react-leaflet";

type LatLng = { lat: number; lng: number };

function MapController({ center }: { center: LatLng }) {
  const map = useMap();

  useEffect(() => {
    if (!map) return;
    map.setView([center.lat, center.lng]);
    // Small delay to ensure container transition is finished
    const timer = setTimeout(() => {
      map.invalidateSize();
    }, 100);
    return () => clearTimeout(timer);
  }, [center.lat, center.lng, map]);

  return null;
}

function ClickToSetCenter({ onPick }: { onPick: (center: LatLng) => void }) {
  useMapEvents({
    click: (event: LeafletMouseEvent) => {
      onPick({ lat: event.latlng.lat, lng: event.latlng.lng });
    }
  });
  return null;
}

export function GeoRadiusMap({
  center,
  radiusKm,
  onCenterChange,
  onRadiusChange
}: {
  center: LatLng;
  radiusKm: number;
  onCenterChange: (center: LatLng) => void;
  onRadiusChange: (radiusKm: number) => void;
}) {
  const radiusMeters = Math.max(0.1, radiusKm) * 1000;
  const [mapKey, setMapKey] = useState<string | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // Generate a fresh key only on the client after mount
    setMapKey(`map-${Date.now()}`);
    
    return () => {
      setMapKey(null);
      // Nuclear cleanup: clear Leaflet's internal tracking ID from the DOM
      if (containerRef.current) {
        (containerRef.current as any)._leaflet_id = null;
      }
    };
  }, []);

  return (
    <div className="geo-map h-full flex flex-col" ref={containerRef}>
      <div className="p-4 border-b bg-muted/5 space-y-4">
        <div className="flex items-center justify-between">
          <span className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Radius Coverage</span>
          <span className="text-xs font-bold text-primary bg-primary/5 px-2 py-0.5 rounded-full border border-primary/10">
            {Math.round(radiusKm)} km
          </span>
        </div>
        <input
          type="range"
          min={1}
          max={30}
          step={1}
          value={Math.round(radiusKm)}
          onChange={(event) => onRadiusChange(Number(event.target.value))}
          className="w-full accent-primary cursor-pointer"
        />
        <p className="text-[9px] text-muted-foreground font-medium italic">
          Tip: Click any point on the map to re-center the discovery radius.
        </p>
      </div>

      <div className="flex-1 relative min-h-[250px] bg-muted/10">
        {mapKey ? (
          <MapContainer
            key={mapKey} // Fresh key on every mount prevents initialization conflicts
            center={[center.lat, center.lng]}
            zoom={12}
            scrollWheelZoom={false}
            style={{ height: "100%", width: "100%" }}
            className="z-0"
          >
            <TileLayer
              attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
              url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            />
            <MapController center={center} />
            <ClickToSetCenter onPick={onCenterChange} />
            <Circle
              center={[center.lat, center.lng]}
              radius={radiusMeters}
              pathOptions={{ color: "hsl(var(--primary))", fillColor: "hsl(var(--primary))", fillOpacity: 0.1 }}
            />
            <CircleMarker
              center={[center.lat, center.lng]}
              radius={6}
              pathOptions={{ color: "white", fillColor: "hsl(var(--primary))", fillOpacity: 1, weight: 2 }}
            />
          </MapContainer>
        ) : (
          <div className="absolute inset-0 flex items-center justify-center text-[10px] font-bold uppercase tracking-widest text-muted-foreground animate-pulse">
            Loading Geo Engine...
          </div>
        )}
      </div>
    </div>
  );
}
