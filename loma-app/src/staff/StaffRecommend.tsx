import { useState } from "react";
import Icon from "../components/Icon";
import { LomaBadges } from "../components/AiScorePanel";
import { activePicks } from "../activeAccount";
import { LOMA_CATS } from "../scoring";
import { createRecList } from "../recommendations";
import { useVersion } from "../store";
import { StaffAppbar, StaffTabbar, bg, useStaff } from "./helpers";
import "./impact.css";

/**
 * Create Assisted Recommendation (Flow A).
 * Category filter → AI-curated provider list → tick a few → Generate QR / Link.
 * "Passive QR helps tourists browse. Assisted recommendation helps tourists decide."
 */
export default function StaffRecommend() {
  useVersion();
  const { setCurList, go } = useStaff();
  const [cat, setCat] = useState<string | null>(null);
  const [sel, setSel] = useState<Set<string>>(new Set());

  // AI-curated real picks: filter by LOMA category, hidden gems first, then score.
  const list = activePicks()
    .filter((p) => !cat || p.ai.loma_cat === cat)
    .sort(
      (a, b) =>
        Number(b.ai.is_hidden_gem) - Number(a.ai.is_hidden_gem) ||
        b.ai.overall_loma_score - a.ai.overall_loma_score
    )
    .slice(0, 12);

  const toggle = (id: string) =>
    setSel((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });

  const generate = () => {
    if (!sel.size) return;
    const rl = createRecList([...sel], "assisted");
    setCurList(rl);
    go("qrlink");
  };

  return (
    <div className="scroll">
      <StaffAppbar />
      <div className="ed-top">
        <h1>
          A guest asked you
          <br />
          something.
        </h1>
        <div className="sub">
          For <u>this</u> guest, right now — a one-off QR.
        </div>
      </div>
      <div className="pad" style={{ paddingTop: 12 }}>
        <div className="modehint" style={{ marginBottom: 14 }}>
          <span>
            💡 <b>Assisted recommendation helps tourists decide.</b> Not the same as{" "}
            <b>Saved</b> — that's the hotel's permanent QR for every guest. Passive QR helps them
            browse; this helps them choose.
          </span>
        </div>

        <div className="h-sec">Category</div>
        <div className="chips">
          <button className={`chip ${!cat ? "on" : ""}`} onClick={() => setCat(null)}>
            All
          </button>
          {LOMA_CATS.map(([c, e]) => (
            <button key={c} className={`chip ${cat === c ? "on" : ""}`} onClick={() => setCat(c)}>
              {e} {c}
            </button>
          ))}
        </div>

        <div className="h-sec">
          AI-Curated Local Picks{" "}
          <span
            style={{ fontWeight: 500, textTransform: "none", letterSpacing: 0, color: "var(--muted)" }}
          >
            · ranked by LOMA score, hidden gems first
          </span>
        </div>

        {list.length ? (
          list.map((p) => {
            const on = sel.has(p.id);
            return (
              <div
                key={p.id}
                className={`selrow ${on ? "on" : ""}`}
                role="button"
                onClick={() => toggle(p.id)}
              >
                <span className="box">
                  <Icon name="check" size={13} />
                </span>
                <div className="thumb" style={bg(p.img)} />
                <div style={{ flex: 1, minWidth: 0 }}>
                  <h3 style={{ fontSize: 14, lineHeight: 1.3 }}>{p.name}</h3>
                  <div style={{ fontSize: 11.5, color: "var(--muted)", marginTop: 2 }}>
                    {p.ai.loma_cat} · {p.area} · {p.dist} · {p.price}
                  </div>
                  <div style={{ display: "flex", gap: 4, flexWrap: "wrap", marginTop: 6 }}>
                    <LomaBadges ai={p.ai} score />
                  </div>
                  <div className="ainote">
                    <Icon name="spark" size={12} />
                    <span>{p.ai.ai_summary}</span>
                  </div>
                </div>
              </div>
            );
          })
        ) : (
          <div style={{ textAlign: "center", color: "var(--muted)", padding: 30 }}>
            No live providers in this category yet.
          </div>
        )}
        <div style={{ height: 10 }} />
      </div>

      <div className="footstack">
        <div className="stickbar">
          <button
            className={`btn ${sel.size ? "btn-primary" : "btn-line"}`}
            style={sel.size ? undefined : { opacity: 0.5 }}
            disabled={!sel.size}
            onClick={generate}
          >
            <Icon name="qr" size={16} /> Generate QR / Link
            {sel.size ? ` (${sel.size} pick${sel.size > 1 ? "s" : ""})` : ""}
          </button>
          <div className="cap">
            {sel.size
              ? "No hidden commission. Transparent impact credits."
              : "Tick the places that answer this guest's question"}
          </div>
        </div>
        <StaffTabbar active="recommend" />
      </div>
    </div>
  );
}
