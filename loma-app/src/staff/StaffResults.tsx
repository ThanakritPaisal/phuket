import Icon from "../components/Icon";
import Pcard from "./Pcard";
import RealMap, { type MapPin } from "../components/RealMap";
import type { Pick } from "../picks";
import {
  StaffAppbar,
  StaffTabbar,
  catEmo,
  filterCatalog,
  intentLabel,
  placeLabel,
  routeStops,
  useStaff,
} from "./helpers";

export default function StaffResults() {
  const {
    filter: f,
    partner,
    routeDest,
    routeCats,
    hd,
    curProv,
    setFilter,
    go,
    openProv,
    openModal,
    setPlanKind,
  } = useStaff();

  let list, title, sub;
  const route = f.mode === "route";
  if (route) {
    list = routeStops(f, routeCats);
    title = "Stops toward " + routeDest;
    sub = routeCats.map(catEmo).join(" ") + " " + routeCats.length + " categories";
  } else if (f.mode === "halfday") {
    list = filterCatalog(f, {
      halfday: true,
      cat: null,
      cats: null,
      family: false,
      rainy: false,
      openNow: false,
      budget: hd.budget,
    });
    title = "Half-day local experiences";
    sub = (hd.budget === "low" ? "Low budget" : "Low–medium budget") + " · " + hd.group;
  } else {
    list = filterCatalog(f);
    title = (f.cat || intentLabel(f.intent)) + " picks";
    sub = (f.openNow ? "Open now · " : "") + placeLabel(f, partner);
  }
  const top = list.slice(0, 10);
  const sorts: [string, string][] = [
    ["match", "Best Match"],
    ["nearest", "Nearest"],
    ["local", "Most Local"],
    ["readiness", "Readiness"],
    ["pick", "⭐ Staff pick"],
  ];
  const setShare = route || f.mode === "halfday";

  return (
    <div className="scroll">
      <StaffAppbar />
      <div className="mapbox">
        <div className="maptag">
          <Icon name="pin" size={15} /> {title} · {top.length} of {list.length}
        </div>
        <RealMap
          you={{ lat: partner.lat, lng: partner.lng }}
          pins={top.slice(0, 7).map((o, i): MapPin => {
            const p = o as Pick;
            const sel = o.id === curProv;
            return {
              id: o.id,
              lat: p.lat,
              lng: p.lng,
              emoji: route ? String(i + 1) : o.emo,
              label: sel || route ? `${route ? `${i + 1} · ` : ""}${o.emo} ${o.price}` : undefined,
              selected: sel,
              onClick: () => openProv(o.id),
            };
          })}
        />
      </div>
      <div className="pad" style={{ paddingTop: 12 }}>
        <div
          style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 2 }}
        >
          <strong style={{ fontSize: 14 }}>
            {list.length} local pick{list.length === 1 ? "" : "s"}
          </strong>
          <button
            className="btn-sm"
            style={{ fontSize: 12, color: "var(--primary)", fontWeight: 700 }}
            onClick={() => go(route ? "route" : f.mode === "halfday" ? "halfday" : "home")}
          >
            ↩ Change
          </button>
        </div>
        <div style={{ fontSize: 12, color: "var(--muted)", marginBottom: 8 }}>{sub}</div>
        {setShare && top.length ? (
          <div style={{ marginBottom: 12 }}>
            <button
              className="btn btn-primary"
              onClick={() => {
                setPlanKind(f.mode === "halfday" ? "halfday" : "route");
                openModal({ kind: "shareset" });
              }}
            >
              <Icon name="share" size={16} /> Share {route ? "route" : "plan"} ({Math.min(top.length, 4)}{" "}
              stops) to tourist
            </button>
          </div>
        ) : null}
        <div className="chips" style={{ margin: "4px 0 6px" }}>
          {sorts.map(([k, l]) => (
            <button
              key={k}
              className={`chip ${f.sort === k ? "on" : ""}`}
              onClick={() => setFilter({ sort: k })}
            >
              {l}
            </button>
          ))}
        </div>
        <div style={{ fontSize: 11, color: "var(--muted)", marginBottom: 8 }}>
          Ranked by locality, quality &amp; readiness — never by recommendation volume or payment.
        </div>
        <div className="chips" style={{ marginBottom: 14 }}>
          <button className={`chip ${f.openNow ? "on" : ""}`} onClick={() => setFilter({ openNow: !f.openNow })}>
            Open now 🟢
          </button>
          <button
            className={`chip ${f.maxMin ? "on" : ""}`}
            onClick={() => setFilter({ maxMin: f.maxMin ? null : 15 })}
          >
            ≤ 15 min
          </button>
          <button
            className={`chip ${f.budget === "low-med" ? "on" : ""}`}
            onClick={() => setFilter({ budget: f.budget === "low-med" ? null : "low-med" })}
          >
            ฿–฿฿
          </button>
          <button className={`chip ${f.family ? "on" : ""}`} onClick={() => setFilter({ family: !f.family })}>
            Family
          </button>
        </div>
        {top.length ? (
          top.map((o, i) => <Pcard key={o.id} id={o.id} order={route ? i + 1 : null} />)
        ) : (
          <div style={{ textAlign: "center", padding: "40px 18px", color: "var(--muted)" }}>
            <div style={{ fontSize: 34 }}>🔍</div>
            <div style={{ fontWeight: 700, color: "var(--ink)", marginTop: 8 }}>No matches</div>
            <div style={{ fontSize: 13, marginTop: 5 }}>
              Try removing a filter or widening the travel time.
            </div>
          </div>
        )}
      </div>
      <StaffTabbar active="results" />
    </div>
  );
}
