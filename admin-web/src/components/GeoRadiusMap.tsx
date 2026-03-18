import React from "react";
import type { LeafletMouseEvent } from "leaflet";
import { MapContainer, TileLayer, Circle, CircleMarker, useMapEvents } from "react-leaflet";

type LatLng = { lat: number; lng: number };

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

  return (
    <div className="geo-map">
      <div className="geo-map__controls">
        <label className="geo-field">
          <span>Radius (km)</span>
          <input
            type="range"
            min={1}
            max={30}
            step={1}
            value={Math.round(radiusKm)}
            onChange={(event) => onRadiusChange(Number(event.target.value))}
          />
          <strong>{Math.round(radiusKm)} km</strong>
        </label>
        <div className="geo-hint">
          Tip: click on the map to set the center point.
        </div>
      </div>

      <div className="geo-map__canvas">
        <MapContainer
          center={[center.lat, center.lng]}
          zoom={12}
          scrollWheelZoom={false}
          style={{ height: 320, width: "100%" }}
        >
          <TileLayer
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          />
          <ClickToSetCenter onPick={onCenterChange} />
          <Circle
            center={[center.lat, center.lng]}
            radius={radiusMeters}
            pathOptions={{ color: "#2e61d3", fillColor: "#2e61d3", fillOpacity: 0.12 }}
          />
          <CircleMarker
            center={[center.lat, center.lng]}
            radius={6}
            pathOptions={{ color: "#1a2234", fillColor: "#2e61d3", fillOpacity: 1 }}
          />
        </MapContainer>
      </div>
    </div>
  );
}
