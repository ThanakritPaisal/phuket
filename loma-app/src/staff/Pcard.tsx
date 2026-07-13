import Icon from "../components/Icon";
import {
  LocalBadge,
  OpenStatus,
  ScoreBadge,
  VerifiedBadge,
  bg,
  prov,
  useStaff,
} from "./helpers";

export default function Pcard({ id, order }: { id: string; order?: number | null }) {
  const { saved, toggleSave, openProv, openModal } = useStaff();
  const p = prov(id);
  const isSaved = saved.has(p.id);
  return (
    <div className="pcard">
      <div className="ph" style={bg(p.img)}>
        {!p.img && <div className="ph-emo">{p.emo}</div>}
        <div className="ph-badges">
          {order ? (
            <span className="badge" style={{ background: "var(--primary)", color: "#fff" }}>
              Stop {order}
            </span>
          ) : null}
          <LocalBadge />
          <VerifiedBadge p={p} />
          {p.pick && <span className="badge b-pick">⭐ Staff pick</span>}
        </div>
        <div className="ph-open">
          <OpenStatus open={p.open} />
        </div>
        <button
          className={`pcard-fav ${isSaved ? "on" : ""}`}
          title={isSaved ? "Saved" : "Save to Local Picks"}
          onClick={(e) => {
            e.stopPropagation();
            toggleSave(p.id);
          }}
        >
          <Icon name={isSaved ? "heartFill" : "heart"} size={18} />
        </button>
      </div>
      <div className="body">
        <div className="ttl">
          <div>
            <h3>{p.name}</h3>
            <div className="meta">
              {p.emo} {p.cat} · <b>{p.dist}</b> · {p.price}
            </div>
          </div>
        </div>
        <div className="meta" style={{ marginTop: 8 }}>
          <ScoreBadge label="Quality" v={p.quality} /> <ScoreBadge label="Local" v={p.locality} />{" "}
          <span className="score">
            <span style={{ color: "#E0A93C" }}>★</span> {p.rating}{" "}
            <span style={{ color: "var(--muted)" }}>({p.reviews})</span>
          </span>
        </div>
        <div className="reason">
          <span className="lab">Why this fits:</span> {p.reason}
        </div>
        <div className="row-act">
          <button className="btn btn-line btn-sm" style={{ flex: 1 }} onClick={() => openProv(id)}>
            View
          </button>
          <button
            className="btn btn-primary btn-sm"
            style={{ flex: 1 }}
            onClick={() => openModal({ kind: "share", id })}
          >
            <Icon name="share" size={16} /> Share
          </button>
        </div>
      </div>
    </div>
  );
}
