import { GUEST_REVIEWS } from "../mock";
import type { GuestReview } from "../types";
import { Screen, bg, prov } from "./helpers";

function revKw(cat: string): string {
  return /Food|Kitchen/.test(cat)
    ? "thai,food"
    : /Massage|Wellness/.test(cat)
    ? "spa,massage"
    : /Souvenir|Craft/.test(cat)
    ? "handicraft,thai"
    : /Café|Dessert/.test(cat)
    ? "coffee,dessert"
    : "phuket,thailand";
}

function ReviewCard({ r }: { r: GuestReview }) {
  const p = prov(r.prov);
  const kw = revKw(p.cat);
  return (
    <div
      style={{
        border: "1px solid var(--line)",
        borderRadius: 14,
        padding: 13,
        marginBottom: 11,
        background: "var(--surface)",
        boxShadow: "var(--shadow)",
      }}
    >
      <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
        <div style={{ width: 46, height: 46, borderRadius: 10, flex: "none", backgroundSize: "cover", backgroundPosition: "center", ...bg(p.img) }} />
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontWeight: 700, fontSize: 14 }}>{p.name}</div>
          <div style={{ fontSize: 11.5, color: "var(--muted)" }}>
            {p.emo} {p.cat}
          </div>
        </div>
        <div style={{ fontSize: 11, color: "var(--muted)" }}>{r.when}</div>
      </div>
      <div className="starrow" style={{ fontSize: 16, marginTop: 9 }}>
        {"★".repeat(r.stars)}
        <span style={{ color: "var(--line)" }}>{"★".repeat(5 - r.stars)}</span>
      </div>
      {r.tags.length > 0 && (
        <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginTop: 7 }}>
          {r.tags.map((t) => (
            <span className="tag" key={t}>
              {t}
            </span>
          ))}
        </div>
      )}
      {r.comment && (
        <div style={{ fontSize: 13, color: "var(--ink-2)", marginTop: 9, lineHeight: 1.5 }}>“{r.comment}”</div>
      )}
      {r.photos > 0 && (
        <div style={{ display: "flex", gap: 7, marginTop: 9 }}>
          {Array.from({ length: r.photos }).map((_, i) => (
            <div
              key={i}
              style={{
                width: 62,
                height: 62,
                borderRadius: 10,
                flex: "none",
                backgroundSize: "cover",
                backgroundPosition: "center",
                backgroundImage: `url(https://loremflickr.com/200/200/${kw}?lock=${((r.prov.charCodeAt(0) + i * 53) % 900) + 100})`,
              }}
            />
          ))}
        </div>
      )}
      <div style={{ fontSize: 11, color: "var(--muted)", marginTop: 9, borderTop: "1px solid var(--line-2)", paddingTop: 7 }}>
        {r.ctx} · via your recommendation
      </div>
    </div>
  );
}

export default function StaffReviews() {
  const revs = GUEST_REVIEWS;
  const avg = revs.reduce((s, r) => s + r.stars, 0) / revs.length;
  const pos = Math.round((revs.filter((r) => r.stars >= 4).length / revs.length) * 100);
  return (
    <Screen active="reviews">
      <h2 style={{ fontSize: 17 }}>Guest feedback</h2>
      <div style={{ fontSize: 12.5, color: "var(--muted)", margin: "3px 0 12px" }}>
        Reviews from tourists you recommended — your recommendation track record.
      </div>
      <div style={{ display: "flex", gap: 9, marginBottom: 10 }}>
        <div style={{ flex: 1.2, background: "var(--primary-l)", borderRadius: 12, padding: 12, textAlign: "center" }}>
          <div style={{ fontSize: 26, fontWeight: 800, color: "var(--primary-d)", lineHeight: 1 }}>
            {avg.toFixed(1)}
          </div>
          <div className="starrow" style={{ fontSize: 12, marginTop: 3 }}>
            ★★★★★
          </div>
          <div style={{ fontSize: 10.5, color: "var(--muted)", marginTop: 3 }}>avg of your picks</div>
        </div>
        <div style={{ flex: 1, background: "var(--surface)", border: "1px solid var(--line)", borderRadius: 12, padding: 12, textAlign: "center" }}>
          <div style={{ fontSize: 26, fontWeight: 800, lineHeight: 1 }}>{pos}%</div>
          <div style={{ fontSize: 10.5, color: "var(--muted)", marginTop: 8 }}>positive</div>
        </div>
        <div style={{ flex: 1, background: "var(--surface)", border: "1px solid var(--line)", borderRadius: 12, padding: 12, textAlign: "center" }}>
          <div style={{ fontSize: 26, fontWeight: 800, lineHeight: 1 }}>{revs.length}</div>
          <div style={{ fontSize: 10.5, color: "var(--muted)", marginTop: 8 }}>reviews</div>
        </div>
      </div>
      <div style={{ fontSize: 11.5, color: "var(--accent)", background: "var(--accent-l)", borderRadius: 9, padding: "9px 11px", marginBottom: 14 }}>
        ⭐ Guests rate the places you recommend {avg.toFixed(1)}/5 — good local tips lift your own reviews too.
      </div>
      {revs.map((r, i) => (
        <ReviewCard key={i} r={r} />
      ))}
    </Screen>
  );
}
