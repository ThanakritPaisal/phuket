// Real Phuket map (Leaflet + OpenStreetMap) with recommendation-density bubbles
// placed at each area's true centroid.
import RealMap, { type MapBubble } from "../components/RealMap";
import { AREA_CENTROIDS } from "../geo";
import { areaBubbles, recsByArea } from "./helpers";

export default function PhuketMap() {
  const bubbles = areaBubbles();
  const sorted = recsByArea();
  const hot = sorted.slice(0, 2).map((x) => x[0]).join(" & ");
  const cold = sorted.length ? sorted[sorted.length - 1][0] : "—";

  const mapBubbles: MapBubble[] = bubbles
    .map((b): MapBubble | null => {
      const c = AREA_CENTROIDS[b.area];
      if (!c) return null;
      // scale down: raw sizes (up to 90px) overlap heavily at island zoom
      return { id: b.area, lat: c.lat, lng: c.lng, size: Math.round(b.sz * 0.62), value: b.v };
    })
    .filter((b): b is MapBubble => b !== null);

  return (
    <div className="mapbox lg">
      <RealMap bubbles={mapBubbles} zoom={10} />
      <div className="maptag">
        🟢 Hotspot: {hot} · cooler: {cold}
      </div>
    </div>
  );
}
