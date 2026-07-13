import Icon from "./Icon";
import type { AiScore } from "../scoring";
import "./ai.css";

// LOMA badges derived from the AI score — ported from lomaBadges() in the prototype.
export function LomaBadges({
  ai,
  score,
}: {
  ai: AiScore;
  score?: boolean;
}) {
  return (
    <>
      {ai.is_hidden_gem && <span className="badge b-gem">💎 Hidden Gem</span>}
      {ai.is_verified ? (
        <span className="badge b-verified">
          <Icon name="verified" size={12} /> Verified Local
        </span>
      ) : ai.is_local ? (
        <span className="badge b-local">🌿 Local</span>
      ) : null}
      {ai.is_tourist_ready && <span className="badge b-ready">✓ Tourist Ready</span>}
      {ai.is_community_experience && (
        <span className="badge b-pick">🛶 Community Experience</span>
      )}
      {ai.requires_advance_contact && !ai.is_community_experience && (
        <span className="badge b-warn-s">📞 Needs Contact First</span>
      )}
      {score && (
        <span className="badge b-ai">
          <Icon name="spark" size={12} /> LOMA {ai.overall_loma_score}
        </span>
      )}
    </>
  );
}

// Plain-language AI curation note.
export function AiBox({ ai }: { ai: AiScore }) {
  return (
    <div className="aibox">
      <div className="lab">
        <Icon name="spark" size={12} /> AI curation note
      </div>
      <p>{ai.ai_summary}</p>
    </div>
  );
}

const ROWS: [keyof AiScore, string, "" | "g" | "c" | "r", string][] = [
  ["locality_score", "Locality", "", "Genuinely local: single branch, local ownership & sourcing"],
  ["quality_score", "Quality signal", "", "Review sentiment, recency, repeat-customer language"],
  ["visibility_gap_score", "Visibility gap", "c", "HIGH = under-discovered. Popularity is not rewarded."],
  ["readiness_score", "Tourist readiness", "g", "Hours, contact, price, language, photos"],
  ["risk_score", "Risk filter", "r", "LOW is good. Red flags block publishing."],
];

// The five score bars.
export function ScoreBars({ ai }: { ai: AiScore }) {
  return (
    <div className="sbars">
      {ROWS.map(([key, label, cls, title]) => {
        const v = ai[key] as number;
        return (
          <div className="sbar" key={label} title={title}>
            <div className="n">{label}</div>
            <div className="t">
              <i className={`f ${cls}`} style={{ width: `${v}%` }} />
            </div>
            <div className="v">{v}</div>
          </div>
        );
      })}
    </div>
  );
}

// Convenience: the AI note + the five bars together.
export default function AiScorePanel({ ai }: { ai: AiScore }) {
  return (
    <>
      <AiBox ai={ai} />
      <ScoreBars ai={ai} />
    </>
  );
}
