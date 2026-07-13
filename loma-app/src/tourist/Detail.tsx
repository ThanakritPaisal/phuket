import { byId } from "../data";
import { activePick } from "../activeAccount";
import AiScorePanel, { LomaBadges } from "../components/AiScorePanel";

const DAYS = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];

export default function Detail({
  id,
  onBack,
}: {
  id: string;
  onBack: () => void;
}) {
  const p = byId(id);
  if (!p) return null;
  // AI curation scores are property-independent, so any pick carries them.
  const ai = activePick(id)?.ai;

  return (
    <>
      <div
        className="hero"
        style={p.photo ? { backgroundImage: `url(${p.photo})` } : undefined}
      >
        {!p.photo && <div className="ph-emo">{p.emo}</div>}
        <button className="hero-back back" onClick={onBack}>
          ←
        </button>
      </div>
      <div className="scroll pad" style={{ paddingBottom: 0 }}>
        <div className="ttl" style={{ display: "flex", justifyContent: "space-between", gap: 8 }}>
          <h1 style={{ fontSize: 20 }}>{p.name}</h1>
          {p.rating != null && <span className="badge b-rating">★ {p.rating}</span>}
        </div>
        <div className="meta" style={{ fontSize: 12.5, color: "var(--muted)", marginTop: 4 }}>
          {p.emo} {p.category} · {p.area}
          {p.reviews != null && ` · ${p.reviews} Google reviews`}
        </div>

        <div className="bd" style={{ display: "flex", gap: 5, marginTop: 10, flexWrap: "wrap" }}>
          {ai ? (
            <LomaBadges ai={ai} score />
          ) : (
            <span className="badge b-local">🌿 Local</span>
          )}
          {p.openNow != null && (
            <span className={`badge ${p.openNow ? "b-open" : "b-closed"}`}>
              {p.openNow ? "● Open now" : "Closed now"}
            </span>
          )}
          {p.price && <span className="badge b-price">{p.price}</span>}
        </div>

        {ai && <AiScorePanel ai={ai} />}

        <div className="kv">
          <div>
            <div className="k">Area</div>
            <div className="v">{p.area}</div>
          </div>
          <div>
            <div className="k">Type</div>
            <div className="v">{p.primaryType || p.itemType}</div>
          </div>
          <div>
            <div className="k">Rating</div>
            <div className="v">{p.rating != null ? `★ ${p.rating}` : "—"}</div>
          </div>
          <div>
            <div className="k">Reviews</div>
            <div className="v">{p.reviews ?? "—"}</div>
          </div>
        </div>

        {p.summary && (
          <div className="why">
            <div className="lab">About</div>
            <p>{p.summary}</p>
          </div>
        )}

        {p.hours.length > 0 && (
          <>
            <div className="sec-h">Opening hours</div>
            <div className="hours-list">
              {p.hours.map((h, i) => {
                const [day, ...rest] = h.split(":");
                return (
                  <div key={i}>
                    <span>{DAYS.includes(day.trim()) ? day.trim() : h}</span>
                    <span>{rest.join(":").trim()}</span>
                  </div>
                );
              })}
            </div>
          </>
        )}

        {p.address && (
          <>
            <div className="sec-h">Address</div>
            <p style={{ fontSize: 12.5, color: "var(--ink-2)", marginTop: 6 }}>{p.address}</p>
          </>
        )}
      </div>
      <div className="stick-cta">
        {p.mapsUrl && (
          <a className="btn btn-primary" href={p.mapsUrl} target="_blank" rel="noreferrer">
            Open in Google Maps
          </a>
        )}
        {p.phone && (
          <a className="btn btn-ghost btn-sm" href={`tel:${p.phone}`} style={{ width: "auto" }}>
            Call
          </a>
        )}
      </div>
    </>
  );
}
