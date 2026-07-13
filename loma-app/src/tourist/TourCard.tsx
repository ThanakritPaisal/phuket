import type { Pick } from "../picks";
import { byId } from "../data";
import { LomaBadges } from "../components/AiScorePanel";
import Icon from "../components/Icon";
import { trackEvent } from "../impact";

// A staff-selected provider pick on the Recommended landing: LOMA badges, a
// plain-English "Why we picked this", and the two primary tourist actions.
export default function TourCard({
  p,
  onOpen,
}: {
  p: Pick;
  onOpen: (id: string) => void;
}) {
  const prov = byId(p.id);
  const mapsUrl =
    prov?.mapsUrl ||
    `https://www.google.com/maps/dir/?api=1&destination=${p.lat},${p.lng}`;
  const phone = prov?.phone;

  return (
    <div className="pcard" style={{ marginBottom: 12 }}>
      <div
        className="ph"
        style={p.img ? { backgroundImage: `url(${p.img})` } : undefined}
        onClick={() => onOpen(p.id)}
      >
        {!p.img && <div className="ph-emo">{p.emo}</div>}
        <div className="ph-badges">
          <LomaBadges ai={p.ai} />
        </div>
      </div>
      <div className="body">
        <div className="ttl">
          <h3 onClick={() => onOpen(p.id)}>{p.name}</h3>
          {p.rating > 0 && <span className="badge b-rating">★ {p.rating}</span>}
        </div>
        <div className="meta">
          {p.emo} {p.cat} · {p.dist} · {p.priceText}
        </div>

        <div className="aibox">
          <div className="lab">
            <Icon name="spark" size={12} /> Why we picked this
          </div>
          <p>{p.reason}</p>
        </div>

        <div className="cta2">
          <a
            className="btn btn-primary btn-sm"
            href={mapsUrl}
            target="_blank"
            rel="noreferrer"
            onClick={() => trackEvent("direction_clicked", { provider_id: p.id })}
          >
            <Icon name="nav" size={16} /> Get Directions
          </a>
          {phone ? (
            <a
              className="btn btn-line btn-sm"
              href={`tel:${phone}`}
              onClick={() => trackEvent("contact_clicked", { provider_id: p.id })}
            >
              <Icon name="phone" size={16} /> Contact
            </a>
          ) : (
            <button
              className="btn btn-line btn-sm"
              onClick={() => trackEvent("contact_clicked", { provider_id: p.id })}
            >
              <Icon name="phone" size={16} /> Contact
            </button>
          )}
        </div>
        <button className="btn btn-soft btn-sm t-viewdetails" onClick={() => onOpen(p.id)}>
          View details ›
        </button>
      </div>
    </div>
  );
}
