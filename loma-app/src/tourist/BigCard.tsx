// Image-forward tourist list card (v3 bigCard / bigCommCard): a big golden-hour
// photo with a category chip + optional pills, then name, one caption line and a
// rating/distance row. The whole card taps through to detail — no inline CTAs;
// the full "why", specs and actions live on the detail page.
import type { Community } from "../v2data";

// One short caption line — first sentence of the source text, trimmed on a word
// boundary to ~44 chars (mirrors v3 shortLine).
function shortLine(t?: string): string {
  const clean = (t || "").replace(/\s+/g, " ").trim();
  if (!clean) return "";
  let s = clean.split(/(?<=[.!?])\s/)[0];
  if (s.length > 44) s = s.slice(0, 42).replace(/\s+\S*$/, "") + "…";
  return s.replace(/[.]$/, "");
}

export interface BigCardProps {
  id: string;
  name: string;
  cat: string;
  sub?: string; // caption source (summary / reason)
  img?: string | null;
  emo?: string;
  rating?: number | null;
  reviews?: number | null;
  dist?: string; // right-hand meta slot (distance, area, …)
  gem?: boolean; // hidden-gem pill 💎
  house?: boolean; // house-pick pill ⭐
  onOpen: (id: string) => void;
}

function bcImage(img: string | null | undefined, emo?: string, cat?: string, pills: string[] = []) {
  return (
    <div
      className={"bc-im" + (img ? "" : " photo-fallback")}
      style={img ? { backgroundImage: `url(${img})` } : undefined}
    >
      {!img && <div className="ph-emo">{emo}</div>}
      {cat && <span className="bc-cat">{cat}</span>}
      {pills.length > 0 && (
        <div className="bc-pills">
          {pills.map((e, i) => (
            <span key={i}>{e}</span>
          ))}
        </div>
      )}
    </div>
  );
}

export default function BigCard({
  id,
  name,
  cat,
  sub,
  img,
  emo,
  rating,
  reviews,
  dist,
  gem,
  house,
  onOpen,
}: BigCardProps) {
  const pills: string[] = [];
  if (house) pills.push("⭐");
  if (gem) pills.push("💎");
  const caption = shortLine(sub);

  return (
    <div className="bcard" onClick={() => onOpen(id)}>
      {bcImage(img, emo, cat, pills)}
      <div className="bc-bd">
        <h3>{name}</h3>
        {caption && <div className="bc-cap">{caption}</div>}
        <div className="bc-mt">
          <span className="bc-rt">
            {reviews && reviews > 0 ? (
              <>
                ★ {rating} <span className="bc-g">({reviews})</span>
              </>
            ) : (
              <>
                🆕 <span className="bc-g">Newly listed</span>
              </>
            )}
          </span>
          {dist && <span className="bc-ds">{dist}</span>}
        </div>
      </div>
    </div>
  );
}

// Image-forward community card — taps through to the full community page.
export function BigCommCard({ c, onOpen }: { c: Community; onOpen: (id: string) => void }) {
  const from = c.priceFrom.split("/")[0].split("·")[0].trim();
  return (
    <div className="bcard" onClick={() => onOpen(c.id)}>
      {bcImage(c.img, c.emo, "Community Experience", ["🛶"])}
      <div className="bc-bd">
        <h3>{c.name}</h3>
        <div className="bc-cap">{shortLine(c.about)}</div>
        <div className="bc-mt">
          <span className="bc-rt">from {from}</span>
          {c.duration && <span className="bc-ds">{c.duration}</span>}
        </div>
      </div>
    </div>
  );
}
