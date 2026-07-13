import { useState } from "react";
import type { CatalogProvider } from "../../types";
import Icon from "../../components/Icon";

const TAGS = ["Great value", "Authentic", "Friendly", "Hard to find", "Would recommend"];

export default function Feedback({
  p,
  onSubmit,
}: {
  p: CatalogProvider;
  onSubmit: () => void;
}) {
  const [stars, setStars] = useState(0);
  const [picked, setPicked] = useState<Set<string>>(new Set());
  const toggle = (t: string) => {
    const n = new Set(picked);
    n.has(t) ? n.delete(t) : n.add(t);
    setPicked(n);
  };

  return (
    <div className="scroll pad" style={{ paddingTop: 22 }}>
      <h2 style={{ fontSize: 19, textAlign: "center" }}>How was {p.name}?</h2>
      <div style={{ fontSize: 12.5, color: "var(--muted)", textAlign: "center", marginTop: 4 }}>
        Your feedback is anonymous.
      </div>
      <div className="feedback-stars" style={{ margin: "20px 0" }}>
        {[1, 2, 3, 4, 5].map((i) => (
          <span key={i} className={i <= stars ? "lit" : ""} onClick={() => setStars(i)}>
            ★
          </span>
        ))}
      </div>
      <div className="h-sec" style={{ textAlign: "center" }}>
        Anything to add?
      </div>
      <div className="chips" style={{ justifyContent: "center" }}>
        {TAGS.map((t) => (
          <button key={t} className={`chip ${picked.has(t) ? "on" : ""}`} onClick={() => toggle(t)}>
            {t}
          </button>
        ))}
      </div>

      <div className="h-sec" style={{ textAlign: "center" }}>
        Add photos (optional)
      </div>
      <div style={{ display: "flex", gap: 8, justifyContent: "center", flexWrap: "wrap" }}>
        <button
          style={{
            width: 74,
            height: 74,
            borderRadius: 12,
            border: "2px dashed var(--line)",
            background: "var(--surface-2)",
            display: "grid",
            placeItems: "center",
            color: "var(--muted)",
            fontSize: 22,
          }}
        >
          ＋
        </button>
      </div>

      <textarea
        rows={3}
        placeholder="Optional comment…"
        style={{
          marginTop: 14,
          resize: "none",
          width: "100%",
          border: "1px solid var(--line)",
          borderRadius: 11,
          padding: "10px 12px",
          fontFamily: "inherit",
          fontSize: 13,
        }}
      />
      <div style={{ marginTop: 14 }}>
        <button className="btn btn-primary" onClick={onSubmit}>
          <Icon name="check" size={17} /> Submit feedback
        </button>
      </div>
      <div
        style={{
          fontSize: 11.5,
          color: "var(--muted)",
          background: "var(--surface-2)",
          borderRadius: 9,
          padding: "9px 11px",
          marginTop: 12,
          textAlign: "center",
        }}
      >
        No account needed. Your feedback is shared privately with the place that hosted you, the
        property that recommended it, and LOMA — it is not posted publicly.
      </div>
    </div>
  );
}
