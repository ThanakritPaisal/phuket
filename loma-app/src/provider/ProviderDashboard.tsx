import type { CSSProperties } from "react";
import Icon from "../components/Icon";
import type { CatalogProvider } from "../types";
import { provStats, provPartners, provReviews, provScore, provInit, fmtBk } from "./lib";
import type { ProvScreen } from "./Chrome";

function ScoreBadge({ label, v }: { label: string; v: number }) {
  return (
    <span className="score">
      <span className="ring" style={{ "--v": v } as CSSProperties}>
        <i>{v}</i>
      </span>
      {label}
    </span>
  );
}

const tile: CSSProperties = {
  flex: 1,
  background: "var(--surface)",
  border: "1px solid var(--line)",
  borderRadius: 12,
  padding: 11,
  textAlign: "center",
};

export default function ProviderDashboard({
  p,
  status,
  avail,
  onToggleAvail,
  onApprove,
  onGo,
}: {
  p: CatalogProvider;
  status: string;
  avail: boolean;
  onToggleAvail: () => void;
  onApprove: () => void;
  onGo: (s: ProvScreen) => void;
}) {
  const s = provStats(p);
  const partners = provPartners(p.id);
  const revs = provReviews(p.id);
  const avgR = revs.length ? revs.reduce((a, r) => a + r.stars, 0) / revs.length : p.rating;
  const verified = status === "verified";

  return (
    <>
      {status === "pending" && (
        <div className="note-box" style={{ margin: "12px 16px 0" }}>
          <div className="lab">🕓 Verification pending</div>
          Your business is under review by the LOMA team. You can set up your profile now; you'll
          start receiving tourist leads once verified.
          <div style={{ marginTop: 9 }}>
            <button className="btn btn-line btn-sm" onClick={onApprove}>
              ⚡ (Demo) Approve as LOMA admin
            </button>
          </div>
        </div>
      )}
      <div className="pad">
        <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap", marginBottom: 4 }}>
          {verified ? (
            <span className="badge b-verified">
              <Icon name="verified" size={13} /> Verified provider
            </span>
          ) : (
            <span className="badge b-closed">Pending verification</span>
          )}
          <span className="badge b-local">🌿 Local</span>
        </div>
        <h2 style={{ fontSize: 18 }}>Welcome back 👋</h2>
        <div style={{ fontSize: 12.5, color: "var(--muted)", marginBottom: 12 }}>
          Here's how LOMA is bringing you tourists.
        </div>

        {/* availability toggle */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            background: avail ? "var(--ok-l)" : "var(--surface-2)",
            border: "1px solid var(--line)",
            borderRadius: 12,
            padding: "11px 13px",
            marginBottom: 14,
          }}
        >
          <div>
            <div style={{ fontWeight: 700, fontSize: 13.5 }}>
              {avail ? "Accepting guests today" : "Paused — not accepting"}
            </div>
            <div style={{ fontSize: 11, color: "var(--muted)" }}>
              {avail ? "You appear in staff recommendations" : "Hidden from new recommendations"}
            </div>
          </div>
          <button
            onClick={onToggleAvail}
            style={{
              width: 50,
              height: 28,
              borderRadius: 99,
              background: avail ? "var(--ok)" : "#c7cecd",
              position: "relative",
              flex: "none",
            }}
          >
            <span
              style={{
                position: "absolute",
                top: 3,
                left: avail ? undefined : 3,
                right: avail ? 3 : undefined,
                width: 22,
                height: 22,
                borderRadius: "50%",
                background: "#fff",
                boxShadow: "0 1px 3px rgba(0,0,0,.3)",
              }}
            />
          </button>
        </div>

        {/* stat tiles */}
        <div style={{ display: "flex", gap: 9, marginBottom: 9 }}>
          <div style={tile}>
            <div style={{ fontSize: 22, fontWeight: 800, color: "var(--primary-d)" }}>{s.leads}</div>
            <div style={{ fontSize: 10.5, color: "var(--muted)" }}>leads · 30d</div>
          </div>
          <div style={tile}>
            <div style={{ fontSize: 22, fontWeight: 800, color: "var(--primary-d)" }}>{s.visits}</div>
            <div style={{ fontSize: 10.5, color: "var(--muted)" }}>visits</div>
          </div>
          <div style={tile}>
            <div style={{ fontSize: 22, fontWeight: 800, color: "var(--primary-d)" }}>{s.conv}%</div>
            <div style={{ fontSize: 10.5, color: "var(--muted)" }}>conversion</div>
          </div>
        </div>

        {/* revenue */}
        <div
          style={{
            background: "var(--accent-l)",
            borderRadius: 12,
            padding: "12px 13px",
            marginBottom: 14,
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
          }}
        >
          <div>
            <div style={{ fontSize: 11, color: "var(--accent)", fontWeight: 700, textTransform: "uppercase", letterSpacing: ".3px" }}>
              Revenue via LOMA · 30d
            </div>
            <div style={{ fontSize: 22, fontWeight: 800, color: "var(--accent)" }}>{fmtBk(s.revenue)}</div>
          </div>
          <div style={{ fontSize: 13, color: "var(--accent)" }}>{avgR.toFixed(1)} ★</div>
        </div>

        <div className="h-sec">Your LOMA scores</div>
        <div style={{ display: "flex", gap: 14, flexWrap: "wrap" }}>
          <ScoreBadge label="Quality" v={p.quality} />
          <ScoreBadge label="Locality" v={p.locality} />
          <ScoreBadge label="Readiness" v={p.readiness} />
          <ScoreBadge label="Safety" v={p.safety} />
        </div>
        <div style={{ fontSize: 11.5, color: "var(--muted)", marginTop: 8 }}>
          Overall LOMA score <b style={{ color: "var(--primary-d)" }}>{provScore(p)}</b> — higher
          scores rank you above similar providers.
        </div>

        <div className="h-sec">Who recommends you</div>
        {partners.slice(0, 4).map((pt) => (
          <div className="lead-row" key={pt.name}>
            <div className="ds">{provInit(pt.name).slice(0, 3)}</div>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 13.5, fontWeight: 600 }}>{pt.name}</div>
              <div style={{ fontSize: 11.5, color: "var(--muted)" }}>
                {pt.leads} leads · {pt.visits} visits
              </div>
            </div>
            <div style={{ fontSize: 11, color: "var(--primary)", fontWeight: 700 }}>🤝</div>
          </div>
        ))}
        <div style={{ fontSize: 11.5, color: "var(--muted)", marginTop: 8 }}>
          Tip: a quick thank-you to your top partners keeps the leads coming.
        </div>

        <div style={{ marginTop: 16 }}>
          <button className="btn btn-primary" onClick={() => onGo("confirm")}>
            <Icon name="check" size={16} /> Confirm a tourist visit
          </button>
        </div>
        <div style={{ height: 6 }} />
      </div>
    </>
  );
}
