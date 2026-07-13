import type { Provider } from "../types";
import { activePick } from "../activeAccount";
import "./ai.css";

export default function ProviderCard({
  p,
  onOpen,
}: {
  p: Provider;
  onOpen: (id: string) => void;
}) {
  const ai = activePick(p.id)?.ai;
  return (
    <div className="pcard" onClick={() => onOpen(p.id)}>
      <div
        className="ph"
        style={p.photo ? { backgroundImage: `url(${p.photo})` } : undefined}
      >
        {!p.photo && <div className="ph-emo">{p.emo}</div>}
        <div className="ph-badges">
          {ai?.is_hidden_gem && <span className="badge b-gem">💎 Hidden Gem</span>}
          {ai?.is_verified ? (
            <span className="badge b-verified">✓ Verified Local</span>
          ) : (
            <span className="badge b-local">🌿 Local</span>
          )}
        </div>
        {p.openNow != null && (
          <div className="ph-open">
            <span className={`badge ${p.openNow ? "b-open" : "b-closed"}`}>
              {p.openNow ? "● Open now" : "Closed"}
            </span>
          </div>
        )}
      </div>
      <div className="body">
        <div className="ttl">
          <h3>{p.name}</h3>
          {p.rating != null && (
            <span className="badge b-rating">★ {p.rating}</span>
          )}
        </div>
        <div className="meta">
          <span>
            {p.emo} {p.category}
          </span>
          <span>· {p.area}</span>
          {p.reviews != null && <span>· {p.reviews} reviews</span>}
        </div>
        <div className="bd">
          {p.price && <span className="badge b-price">{p.price}</span>}
          {p.primaryType && <span className="badge b-price">{p.primaryType}</span>}
        </div>
      </div>
    </div>
  );
}
