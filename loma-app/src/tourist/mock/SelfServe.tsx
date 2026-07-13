import { useState } from "react";
import type { CatalogProvider } from "../../types";
import Icon from "../../components/Icon";
import { activePicks } from "../../activeAccount";
import { attribution, PARTNER } from "./helpers";

// Categories that actually exist in the real enriched catalog.
const CATS: [string, string][] = [
  ["Local Food", "🍜"],
  ["Community Experience", "🛶"],
  ["Souvenir & Local Product", "🎁"],
  ["Massage & Wellness", "💆"],
  ["Boat / Sea", "⛵"],
];

function Row({
  o,
  tag,
  onOpen,
}: {
  o: CatalogProvider;
  tag?: string;
  onOpen: (id: string) => void;
}) {
  return (
    <div
      className="prow"
      onClick={() => onOpen(o.id)}
      style={{
        display: "flex",
        gap: 11,
        padding: 11,
        border: "1px solid var(--line)",
        borderRadius: 12,
        background: "var(--surface)",
        marginBottom: 9,
        cursor: "pointer",
        alignItems: "center",
      }}
    >
      <div
        className="thumb"
        style={{
          width: 62,
          height: 62,
          borderRadius: 10,
          backgroundSize: "cover",
          backgroundPosition: "center",
          backgroundImage: o.img ? `url(${o.img})` : undefined,
          backgroundColor: "#dfe7e4",
          flex: "none",
        }}
      />
      <div style={{ flex: 1, minWidth: 0 }}>
        <h3 style={{ fontSize: 14 }}>{o.name}</h3>
        <div style={{ fontSize: 11.5, color: "var(--muted)", marginTop: 2 }}>
          {o.emo} {o.cat} · {o.dist} · {o.price}
        </div>
        <div style={{ display: "flex", gap: 4, marginTop: 6, flexWrap: "wrap" }}>
          {tag === "house" && <span className="badge b-pick">⭐ House pick</span>}
          <span className="badge b-local">🌿 Local</span>
          <span className="badge b-verified">✓ Verified</span>
        </div>
      </div>
      <div style={{ color: "var(--primary)", fontWeight: 700, fontSize: 12 }}>View ›</div>
    </div>
  );
}

export default function SelfServe({ onOpen }: { onOpen: (id: string) => void }) {
  const [cat, setCat] = useState<string>("");

  // Real providers, ranked by real distance from this property.
  const all = activePicks();
  const houseSet = new Set(PARTNER.housePicks || []);
  const houseAll = all.filter((o) => houseSet.has(o.id) && o.open);
  const house = houseAll.filter((o) => !cat || o.cat === cat);
  const houseIds = new Set(house.map((o) => o.id));
  const auto = all
    .filter((o) => o.open && !houseIds.has(o.id) && (!cat || o.cat === cat))
    .slice(0, Math.max(0, 8 - house.length));

  return (
    <div className="scroll">
      <div
        className="hero"
        style={{
          height: 124,
          display: "grid",
          placeItems: "center",
          background: "linear-gradient(135deg,var(--primary),#19a89c)",
        }}
      >
        <div style={{ textAlign: "center", color: "#fff" }}>
          <div style={{ fontSize: 11, opacity: 0.85, letterSpacing: ".6px" }}>
            LOCAL PICKS · SELF-SERVE
          </div>
          <div style={{ fontSize: 18, fontWeight: 800, marginTop: 3 }}>
            Welcome to {PARTNER.name}
          </div>
          <div style={{ fontSize: 11, opacity: 0.85, marginTop: 2 }}>
            You scanned our QR — explore on your own, no app, no login
          </div>
        </div>
      </div>
      <div className="pad">
        <div className="tc-by">
          <div className="h">🏨</div>
          <div>
            <b>{attribution()}</b>
            <br />
            <span style={{ fontSize: 11.5 }}>
              {house.length ? "Starting with our house favourites" : "Verified local places near you"}
            </span>
          </div>
        </div>

        <div className="h-sec">What are you in the mood for?</div>
        <div className="chips">
          <button className={`chip ${!cat ? "on" : ""}`} onClick={() => setCat("")}>
            All
          </button>
          {CATS.map(([c, e]) => (
            <button key={c} className={`chip ${cat === c ? "on" : ""}`} onClick={() => setCat(c)}>
              {e} {c.split(" ")[0]}
            </button>
          ))}
        </div>

        {house.length > 0 && (
          <>
            <div className="h-sec">⭐ {PARTNER.name}'s house picks</div>
            {house.map((o) => (
              <Row key={o.id} o={o} tag="house" onOpen={onOpen} />
            ))}
          </>
        )}
        {auto.length > 0 && (
          <>
            <div className="h-sec">
              {house.length ? "More verified places · open now" : `${auto.length} verified picks · open now`}
            </div>
            {auto.map((o) => (
              <Row key={o.id} o={o} onOpen={onOpen} />
            ))}
          </>
        )}
        {house.length === 0 && auto.length === 0 && (
          <div style={{ textAlign: "center", color: "var(--muted)", padding: 28 }}>
            <div style={{ fontSize: 30 }}>🔍</div>
            <div style={{ marginTop: 8, fontSize: 13 }}>No open picks in this category right now.</div>
          </div>
        )}
        <div
          style={{
            fontSize: 11.5,
            color: "var(--muted)",
            background: "var(--surface-2)",
            borderRadius: 9,
            padding: "9px 11px",
            marginTop: 12,
            textAlign: "center",
          }}
        >
          House favourites first, then other verified open places nearby. Every visit is credited to{" "}
          {PARTNER.name}.
        </div>
        <div style={{ display: "flex", gap: 6, marginTop: 10, alignItems: "center", justifyContent: "center", color: "var(--muted)", fontSize: 11 }}>
          <Icon name="spark" size={12} /> Powered by LOMA
        </div>
      </div>
    </div>
  );
}
