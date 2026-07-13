import { useState } from "react";
import { COMMUNITIES } from "../v2data";
import type { Community } from "../v2data";
import CommunityDetail, { ReadinessBadge } from "./CommunityDetail";

function CommunityCard({ c, onOpen }: { c: Community; onOpen: (id: string) => void }) {
  return (
    <div className="pcard" onClick={() => onOpen(c.id)}>
      <div className="ph" style={c.img ? { backgroundImage: `url(${c.img})` } : undefined}>
        {!c.img && <div className="ph-emo">{c.emo}</div>}
        <div className="ph-badges">
          <span className="badge b-pick">🛶 Community Experience</span>
          <ReadinessBadge c={c} />
        </div>
      </div>
      <div className="body">
        <div className="ttl">
          <h3>{c.name}</h3>
        </div>
        <div className="meta">
          {c.nameEn}
        </div>
        <div className="meta" style={{ marginTop: 2 }}>
          📍 {c.area}, Phuket · {c.memberIds.length > 0 ? `${c.memberIds.length} local businesses` : c.duration}
        </div>
        <div style={{ fontSize: 13, color: "var(--ink-2)", marginTop: 8, lineHeight: 1.5 }}>
          {c.about.split(". ")[0]}.
        </div>
        <div className="t-plan">📞 Planned experience — contact the community to confirm a round</div>
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            marginTop: 11,
          }}
        >
          <span style={{ fontSize: 12.5, fontWeight: 800, color: "var(--accent-d)" }}>
            from {c.priceFrom.split("/")[0].split("·")[0].trim()}
          </span>
          <span style={{ fontSize: 12.5, color: "var(--primary)", fontWeight: 700 }}>
            View &amp; contact ›
          </span>
        </div>
      </div>
    </div>
  );
}

// "Community" tab — contact-first. List community-run experiences across Phuket;
// open one for the full programme, readiness and contact CTAs. No "Book Now".
export default function Community() {
  const [sel, setSel] = useState<string | null>(null);
  if (sel) return <CommunityDetail id={sel} onBack={() => setSel(null)} />;

  return (
    <div className="scroll">
      <div className="appbar">
        <div>
          <h1>Local communities</h1>
          <div className="sub">Community-run experiences across Phuket</div>
        </div>
      </div>
      <div className="pad">
        <p style={{ fontSize: 13, color: "var(--ink-2)", lineHeight: 1.55, marginBottom: 14 }}>
          Meet the people who make Phuket special — fishing villages, sea-gypsy
          communities and heritage streets. These are planned experiences: see
          what each offers, then contact them directly to arrange your visit.
        </p>
        {COMMUNITIES.map((c) => (
          <CommunityCard key={c.id} c={c} onOpen={setSel} />
        ))}
        <div style={{ height: 8 }} />
      </div>
    </div>
  );
}
