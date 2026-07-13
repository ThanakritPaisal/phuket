import type { CatalogProvider, GuestReview } from "../types";
import { provReviews, revKw } from "./lib";
import Photo from "./Photo";

function ReviewCard({ r, kw }: { r: GuestReview; kw: string }) {
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
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <div className="starrow" style={{ fontSize: 16 }}>
          {"★".repeat(r.stars)}
          <span style={{ color: "var(--line)" }}>{"★".repeat(5 - r.stars)}</span>
        </div>
        <div style={{ fontSize: 11, color: "var(--muted)" }}>{r.when}</div>
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
        <div style={{ fontSize: 13, color: "var(--ink-2)", marginTop: 9, lineHeight: 1.5 }}>
          “{r.comment}”
        </div>
      )}
      {r.photos > 0 && (
        <div style={{ display: "flex", gap: 7, marginTop: 9 }}>
          {Array.from({ length: r.photos }).map((_, i) => (
            <Photo
              key={i}
              img={`https://loremflickr.com/200/200/${kw}?lock=${((r.prov.charCodeAt(0) + i * 61) % 900) + 100}`}
              emo="📷"
              size={62}
            />
          ))}
        </div>
      )}
      <div
        style={{
          fontSize: 11,
          color: "var(--muted)",
          marginTop: 9,
          borderTop: "1px solid var(--line-2)",
          paddingTop: 7,
        }}
      >
        {r.ctx}
      </div>
    </div>
  );
}

export default function ProviderReviews({ p }: { p: CatalogProvider }) {
  const revs = provReviews(p.id);
  const avg = revs.length ? revs.reduce((a, r) => a + r.stars, 0) / revs.length : p.rating;
  const pos = revs.length
    ? Math.round((revs.filter((r) => r.stars >= 4).length / revs.length) * 100)
    : 90;
  const kw = revKw(p.cat);

  // aggregate tag frequency (the private improvement signal)
  const tagCount: Record<string, number> = {};
  revs.forEach((r) => (r.tags || []).forEach((t) => (tagCount[t] = (tagCount[t] || 0) + 1)));
  const tags = Object.entries(tagCount).sort((a, b) => b[1] - a[1]);
  const maxT = tags.length ? tags[0][1] : 1;

  return (
    <div className="pad">
      <h2 style={{ fontSize: 17 }}>
        Guest feedback{" "}
        <span style={{ fontSize: 12, fontWeight: 500, color: "var(--muted)" }}>· private</span>
      </h2>
      <div className="note-box" style={{ margin: "8px 0 12px" }}>
        <div className="lab">🔒 Private feedback</div>
        Only you and LOMA see this — it's for improving your service. It is <b>not</b> shown to
        tourists, and it never affects your LOMA ranking. Your public star rating stays on your
        Google listing.
      </div>
      <div style={{ display: "flex", gap: 9, marginBottom: 14 }}>
        <div style={{ flex: 1.2, background: "var(--primary-l)", borderRadius: 12, padding: 12, textAlign: "center" }}>
          <div style={{ fontSize: 26, fontWeight: 800, color: "var(--primary-d)", lineHeight: 1 }}>
            {avg.toFixed(1)}
          </div>
          <div className="starrow" style={{ fontSize: 12, marginTop: 3 }}>
            ★★★★★
          </div>
          <div style={{ fontSize: 10.5, color: "var(--muted)", marginTop: 3 }}>avg (private)</div>
        </div>
        <div style={{ flex: 1, background: "var(--surface)", border: "1px solid var(--line)", borderRadius: 12, padding: 12, textAlign: "center" }}>
          <div style={{ fontSize: 26, fontWeight: 800, lineHeight: 1 }}>{pos}%</div>
          <div style={{ fontSize: 10.5, color: "var(--muted)", marginTop: 8 }}>positive</div>
        </div>
        <div style={{ flex: 1, background: "var(--surface)", border: "1px solid var(--line)", borderRadius: 12, padding: 12, textAlign: "center" }}>
          <div style={{ fontSize: 26, fontWeight: 800, lineHeight: 1 }}>{revs.length}</div>
          <div style={{ fontSize: 10.5, color: "var(--muted)", marginTop: 8 }}>responses</div>
        </div>
      </div>
      <div className="h-sec">What guests mention</div>
      {tags.length > 0 ? (
        <div className="blist">
          {tags.map(([t, n]) => (
            <div className="brow" key={t}>
              <div className="nm">{t}</div>
              <div className="track">
                <div
                  className={`fill${/hard|slow|expensive|dirty/i.test(t) ? " a" : ""}`}
                  style={{ width: `${Math.round((n / maxT) * 100)}%` }}
                />
              </div>
              <div className="vv">{n}</div>
            </div>
          ))}
        </div>
      ) : (
        <div style={{ color: "var(--muted)", fontSize: 13 }}>No tags yet.</div>
      )}
      <div className="h-sec">Recent comments</div>
      {revs.length > 0 ? (
        revs.map((r, i) => <ReviewCard key={i} r={r} kw={kw} />)
      ) : (
        <div style={{ textAlign: "center", color: "var(--muted)", padding: 30 }}>No feedback yet.</div>
      )}
    </div>
  );
}
