import { useState } from "react";
import { COMMUNITIES } from "../v2data";
import CommunityDetail from "./CommunityDetail";
import { BigCommCard } from "./BigCard";

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
          <BigCommCard key={c.id} c={c} onOpen={setSel} />
        ))}
        <div style={{ height: 8 }} />
      </div>
    </div>
  );
}
