import { useEffect, useMemo } from "react";
import { MapContainer, TileLayer, Marker, useMap } from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import "./map.css";
import type { LatLng } from "../geo";

export interface MapPin extends LatLng {
  id: string;
  emoji?: string;
  label?: string;
  selected?: boolean;
  onClick?: () => void;
}

export interface MapBubble extends LatLng {
  id: string;
  size: number; // px diameter
  value: number;
}

function pinIcon(p: MapPin): L.DivIcon {
  const lab = p.label ? `<div class="lab">${p.label}</div>` : "";
  return L.divIcon({
    className: `lpin ${p.selected ? "sel" : ""}`,
    html: `${lab}<div class="p"><span>${p.emoji ?? "📍"}</span></div>`,
    iconSize: [30, 30],
    iconAnchor: [15, 30], // tip of the teardrop
  });
}

const youIcon = L.divIcon({
  className: "lyou",
  html: '<div class="core"></div>',
  iconSize: [14, 14],
  iconAnchor: [7, 7],
});

function bubbleIcon(b: MapBubble): L.DivIcon {
  return L.divIcon({
    className: "",
    html: `<div class="lbubble" style="width:${b.size}px;height:${b.size}px">${b.value}</div>`,
    iconSize: [b.size, b.size],
    iconAnchor: [b.size / 2, b.size / 2],
  });
}

/** Fit the viewport to everything we're showing. */
function FitBounds({ points, enabled }: { points: LatLng[]; enabled: boolean }) {
  const map = useMap();
  useEffect(() => {
    if (!enabled || points.length === 0) return;
    if (points.length === 1) {
      map.setView([points[0].lat, points[0].lng], 14);
      return;
    }
    map.fitBounds(
      L.latLngBounds(points.map((p) => [p.lat, p.lng] as [number, number])),
      { padding: [34, 34], maxZoom: 15 }
    );
  }, [map, points, enabled]);
  return null;
}

export default function RealMap({
  pins = [],
  bubbles = [],
  you,
  center,
  zoom = 11,
  fit = true,
  interactive = true,
}: {
  pins?: MapPin[];
  bubbles?: MapBubble[];
  you?: LatLng;
  center?: LatLng;
  zoom?: number;
  fit?: boolean;
  interactive?: boolean;
}) {
  const points = useMemo(
    () => [...pins, ...bubbles, ...(you ? [you] : [])] as LatLng[],
    [pins, bubbles, you]
  );
  const c = center ?? you ?? points[0] ?? { lat: 7.95, lng: 98.34 };

  return (
    <div className="realmap">
      <MapContainer
        center={[c.lat, c.lng]}
        zoom={zoom}
        scrollWheelZoom={false}
        dragging={interactive}
        zoomControl={interactive}
        doubleClickZoom={interactive}
        attributionControl
      >
        <TileLayer
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
          maxZoom={19}
        />
        <FitBounds points={points} enabled={fit} />

        {bubbles.map((b) => (
          <Marker key={b.id} position={[b.lat, b.lng]} icon={bubbleIcon(b)} />
        ))}

        {pins.map((p) => (
          <Marker
            key={p.id}
            position={[p.lat, p.lng]}
            icon={pinIcon(p)}
            eventHandlers={p.onClick ? { click: p.onClick } : undefined}
            zIndexOffset={p.selected ? 500 : 0}
          />
        ))}

        {you && <Marker position={[you.lat, you.lng]} icon={youIcon} zIndexOffset={400} />}
      </MapContainer>
    </div>
  );
}
