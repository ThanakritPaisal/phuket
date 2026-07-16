import { useMemo, useState } from "react";
import Icon from "../components/Icon";
import { AiBox, ScoreBars } from "../components/AiScorePanel";
import { aiScore, type ScoreInput } from "../scoring";
import type { CatalogProvider } from "../types";
import "./edit.css";

// The 12 self-service fields the provider can edit (ported from ppEdit / PP_FIELDS).
type EditKey =
  | "name"
  | "description"
  | "address"
  | "hours"
  | "priceText"
  | "phone"
  | "line"
  | "whatsapp"
  | "website"
  | "maps"
  | "lang"
  | "booking";

type Edits = Record<EditKey, string>;

const FIELDS: [EditKey, string, "text" | "area", string][] = [
  ["name", "Business name", "text", "Baan Rim Talay Seafood"],
  ["description", "Short description", "area", "Tell tourists what makes you local."],
  ["address", "Address", "text", "Street, area, Phuket"],
  ["hours", "Opening hours", "text", "e.g. 11:00 – 22:00 daily"],
  ["priceText", "Price range", "text", "e.g. ฿100–350"],
  ["phone", "Phone", "text", "+66 …"],
  ["line", "LINE ID", "text", "@yourbusiness"],
  ["whatsapp", "WhatsApp", "text", "+66 …"],
  ["website", "Website / social", "text", "facebook.com/…"],
  ["maps", "Google Maps link", "text", "maps.app.goo.gl/…"],
  ["lang", "Languages spoken", "text", "Thai · basic English"],
  ["booking", "Booking / walk-in note", "text", "Walk-ins welcome · book ahead for groups"],
];

function seedEdits(p: CatalogProvider): Edits {
  return {
    name: p.name,
    description: p.reason || p.sum || "",
    address: p.area ? `${p.area}, Phuket` : "",
    hours: p.hours || "",
    priceText: p.priceText || p.price || "",
    phone: "+66 76 000 000",
    line: "@" + (p.id || "").toLowerCase(),
    whatsapp: "",
    website: "",
    maps: "maps.app.goo.gl/" + (p.id || ""),
    lang: p.lang || "",
    booking: p.booking || "",
  };
}

// Build the engine input from the current edits. Spreading the record first
// (spec: aiScore({...record, ...edits})) keeps locality/quality/visibility/risk
// signals intact — only the readiness levers below can change.
function buildInput(
  p: CatalogProvider,
  e: Edits,
  english: boolean,
  photos: boolean
): ScoreInput {
  const lang = english
    ? /English/i.test(e.lang)
      ? e.lang
      : e.lang
      ? e.lang + " · English"
      : "English"
    : e.lang.replace(/[·,]?\s*(basic\s+)?English/gi, "").replace(/^[·,\s]+/, "").trim();
  const contact = [e.phone, e.line, e.whatsapp]
    .map((s) => s.trim())
    .filter(Boolean)
    .join(" · ");
  return {
    ...p,
    name: e.name.trim() || p.name,
    hours: e.hours,
    priceText: e.priceText,
    contact,
    lang,
    img: photos ? p.img || "photo" : "",
  };
}

export default function ProviderEdit({
  p,
  onBack,
  toast,
}: {
  p: CatalogProvider;
  onBack: () => void;
  toast: (m: string) => void;
}) {
  const initial = useMemo(() => seedEdits(p), [p]);
  const [edits, setEdits] = useState<Edits>(initial);
  const [english, setEnglish] = useState(() => /English/i.test(p.lang || ""));
  const [photos, setPhotos] = useState(() => !!p.img);
  const [ai, setAi] = useState(() => aiScore(buildInput(p, initial, /English/i.test(p.lang || ""), !!p.img)));

  // TikTok review-clip source (v3 ppEdit): a place link we auto-pull top clips
  // from, plus up to 3 optional pinned clips. Curates which clips show — never rank.
  const tiktok = p as { tiktok_place?: string; reviewClips?: string[] };
  const [tiktokPlace, setTiktokPlace] = useState(() => tiktok.tiktok_place ?? "");
  const [clips, setClips] = useState<string[]>(() => {
    const rc = tiktok.reviewClips ?? [];
    return [rc[0] ?? "", rc[1] ?? "", rc[2] ?? ""];
  });

  const set = (k: EditKey, v: string) => setEdits((e) => ({ ...e, [k]: v }));

  const save = () => {
    const before = ai.readiness_score;
    const next = aiScore(buildInput(p, edits, english, photos));
    setAi(next);
    // Persist the TikTok source in-memory (demo). Empty pins => auto-select from
    // the place link; these fields do not touch any score.
    tiktok.tiktok_place = tiktokPlace.trim();
    tiktok.reviewClips = clips.map((c) => c.trim()).filter(Boolean);
    const d = next.readiness_score - before;
    toast(
      d !== 0
        ? `Re-scored · Tourist Readiness ${d > 0 ? "+" : ""}${d} → ${next.readiness_score}`
        : `Saved · re-scored with AI`
    );
  };

  return (
    <div className="pad">
      <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 4 }}>
        <button
          className="pe-back"
          onClick={onBack}
          aria-label="Back to profile"
        >
          <Icon name="back" size={18} />
        </button>
        <h2 style={{ fontSize: 18 }}>Edit my profile</h2>
      </div>
      <div style={{ fontSize: 12.5, color: "var(--muted)", margin: "3px 0 12px" }}>
        Keeping this current directly raises your <b>Tourist Readiness</b> score — the AI
        re-scores you every time you save.
      </div>

      <AiBox ai={ai} />
      <ScoreBars ai={ai} />

      <div className="pe-lever-note">
        Hours, a price, a contact channel, English and photos each lift{" "}
        <b>Tourist Readiness</b>. Popularity and effort do <b>not</b> touch Locality or
        Quality — those describe who you are, not how complete your listing is.
      </div>

      <div className="h-sec">Your details</div>
      {FIELDS.map(([k, label, type, ph]) => (
        <div className="pe-field" key={k}>
          <div className="pe-lab">{label}</div>
          {type === "area" ? (
            <textarea
              className="pp-input sm"
              rows={3}
              value={edits[k]}
              placeholder={ph}
              onChange={(ev) => set(k, ev.target.value)}
            />
          ) : (
            <input
              className="pp-input sm"
              value={edits[k]}
              placeholder={ph}
              onChange={(ev) => set(k, ev.target.value)}
            />
          )}
        </div>
      ))}

      <div className="h-sec">TikTok reviews (optional)</div>
      <div className="modehint" style={{ marginBottom: 10 }}>
        📹 LOMA auto-plays real TikTok clips filmed at your shop on your LOMA card. Paste your
        TikTok <b>place</b> link and we pull your 3 most-viewed clips automatically — or pin up
        to 3 specific videos you would rather feature. This only <b>curates</b> which review
        clips show — it does <b>not</b> buy ranking.
      </div>
      <div className="pe-field">
        <div className="pe-lab">TikTok place link</div>
        <input
          className="pp-input sm"
          value={tiktokPlace}
          placeholder="https://www.tiktok.com/place/Your-Shop-Phuket-2156..."
          onChange={(ev) => setTiktokPlace(ev.target.value)}
        />
        <div style={{ fontSize: 11, color: "var(--muted)", marginTop: 5 }}>
          We auto-select the 3 top clips from this location. Leave the pins below empty to use
          auto-select.
        </div>
      </div>
      <div className="pe-field">
        <div className="pe-lab">Pin specific clips (optional)</div>
        {clips.map((c, i) => (
          <input
            key={i}
            className="pp-input sm"
            value={c}
            placeholder={`Clip ${i + 1} · https://www.tiktok.com/@user/video/...`}
            style={{ marginBottom: 8 }}
            onChange={(ev) =>
              setClips((prev) => prev.map((x, j) => (j === i ? ev.target.value : x)))
            }
          />
        ))}
      </div>

      <div className="h-sec">Readiness signals</div>
      <div className="pe-switch">
        <div>
          <div className="pe-switch-t">English spoken with guests</div>
          <div className="pe-switch-s">Lets us list you for English-speaking tourists.</div>
        </div>
        <button
          className={`pe-toggle${english ? " on" : ""}`}
          role="switch"
          aria-checked={english}
          onClick={() => setEnglish((v) => !v)}
        >
          <span />
        </button>
      </div>
      <div className="pe-switch">
        <div>
          <div className="pe-switch-t">Photos on my profile</div>
          <div className="pe-switch-s">A profile with photos reads as tourist-ready.</div>
        </div>
        <button
          className={`pe-toggle${photos ? " on" : ""}`}
          role="switch"
          aria-checked={photos}
          onClick={() => setPhotos((v) => !v)}
        >
          <span />
        </button>
      </div>

      <div style={{ marginTop: 14 }}>
        <button className="btn btn-coral" onClick={save}>
          <Icon name="spark" size={16} /> Save &amp; re-score with AI
        </button>
      </div>
      <div className="modehint">
        🛡 You can never pay to rank higher on LOMA. Completing this only proves you are{" "}
        <b>ready for tourists</b> — it does not buy visibility, and it cannot raise Locality
        or Quality.
      </div>
      <div style={{ height: 16 }} />
    </div>
  );
}
