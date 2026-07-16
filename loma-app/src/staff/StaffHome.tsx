import Icon from "../components/Icon";
import { activePicks } from "../activeAccount";
import { impactCredits, hotelTier } from "../impact";
import { useVersion } from "../store";
import {
  INTENTS,
  LocalBadge,
  PROPERTY_RADIUS_KM,
  Screen,
  bg,
  intentLabel,
  prov,
  tambonsWithCounts,
  useStaff,
} from "./helpers";
import "./impact.css";

function MiniRow({ id }: { id: string }) {
  const { openProv } = useStaff();
  const p = prov(id);
  return (
    <div className="prow" onClick={() => openProv(id)}>
      <div className="thumb" style={bg(p.img)} />
      <div className="info">
        <h3>{p.name}</h3>
        <div className="m">
          {p.cat} · {p.dist}
        </div>
        <div className="bd">
          <LocalBadge />
          {p.pick && <span className="badge b-pick">⭐ Staff pick</span>}
        </div>
      </div>
    </div>
  );
}

export default function StaffHome() {
  useVersion();
  const { filter, partner, setFilter, applyIntent, go, openProv } = useStaff();
  const f = filter;
  const cr = impactCredits();
  const tier = hotelTier(cr);
  // Real nearest picks for the signed-in property: the first two read as "recently
  // shared", the next two as today's suggestions.
  // "Somewhere else" chips + the count inside the property radius, both from real data.
  const tambons = tambonsWithCounts();
  const nearbyCount = activePicks().filter((p) => p.km <= PROPERTY_RADIUS_KM).length;
  const nearest = activePicks().slice(0, 4).map((p) => p.id);
  const recent = nearest.slice(0, 2);
  const housePicks = nearest.slice(2, 4);
  const places: [string, string, string][] = [
    ["property", "🏨", "Around this property"],
    ["elsewhere", "📍", "Somewhere else"],
  ];
  const times: [string, string][] = [
    ["now", "🟢 Open now"],
    ["any", "Anytime"],
  ];

  return (
    <Screen active="home">
      <button
        className="btn btn-primary"
        style={{ marginBottom: 10 }}
        onClick={() => go("recommend")}
      >
        <Icon name="spark" size={16} /> Create Assisted Recommendation
      </button>
      <div style={{ display: "flex", gap: 9, marginBottom: 10 }}>
        <button
          onClick={() => go("saved")}
          style={{
            flex: 1,
            textAlign: "left",
            background: "var(--surface)",
            border: "1px solid var(--line)",
            borderRadius: 13,
            padding: "11px 12px",
          }}
        >
          <div
            style={{
              fontSize: 11,
              fontWeight: 800,
              letterSpacing: 0.4,
              textTransform: "uppercase",
              color: "var(--muted)",
            }}
          >
            Hotel Local Picks QR
          </div>
          <div style={{ fontSize: 12.5, color: "var(--ink-2)", marginTop: 3, lineHeight: 1.4 }}>
            Permanent passive QR for the desk &amp; rooms →
          </div>
        </button>
        <button
          onClick={() => go("impact")}
          style={{
            flex: 1,
            textAlign: "left",
            background: "var(--primary-l)",
            border: "1px solid #D6E0EE",
            borderRadius: 13,
            padding: "11px 12px",
          }}
        >
          <div
            style={{
              fontSize: 11,
              fontWeight: 800,
              letterSpacing: 0.4,
              textTransform: "uppercase",
              color: "var(--primary)",
            }}
          >
            Impact Credits
          </div>
          <div style={{ fontFamily: "var(--fd)", fontSize: 22, lineHeight: 1.15, color: "var(--ink)", marginTop: 1 }}>
            {cr}{" "}
            <span style={{ fontSize: 11.5, fontFamily: "var(--f)", color: "var(--muted)", fontWeight: 600 }}>
              · {tier[0]}
            </span>
          </div>
        </button>
      </div>
      <div className="modehint" style={{ marginBottom: 14 }}>
        <span>
          Passive QR helps tourists browse. Assisted recommendation helps tourists decide.
        </span>
      </div>

      <div className="search">
        <Icon name="search" size={18} />
        <span>What is the tourist looking for?</span>
      </div>

      <button
        className="btn btn-primary"
        style={{ marginTop: 12, justifyContent: "space-between" }}
        onClick={() => go("match")}
      >
        <span><Icon name="spark" size={16} /> Match by guest need</span>
        <span style={{ fontWeight: 500, fontSize: 12, opacity: 0.85 }}>accessibility · time · budget →</span>
      </button>

      <div className="h-sec">
        Quick intent{" "}
        <span style={{ fontWeight: 500, textTransform: "none", letterSpacing: 0, color: "var(--muted)" }}>
          · pick one, then Find Local Picks
        </span>
      </div>
      <div className="chips">
        {INTENTS.map((c) => (
          <button
            key={c}
            className={`chip cat ${intentLabel(c) === f.intent ? "on" : ""}`}
            onClick={() => applyIntent(c)}
          >
            {c}
          </button>
        ))}
      </div>

      <div className="h-sec">
        Where?{" "}
        <span style={{ fontWeight: 500, textTransform: "none", letterSpacing: 0, color: "var(--muted)" }}>
          · near the hotel, or another area
        </span>
      </div>
      <div className="segmented">
        {places.map(([k, e, l]) => (
          <button
            key={k}
            className={f.place === k ? "on" : ""}
            onClick={() =>
              setFilter(
                k === "property"
                  ? { place: "property", mode: "standard", sort: "nearest", destArea: null }
                  : { place: "elsewhere", mode: "standard", sort: "match" }
              )
            }
          >
            <span className="em">{e}</span>
            {l}
          </button>
        ))}
      </div>
      {f.place === "elsewhere" ? (
        <>
          <div style={{ fontSize: 11, color: "var(--muted)", margin: "8px 0 6px" }}>
            Where is the tourist, or where are they heading? · pick a subdistrict
          </div>
          <div className="chips">
            {tambons.map(({ tambon, count }) => (
              <button
                key={tambon}
                className={`chip ${f.destArea === tambon ? "on" : ""}`}
                onClick={() =>
                  setFilter({ place: "elsewhere", destArea: f.destArea === tambon ? null : tambon })
                }
              >
                📍 {tambon} · {count}
              </button>
            ))}
          </div>
        </>
      ) : (
        <div style={{ fontSize: 11, color: "var(--muted)", marginTop: 6 }}>
          Within {PROPERTY_RADIUS_KM} km of {partner.name} ({nearbyCount} places). Pick “Somewhere
          else” if the tourist is out, or heading elsewhere.
        </div>
      )}

      <div className="h-sec">
        When?{" "}
        <span style={{ fontWeight: 500, textTransform: "none", letterSpacing: 0, color: "var(--muted)" }}>
          · controls the open-now filter
        </span>
      </div>
      <div className="chips">
        {times.map(([k, l]) => (
          <button
            key={k}
            className={`chip ${f.time === k ? "on" : ""}`}
            onClick={() => setFilter({ time: k as "now" | "any", openNow: k === "now" })}
          >
            {l}
          </button>
        ))}
      </div>
      <div style={{ fontSize: 11, color: "var(--muted)", marginTop: 6 }}>
        Open now = only places open right now. Anytime = show all.
      </div>

      <div style={{ marginTop: 16 }}>
        <button
          className="btn btn-primary"
          onClick={() => {
            setFilter({ mode: "standard" });
            go("results");
          }}
        >
          <Icon name="spark" size={16} /> Find Local Picks
        </button>
      </div>

      <div className="h-sec">
        Plan a guided trip{" "}
        <span style={{ fontWeight: 500, textTransform: "none", letterSpacing: 0, color: "var(--muted)" }}>
          · opens a planner, not instant results
        </span>
      </div>
      <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
        <button className="btn btn-line" style={{ justifyContent: "space-between" }} onClick={() => go("route")}>
          🛣 Along a route
          <span style={{ color: "var(--primary)", fontWeight: 700 }}>Set up →</span>
        </button>
        <button
          className="btn btn-line"
          style={{ justifyContent: "space-between" }}
          onClick={() => go("halfday")}
        >
          🗺 Half-day experience
          <span style={{ color: "var(--primary)", fontWeight: 700 }}>Set up →</span>
        </button>
      </div>

      <div className="h-sec">Recent recommendations</div>
      {recent.map((id, i) => {
        const p = prov(id);
        return (
          <div className="prow" key={id} onClick={() => openProv(id)}>
            <div className="thumb" style={bg(p.img)} />
            <div className="info">
              <h3>{p.name}</h3>
              <div className="m">
                {i === 0 ? "Shared 2h ago · opened by tourist ✓" : "Shared yesterday · visit confirmed ✓"}
              </div>
              <div className="bd">
                <LocalBadge />
                {p.verified ? (
                  <span className="badge b-verified">
                    <Icon name="verified" size={12} /> Verified
                  </span>
                ) : (
                  <span className="badge b-pick">⭐ Staff pick</span>
                )}
              </div>
            </div>
          </div>
        );
      })}

      <div className="h-sec">Today's recommended local picks</div>
      {housePicks.map((id) => (
        <MiniRow key={id} id={id} />
      ))}
    </Screen>
  );
}
