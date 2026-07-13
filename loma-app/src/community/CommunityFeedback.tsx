import { commReviews } from "./lib";
import type { CommScreenProps } from "./CommunityApp";

export default function CommunityFeedback({ c }: CommScreenProps) {
  // Deterministic, seeded from the community id — and scoped to this community.
  const reviews = commReviews(c);
  const avg = (reviews.reduce((a, r) => a + r.stars, 0) / reviews.length).toFixed(1);

  return (
    <>
      <div className="ed-top">
        <h1>
          What guests said
          <br />
          about your village.
        </h1>
        <div className="sub">Only guests who actually visited can leave this.</div>
      </div>

      <div className="pad" style={{ paddingTop: 12 }}>
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 14,
            background: "var(--surface)",
            border: "1px solid var(--line)",
            borderRadius: 14,
            padding: "14px 15px",
            marginBottom: 12,
          }}
        >
          <div>
            <div className="statbig" style={{ fontSize: 40 }}>
              {avg}
            </div>
            <div style={{ fontSize: 11, color: "var(--muted)", fontWeight: 700 }}>{reviews.length} reviews</div>
          </div>
          <div style={{ flex: 1, fontSize: 12.5, color: "var(--ink-2)", lineHeight: 1.55 }}>
            Guests keep using the words <b>honest</b>, <b>genuine</b> and <b>no pressure</b>. That is the signal
            LOMA scores you on — not how many reviews you have.
          </div>
        </div>

        {reviews.map((r, i) => (
          <div className="pcard" key={i} style={{ marginBottom: 10, padding: "13px 14px", cursor: "default" }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
              <div style={{ fontWeight: 700, fontSize: 13.5 }}>
                {r.name}{" "}
                <span style={{ fontWeight: 500, color: "var(--muted)", fontSize: 11.5 }}>· {r.country}</span>
              </div>
              <div style={{ color: "var(--accent)", fontSize: 12 }}>
                {"★".repeat(r.stars)}
                {"☆".repeat(5 - r.stars)}
              </div>
            </div>
            <div style={{ fontSize: 13, color: "var(--ink-2)", marginTop: 7, lineHeight: 1.6 }}>“{r.text}”</div>
            <div style={{ fontSize: 11, color: "var(--muted)", marginTop: 7 }}>Verified visit · checked in by you</div>
          </div>
        ))}

        <div className="modehint" style={{ marginTop: 6 }}>
          🛡 Reviews come only from guests you checked in. Nobody can review a place they never went to — so nobody
          can buy a reputation here.
        </div>
        <div style={{ height: 14 }} />
      </div>
    </>
  );
}
