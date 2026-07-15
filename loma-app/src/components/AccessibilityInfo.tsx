import type { Provider } from "../types";

// Honest labels: "unknown"/"unverified" is shown as NOT-VERIFIED, never as "no".
const TONE: Record<string, string> = {
  ok: "var(--ok-d)", warn: "var(--warn-d)", bad: "var(--danger)", muted: "var(--muted)",
};
const WHEELCHAIR: Record<string, [string, string]> = {
  full: ["Wheelchair accessible", "ok"],
  partial: ["Partly wheelchair accessible", "warn"],
  not_accessible: ["Not wheelchair accessible", "bad"],
  unknown: ["Wheelchair access not verified", "muted"],
};
const ELDERLY: Record<string, [string, string]> = {
  suitable: ["Comfortable for elderly guests", "ok"],
  conditional: ["Suitable for elderly — with conditions", "warn"],
  not_suitable: ["Not ideal for elderly guests", "bad"],
  unknown: ["Elderly suitability not assessed", "muted"],
};
const VERIF: Record<string, string> = {
  unverified: "Public data — not yet verified",
  provider_declared: "Provided by the business",
  hotel_verified: "Confirmed by a hotel partner",
  loma_verified: "Verified by LOMA",
};

function Row({ icon, text, tone }: { icon: string; text: string; tone: string }) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 12.5, color: TONE[tone] }}>
      <span style={{ fontSize: 15 }}>{icon}</span> {text}
    </div>
  );
}

export default function AccessibilityInfo({ p }: { p: Provider }) {
  const wheel = p.wheelchair_accessibility ?? "unknown";
  const eld = p.elderly_suitability ?? "unknown";
  const verif = p.verification_status ?? "unverified";
  const dur =
    p.estimated_visit_duration_min && p.estimated_visit_duration_max
      ? `≈ ${p.estimated_visit_duration_min}–${p.estimated_visit_duration_max} min at the venue`
      : null;

  return (
    <>
      <div className="sec-h">Access &amp; visit</div>
      <div
        style={{
          display: "flex", flexDirection: "column", gap: 7, padding: "11px 12px",
          border: "1px solid var(--line)", borderRadius: 12, background: "var(--surface)",
        }}
      >
        {dur && <Row icon="⏱️" text={dur} tone="muted" />}
        <Row icon="♿" text={WHEELCHAIR[wheel][0]} tone={WHEELCHAIR[wheel][1]} />
        <Row icon="🧓" text={ELDERLY[eld][0]} tone={ELDERLY[eld][1]} />
        <div style={{ fontSize: 11, color: "var(--muted)", marginTop: 3, borderTop: "1px solid var(--line-2)", paddingTop: 6 }}>
          🔎 {VERIF[verif]}
          {(wheel === "unknown" || eld === "unknown") &&
            " · Accessibility details are unconfirmed — please contact the venue to be sure."}
        </div>
      </div>
    </>
  );
}
