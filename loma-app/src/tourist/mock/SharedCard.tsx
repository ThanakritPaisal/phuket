import { useState } from "react";
import Icon from "../../components/Icon";
import RealMap from "../../components/RealMap";
import type { Pick } from "../../picks";
import { attribution, PARTNER } from "./helpers";

export default function SharedCard({
  p,
  onShowRef,
  onFeedback,
}: {
  p: Pick;
  onShowRef: () => void;
  onFeedback: () => void;
}) {
  const [lang, setLang] = useState<"EN" | "ไทย">("EN");

  return (
    <div className="scroll">
      <div
        className="hero"
        style={{ height: 220, backgroundImage: p.img ? `url(${p.img})` : undefined }}
      >
        {!p.img && <div className="ph-emo">{p.emo}</div>}
        <div style={{ position: "absolute", top: 12, right: 12 }}>
          <div className="langtoggle">
            {(["EN", "ไทย"] as const).map((l) => (
              <button key={l} className={lang === l ? "on" : ""} onClick={() => setLang(l)}>
                {l}
              </button>
            ))}
          </div>
        </div>
      </div>
      <div className="pad">
        <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginBottom: 8 }}>
          <span className="badge b-local">🌿 Local</span>
          {p.verified && <span className="badge b-verified">✓ Verified</span>}
          <span className={`badge ${p.open ? "b-open" : "b-closed"}`}>
            {p.open ? "● Open now" : "Closed"}
          </span>
        </div>
        <h2 style={{ fontSize: 21, letterSpacing: "-.3px" }}>{p.name}</h2>
        <div style={{ fontSize: 13, color: "var(--muted)", marginTop: 3 }}>
          {p.emo} {p.cat} · {p.area}, Phuket
        </div>
        {p.reviews > 0 ? (
          <div className="starrow">
            ★★★★★{" "}
            <span style={{ fontSize: 12, color: "var(--muted)" }}>
              {p.rating} · {p.reviews} reviews
            </span>
            <span
              style={{
                fontSize: 10.5,
                fontWeight: 700,
                color: "var(--ink-2)",
                background: "var(--surface-2)",
                border: "1px solid var(--line)",
                borderRadius: 6,
                padding: "1px 6px",
              }}
            >
              on Google ↗
            </span>
          </div>
        ) : (
          <div style={{ marginTop: 6, fontSize: 12, color: "var(--muted)" }}>
            🆕 Newly listed · vetted by LOMA (no Google rating yet)
          </div>
        )}

        <div className="tc-by">
          <div className="h">🏨</div>
          <div>
            <b>{attribution()}</b>
            <br />
            <span style={{ fontSize: 11.5 }}>A place your hosts trust</span>
          </div>
        </div>

        <div className="trust">
          <div className="h">Why you can trust this</div>
          <div className="lines">
            <span style={{ color: "var(--info)", fontWeight: 800 }}>✓</span> Verified by LOMA —
            identity &amp; locality checked
            <br />
            📍 {attribution()}
            <br />
            🌿 {p.local ? "Locally owned" : "Local provider"}
            {p.reviews > 0 && ` · rated ${p.rating}★ on Google`}
          </div>
          <div style={{ fontSize: 11, color: "var(--muted)", marginTop: 7 }}>
            LOMA hand-picks a short, vetted list — not a review free-for-all.
          </div>
        </div>

        <div className="why" style={{ marginTop: 14 }}>
          <div className="lab">
            <Icon name="spark" size={13} /> Why this fits you
          </div>
          <p>{p.reason}</p>
        </div>
        <div className="why" style={{ background: "var(--ok-l)" }}>
          <div className="lab" style={{ color: "var(--ok)" }}>
            🌿 Why this is local
          </div>
          <p>{p.whyLocal}</p>
        </div>

        <div className="mapbox" style={{ height: 150, borderRadius: 12, marginTop: 12, overflow: "hidden" }}>
          <RealMap
            you={{ lat: PARTNER.lat, lng: PARTNER.lng }}
            pins={[{ id: p.id, lat: p.lat, lng: p.lng, emoji: p.emo, selected: true }]}
            interactive={false}
          />
        </div>

        <div className="kv">
          <div>
            <div className="k">From your hotel</div>
            <div className="v">{p.dist}</div>
          </div>
          <div>
            <div className="k">Open</div>
            <div className="v" style={{ fontSize: 12 }}>
              {p.hours}
            </div>
          </div>
          <div>
            <div className="k">Price</div>
            <div className="v">{p.priceText}</div>
          </div>
          <div>
            <div className="k">Languages</div>
            <div className="v" style={{ fontSize: 12 }}>
              {p.lang}
            </div>
          </div>
        </div>

        <div className="tag-row">
          {p.bestFor.map((t) => (
            <span className="tag" key={t}>
              {t}
            </span>
          ))}
        </div>

        <div className="cta2">
          <button className="btn btn-primary">
            <Icon name="nav" size={17} /> Get Directions
          </button>
          <button className="btn btn-ghost">
            <Icon name="phone" size={17} /> Contact
          </button>
        </div>
        <div className="cta2">
          <button className="btn btn-line">
            <Icon name="heart" size={17} /> Save
          </button>
          <button className="btn btn-soft" onClick={onShowRef}>
            <Icon name="qr" size={17} /> Show Referral Code
          </button>
        </div>

        <div style={{ marginTop: 16, borderTop: "1px solid var(--line)", paddingTop: 14 }}>
          <strong style={{ fontSize: 14 }}>Did you visit?</strong>
          <div style={{ fontSize: 12.5, color: "var(--muted)", margin: "3px 0 9px" }}>
            Help LOMA support good local businesses.
          </div>
          <div style={{ display: "flex", gap: 9 }}>
            <button className="btn btn-ghost" onClick={onFeedback}>
              Yes, I went 👍
            </button>
            <button className="btn btn-line">Not yet</button>
          </div>
        </div>
        <div style={{ height: 14 }} />
      </div>
    </div>
  );
}
