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

export default function StaffDetail() {
  const { curProv, saved, toggleSave, go, openModal } = useStaff();
  const p = prov(curProv);
  const isSaved = saved.has(p.id);
  return (
    <div className="scroll">
      <div className="hero" style={bg(p.img)}>
        {!p.img && <div className="ph-emo">{p.emo}</div>}
        <div className="back" onClick={() => go("results")} style={{ cursor: "pointer" }}>
          <Icon name="back" size={17} />
        </div>
        <div className={`save ${isSaved ? "on" : ""}`} onClick={() => toggleSave(p.id)}>
          <Icon name={isSaved ? "heartFill" : "heart"} size={18} />
        </div>
      </div>
      <div className="pad" style={{ paddingBottom: 0 }}>
        <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginBottom: 8 }}>
          <LocalBadge />
          <VerifiedBadge p={p} />
          <OpenStatus open={p.open} />
          {p.pick && <span className="badge b-pick">⭐ Staff pick</span>}
        </div>
        <h2 style={{ fontSize: 20, letterSpacing: "-.3px" }}>{p.name}</h2>
        <div style={{ fontSize: 13, color: "var(--muted)", marginTop: 3 }}>
          {p.emo} {p.cat} · {p.area}
        </div>

        <div className="review">
          <div className="big">{p.rating}</div>
          <div>
            <div className="starrow">★★★★★</div>
            <div style={{ fontSize: 12, color: "var(--muted)" }}>
              {p.reviews} Google reviews · {p.sum}
            </div>
          </div>
        </div>

        <div className="kv">
          <div>
            <div className="k">Distance</div>
            <div className="v">{p.dist}</div>
          </div>
          <div>
            <div className="k">Price</div>
            <div className="v">{p.priceText}</div>
          </div>
          <div>
            <div className="k">Hours</div>
            <div className="v">{p.hours}</div>
          </div>
          <div>
            <div className="k">Booking</div>
            <div className="v" style={{ fontSize: 12 }}>
              {p.booking}
            </div>
          </div>
          <div>
            <div className="k">Languages</div>
            <div className="v" style={{ fontSize: 12 }}>
              {p.lang}
            </div>
          </div>
          <div>
            <div className="k">Contact</div>
            <div className="v" style={{ fontSize: 12 }}>
              {p.contact}
            </div>
          </div>
        </div>

        <div style={{ marginTop: 12 }}>
          <div
            className="k"
            style={{ fontSize: 10.5, color: "var(--muted)", fontWeight: 600, textTransform: "uppercase", letterSpacing: ".3px" }}
          >
            Provider scores
          </div>
          <div style={{ display: "flex", gap: 14, marginTop: 8, flexWrap: "wrap" }}>
            <ScoreBadge label="Quality" v={p.quality} />
            <ScoreBadge label="Locality" v={p.locality} />
            <ScoreBadge label="Readiness" v={p.readiness} />
            <ScoreBadge label="Safety" v={p.safety} />
          </div>
        </div>

        <div className="h-sec">Best for</div>
        <div className="tag-row">
          {p.bestFor.map((t) => (
            <span className="tag" key={t}>
              {t}
            </span>
          ))}
        </div>

        <div className="why">
          <div className="lab">
            <Icon name="spark" size={12} /> Why recommend this?
          </div>
          <p>{p.reason}</p>
        </div>
        <div className="why" style={{ background: "var(--ok-l)" }}>
          <div className="lab" style={{ color: "var(--ok)" }}>
            🌿 Why is this local?
          </div>
          <p>{p.whyLocal}</p>
        </div>
        <div className="note-box">
          <div className="lab">⚠ Things to note</div>
          {p.note}
        </div>

        <div style={{ height: 90 }} />
      </div>
      <div className="stick-cta">
        <button className={`btn btn-ghost ${isSaved ? "saved" : ""}`} onClick={() => toggleSave(p.id)}>
          <Icon name={isSaved ? "heartFill" : "heart"} size={16} /> {isSaved ? "Saved" : "Save"}
        </button>
        <button className="btn btn-primary" onClick={() => openModal({ kind: "share", id: p.id })}>
          <Icon name="share" size={16} /> Share Recommendation
        </button>
      </div>
    </div>
  );
}
