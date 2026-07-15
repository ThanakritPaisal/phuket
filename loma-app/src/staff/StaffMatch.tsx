import { useState } from "react";
import Icon from "../components/Icon";
import { Screen, bg, useStaff } from "./helpers";
import { matchProviders, type MatchRequest, type MatchOutcome } from "../matching";
import { parseRequest } from "../matchClient";
import { createRecList } from "../recommendations";
import "./match.css";

const CATS: [string, string][] = [
  ["local_food", "🍜 Local food"],
  ["massage_spa", "💆 Massage & spa"],
  ["souvenir_craft", "🎁 Souvenirs"],
  ["community_experience", "🛶 Community"],
];
const EXAMPLE =
  "With my elderly mother who uses a wheelchair. Want affordable local food nearby, no more than 2 hours.";

export default function StaffMatch() {
  const { partner, openProv, setCurList, go } = useStaff();
  const [text, setText] = useState("");
  const [req, setReq] = useState<MatchRequest>({ open_now: true, max_minutes: 120 });
  const [out, setOut] = useState<MatchOutcome | null>(null);
  const [loading, setLoading] = useState(false);
  const [source, setSource] = useState<string>("");
  const [sel, setSel] = useState<Set<string>>(new Set());

  const run = (r: MatchRequest) => {
    setOut(matchProviders(r, partner));
    setSel(new Set());
  };
  const toggle = (id: string) =>
    setSel((s) => {
      const n = new Set(s);
      n.has(id) ? n.delete(id) : n.add(id);
      return n;
    });
  const generateQR = () => {
    const rl = createRecList([...sel], "assisted", "Matched to guest needs");
    setCurList(rl);
    go("qrlink");
  };
  const patch = (p: Partial<MatchRequest>) => {
    const next = { ...req, ...p };
    setReq(next);
    run(next);
  };

  const parseAndMatch = async () => {
    if (!text.trim()) return;
    setLoading(true);
    const parsed = await parseRequest(text);
    setLoading(false);
    setSource(parsed._source ?? "");
    if (parsed._source === "unavailable") return;
    const next: MatchRequest = {
      category: parsed.category ?? null,
      price_range: parsed.price_range ?? null,
      wheelchair_required: !!parsed.wheelchair_required,
      elderly_friendly: !!parsed.elderly_friendly,
      open_now: parsed.open_now ?? true,
      max_minutes: parsed.max_minutes ?? 120,
    };
    setReq(next);
    run(next);
  };

  return (
    <Screen active="recommend">
      <div className="mh">
        <h2>Match by guest need</h2>
        <p>Describe the guest, or set filters — LOMA filters by hard constraints, then ranks.</p>
      </div>

      <textarea
        className="mh-input"
        rows={3}
        placeholder={EXAMPLE}
        value={text}
        onChange={(e) => setText(e.target.value)}
      />
      <div style={{ display: "flex", gap: 8, marginTop: 8 }}>
        <button className="btn btn-primary" onClick={parseAndMatch} disabled={loading}>
          <Icon name="spark" size={16} /> {loading ? "Reading…" : "Understand & match"}
        </button>
        <button className="btn btn-line" style={{ width: "auto" }} onClick={() => setText(EXAMPLE)}>
          Try example
        </button>
      </div>
      {source && (
        <div className="mh-src">
          {source === "gemini" ? "🤖 Parsed by Gemini" : source === "keyword" ? "Parsed (keywords)" : "⚠ AI parser offline — use the filters below"}
        </div>
      )}

      <div className="h-sec">Quick filters</div>
      <div className="chips">
        {CATS.map(([c, l]) => (
          <button key={c} className={`chip ${req.category === c ? "on" : ""}`} onClick={() => patch({ category: req.category === c ? null : c })}>
            {l}
          </button>
        ))}
      </div>
      <div className="chips" style={{ marginTop: 8 }}>
        <button className={`chip ${req.price_range === "budget" ? "on" : ""}`} onClick={() => patch({ price_range: req.price_range === "budget" ? null : "budget" })}>💸 Affordable</button>
        <button className={`chip ${req.wheelchair_required ? "on" : ""}`} onClick={() => patch({ wheelchair_required: !req.wheelchair_required })}>♿ Wheelchair</button>
        <button className={`chip ${req.elderly_friendly ? "on" : ""}`} onClick={() => patch({ elderly_friendly: !req.elderly_friendly })}>🧓 Elderly-friendly</button>
        <button className={`chip ${req.open_now ? "on" : ""}`} onClick={() => patch({ open_now: !req.open_now })}>🟢 Open now</button>
        <button className={`chip ${req.max_minutes === 120 ? "on" : ""}`} onClick={() => patch({ max_minutes: req.max_minutes === 120 ? null : 120 })}>⏱ ≤ 2 hours</button>
      </div>

      {out && (
        <>
          <div className="mh-count">
            {out.results.length} of {out.considered} fit ·{" "}
            {out.excluded.slice(0, 3).map((e) => `${e.count} ${e.reason}`).join(" · ")}
          </div>
          {out.results.length > 0 && (
            <div className="mh-src" style={{ marginBottom: 6 }}>Tick the picks to send to the guest as a QR.</div>
          )}
          {out.results.slice(0, 6).map((r) => (
            <div
              className={`mres ${sel.has(r.pick.id) ? "on" : ""}`}
              key={r.pick.id}
              onClick={() => toggle(r.pick.id)}
            >
              <div className={`mtick ${sel.has(r.pick.id) ? "on" : ""}`}>{sel.has(r.pick.id) ? "✓" : ""}</div>
              <div className="thumb" style={{ ...bg(r.pick.img), width: 54, height: 54, flex: "none" }} />
              <div className="minfo">
                <div className="mtop">
                  <h3>{r.pick.name}</h3>
                  <span className="mscore">{r.score}</span>
                </div>
                <div className="mreasons">
                  {r.reasons.map((x, i) => (
                    <span key={i} className="mreason">✓ {x}</span>
                  ))}
                </div>
                {r.warnings.map((w, i) => (
                  <div key={i} className="mwarn">⚠ {w}</div>
                ))}
                <span
                  className="mview"
                  onClick={(e) => {
                    e.stopPropagation();
                    openProv(r.pick.id);
                  }}
                >
                  View details ›
                </span>
              </div>
            </div>
          ))}
          {out.results.length === 0 && (
            <div className="empty">No provider meets every hard constraint. Loosen a filter (e.g. wheelchair or time).</div>
          )}
          {sel.size > 0 && (
            <div className="mgen">
              <button className="btn btn-primary" onClick={generateQR}>
                <Icon name="qr" size={16} /> Generate QR for {sel.size} pick{sel.size === 1 ? "" : "s"}
              </button>
            </div>
          )}
        </>
      )}
    </Screen>
  );
}
