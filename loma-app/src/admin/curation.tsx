// LOMA v2 · AI-curation admin sections.
// Seven new admin views ported from the prototype's apCandidates / apShortlist /
// apQueue / apApproved / apCommunities / apImpact / apEcon, running over our REAL
// scored providers (activePicks → .ai AiScore). Admin approvals are held in a
// React context of status overrides so cards visibly move between buckets.
import {
  createContext,
  useCallback,
  useContext,
  useState,
  type ReactNode,
} from "react";
import "../components/ai.css";
import "./curation.css";
import Icon from "../components/Icon";
import type { IconName } from "../types";
import { LomaBadges, AiBox, ScoreBars } from "../components/AiScorePanel";
import type { Pick } from "../picks";
import type { AiScore, ProviderStatus } from "../scoring";
import { STATUS_LABEL, SRC_LABEL } from "../scoring";
import { activePick } from "../activeAccount";
import { useVersion } from "../store";
import {
  impactCredits,
  hotelTier,
  countEv,
  flaggedCount,
  topCreditProviders,
  leaderboard,
} from "../impact";
import { econRows, econTotals, bahtF, type EconTier } from "../econ";
import {
  SOURCE_TYPES,
  SRC_NOTE,
  STATUS_COLOR,
  QUEUE_REASONS,
  hiddenGems,
  candidatesBySource,
  srcCount,
  reviewQueue,
  queueReason,
  readinessLevel,
  verifiedProviders,
  communityExperiences,
  type StatusOf,
} from "./pipeline";

// ---------- approvals context ----------
type Override = "verified" | "rejected" | "suspended" | "needs_human_review";

interface CurationCtx {
  statusOf: StatusOf;
  act: (id: string, s: Override) => void;
  refresh: () => void;
}
const Ctx = createContext<CurationCtx | null>(null);

function useCuration(): CurationCtx {
  const c = useContext(Ctx);
  if (!c) throw new Error("CurationProvider missing");
  return c;
}

/** Holds the session's admin overrides. Wrap the admin panel with this. */
export function CurationProvider({ children }: { children: ReactNode }) {
  const [ovr, setOvr] = useState<Record<string, Override>>({});
  const [, setTick] = useState(0);
  const statusOf = useCallback<StatusOf>(
    (p) => ovr[p.id] ?? p.ai.status,
    [ovr]
  );
  const act = useCallback(
    (id: string, s: Override) => setOvr((o) => ({ ...o, [id]: s })),
    []
  );
  // AI Refresh: scores are deterministic, so re-reading yields the same result —
  // this just forces a re-render, mirroring the prototype's aiRefresh().
  const refresh = useCallback(() => setTick((t) => t + 1), []);
  return <Ctx.Provider value={{ statusOf, act, refresh }}>{children}</Ctx.Provider>;
}

// ---------- shared primitives ----------
function MetricCard({
  label,
  icon,
  bg,
  num,
}: {
  label: string;
  icon: IconName;
  bg: string;
  num: string;
}) {
  return (
    <div className="mcard">
      <div className="lab">
        <span className="i" style={{ background: bg }}>
          <Icon name={icon} size={14} />
        </span>
        {label}
      </div>
      <div className="num">{num}</div>
    </div>
  );
}

const FRESH: Record<string, [string, string]> = {
  fresh: ["b-ready", "🟢 Fresh"],
  needs_refresh: ["b-price", "🟡 Needs refresh"],
  stale: ["b-warn", "🔴 Stale"],
};
const SIGNAL: Record<string, string> = {
  improving: "↗ improving",
  stable: "→ stable",
  declining: "↘ declining",
  risk_detected: "⚠ risk detected",
};

function FreshPill({ ai }: { ai: AiScore }) {
  const [cls, lbl] = FRESH[ai.freshness_status];
  return (
    <div className="freshpills">
      <span className={"badge " + cls}>{lbl}</span>
      <span className="badge b-price">Checked {ai.last_checked_at}</span>
      <span
        className={
          "badge " + (ai.review_signal_status === "risk_detected" ? "b-warn" : "b-price")
        }
      >
        {SIGNAL[ai.review_signal_status]}
      </span>
    </div>
  );
}

/** Admin provider card with the full scoring breakdown. Status reflects overrides. */
function AiCard({ pick, actions }: { pick: Pick; actions: ReactNode }) {
  const { statusOf } = useCuration();
  const ai = pick.ai;
  const status: ProviderStatus = statusOf(pick);
  const banner = pick.img
    ? {
        backgroundImage: `url(${pick.img})`,
        backgroundSize: "cover" as const,
        backgroundPosition: "center" as const,
      }
    : undefined;
  return (
    <div className="vcard">
      <div className="vbanner" style={banner}>
        {pick.img ? "" : pick.emo}
      </div>
      <div className="vh">
        <div>
          <h3>
            {pick.emo} {pick.name}
          </h3>
          <div className="cat">
            {ai.loma_cat} · {pick.area} · {pick.rating || "—"}★ {pick.reviews || 0}{" "}
            reviews
          </div>
        </div>
        <span className={"badge " + STATUS_COLOR[status]}>{STATUS_LABEL[status]}</span>
      </div>
      <div className="cbadges">
        <LomaBadges ai={ai} score />
        <span className="badge b-price">{SRC_LABEL[ai.source_type]}</span>
      </div>
      <AiBox ai={ai} />
      <ScoreBars ai={ai} />
      <FreshPill ai={ai} />
      {ai.risk_flags.length > 0 && (
        <div className="riskflags">
          <b>Risk flags:</b> {ai.risk_flags.map((f) => f[0]).join(" · ")}
        </div>
      )}
      <div className="vact">{actions}</div>
    </div>
  );
}

// ---------- 1 · Provider candidates ----------
export function CandidatesView() {
  const { statusOf, act } = useCuration();
  const [src, setSrc] = useState(SOURCE_TYPES[0]);
  const list = candidatesBySource(src, statusOf)
    .sort((a, b) => b.ai.overall_loma_score - a.ai.overall_loma_score)
    .slice(0, 10);
  return (
    <>
      <div style={{ marginBottom: 12, fontSize: 13, color: "var(--ink-2)" }}>
        Providers enter LOMA through four channels. AI-discovered and self-registered
        candidates <b>must</b> pass the human queue before they go live.
      </div>
      <div className="chips" style={{ marginBottom: 14 }}>
        {SOURCE_TYPES.map((s) => (
          <button
            key={s}
            className={"chip " + (src === s ? "on" : "")}
            onClick={() => setSrc(s)}
          >
            {SRC_LABEL[s]} · {srcCount(s, statusOf)}
          </button>
        ))}
      </div>
      <div className="modehint" style={{ marginBottom: 14 }}>
        ℹ️ {SRC_NOTE[src]}
      </div>
      {list.length ? (
        <div className="vqueue">
          {list.map((p) => (
            <AiCard
              key={p.id}
              pick={p}
              actions={
                <>
                  <button
                    className="btn btn-primary btn-sm"
                    style={{ flex: 1 }}
                    onClick={() => act(p.id, "verified")}
                  >
                    <Icon name="check" size={14} /> Approve &amp; publish
                  </button>
                  <button
                    className="btn btn-line btn-sm"
                    style={{ flex: 1 }}
                    onClick={() => act(p.id, "rejected")}
                  >
                    Reject
                  </button>
                </>
              }
            />
          ))}
        </div>
      ) : (
        <div style={{ textAlign: "center", padding: 40, color: "var(--muted)" }}>
          No open candidates from this channel.
        </div>
      )}
    </>
  );
}

// ---------- 2 · AI shortlist (Hidden Gems) ----------
export function ShortlistView() {
  const { statusOf, act, refresh } = useCuration();
  const all = hiddenGems();
  const gems = all.filter((p) => statusOf(p) !== "verified").slice(0, 10);
  const avg = Math.round(
    all.reduce((s, p) => s + p.ai.overall_loma_score, 0) / Math.max(1, all.length)
  );
  return (
    <>
      <div className="gemhead">
        <div>
          <b>💎 Quality under-discovered — not just popular.</b>
          <br />
          <span>
            A Hidden Gem needs high locality + strong quality + a real visibility gap +
            acceptable readiness + a clean risk filter. Popularity alone earns nothing.
          </span>
        </div>
        <button
          className="btn btn-line btn-sm"
          style={{ width: "auto", whiteSpace: "nowrap" }}
          onClick={refresh}
        >
          <Icon name="spark" size={14} /> AI Refresh
        </button>
      </div>
      <div className="cards6" style={{ marginBottom: 16 }}>
        <MetricCard label="Hidden gems found" icon="spark" bg="#E0663C" num={String(all.length)} />
        <MetricCard label="Awaiting approval" icon="check" bg="#2563B0" num={String(gems.length)} />
        <MetricCard label="Avg LOMA score" icon="star" bg="#0F766E" num={String(avg)} />
      </div>
      <div className="vqueue">
        {gems.map((p) => (
          <AiCard
            key={p.id}
            pick={p}
            actions={
              <>
                <button
                  className="btn btn-primary btn-sm"
                  style={{ flex: 1 }}
                  onClick={() => act(p.id, "verified")}
                >
                  <Icon name="check" size={14} /> Approve &amp; publish
                </button>
                <button
                  className="btn btn-line btn-sm"
                  style={{ flex: 1 }}
                  onClick={() => act(p.id, "needs_human_review")}
                >
                  Send to human review
                </button>
              </>
            }
          />
        ))}
      </div>
    </>
  );
}

// ---------- 3 · Review queue & refresh ----------
export function QueueView() {
  const { statusOf, act, refresh } = useCuration();
  const [filter, setFilter] = useState<(typeof QUEUE_REASONS)[number]>("All");
  const q = reviewQueue(statusOf);
  const byReason = (r: string) => q.filter((p) => queueReason(p)[0] === r);
  const list = (filter === "All" ? q : byReason(filter)).slice(0, 10);
  return (
    <>
      <div className="modehint" style={{ marginBottom: 14 }}>
        🔄 <b>Freshness loop:</b> Detect → Score → Shortlist → Verify → Publish →
        Monitor → <b>Refresh</b>. New businesses appear constantly, so every live
        provider is re-scored on a schedule. This queue is what humans actually touch.
      </div>
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          gap: 10,
          marginBottom: 12,
        }}
      >
        <div className="chips" style={{ margin: 0 }}>
          {QUEUE_REASONS.map((r) => (
            <button
              key={r}
              className={"chip " + (filter === r ? "on" : "")}
              onClick={() => setFilter(r)}
            >
              {r} · {r === "All" ? q.length : byReason(r).length}
            </button>
          ))}
        </div>
        <button
          className="btn btn-coral btn-sm"
          style={{ width: "auto", whiteSpace: "nowrap" }}
          onClick={refresh}
        >
          <Icon name="spark" size={14} /> AI Refresh all scores
        </button>
      </div>
      {list.length ? (
        <div className="vqueue">
          {list.map((p) => (
            <AiCard
              key={p.id}
              pick={p}
              actions={
                <>
                  <button
                    className="btn btn-primary btn-sm"
                    style={{ flex: 1 }}
                    onClick={() => act(p.id, "verified")}
                  >
                    <Icon name="check" size={14} /> Keep live
                  </button>
                  <button
                    className="btn btn-line btn-sm"
                    style={{ flex: 1 }}
                    onClick={() => act(p.id, "suspended")}
                  >
                    Suspend
                  </button>
                </>
              }
            />
          ))}
        </div>
      ) : (
        <div style={{ textAlign: "center", padding: 40, color: "var(--muted)" }}>
          Nothing in this bucket — the catalogue is fresh.
        </div>
      )}
    </>
  );
}

// ---------- 4 · Approved providers ----------
export function ApprovedView() {
  const { statusOf, act } = useCuration();
  const live = verifiedProviders(statusOf);
  return (
    <>
      <div style={{ marginBottom: 12, fontSize: 13, color: "var(--ink-2)" }}>
        <b>{live.length}</b> providers are live in LOMA and can be recommended by hotels
        right now.
      </div>
      <div className="vqueue">
        {live.slice(0, 10).map((p) => (
          <AiCard
            key={p.id}
            pick={p}
            actions={
              <>
                <button
                  className="btn btn-line btn-sm"
                  style={{ flex: 1 }}
                  onClick={() => act(p.id, "needs_human_review")}
                >
                  Send to review queue
                </button>
                <button
                  className="btn btn-line btn-sm"
                  style={{ flex: 1 }}
                  onClick={() => act(p.id, "suspended")}
                >
                  Suspend
                </button>
              </>
            }
          />
        ))}
      </div>
    </>
  );
}

// ---------- 5 · Community experiences ----------
const READINESS_LEVELS = [
  "Information Only",
  "Contactable",
  "Ready to Recommend",
  "Verified Community Experience",
];
const READY_BADGE = ["b-price", "b-price", "b-ready", "b-verified"];

export function CommunitiesView() {
  const { statusOf, act } = useCuration();
  const cs = communityExperiences(statusOf);
  const cnt = (l: number) => cs.filter((p) => readinessLevel(p, statusOf) === l).length;
  const colors = ["#8A94A6", "#2563B0", "#0F766E", "#1F9D5B"];
  return (
    <>
      <div className="modehint" style={{ marginBottom: 14 }}>
        🛶 Community experiences are <b>planned experiences</b>, not walk-in shops. They
        are never sold as “Book Now” — tourists always <b>contact the community to
        confirm availability</b> first.
      </div>
      <div className="cards6" style={{ marginBottom: 16 }}>
        {READINESS_LEVELS.slice(0, 3).map((l, i) => (
          <MetricCard key={l} label={l} icon="check" bg={colors[i]} num={String(cnt(i))} />
        ))}
      </div>
      <div className="vqueue">
        {cs.slice(0, 10).map((p) => {
          const lvl = readinessLevel(p, statusOf);
          return (
            <AiCard
              key={p.id}
              pick={p}
              actions={
                <>
                  <span className={"badge readylevel " + READY_BADGE[lvl]}>
                    {READINESS_LEVELS[lvl]}
                  </span>
                  <button
                    className="btn btn-line btn-sm"
                    style={{ flex: 1 }}
                    onClick={() => act(p.id, "verified")}
                  >
                    <Icon name="check" size={14} /> Mark verified
                  </button>
                </>
              }
            />
          );
        })}
      </div>
    </>
  );
}

// ---------- 6 · Impact & hotel credits ----------
export function ImpactView() {
  useVersion(); // re-read the mutable impact engine
  const c = impactCredits();
  const tier = hotelTier(c);
  const flagged = flaggedCount();
  return (
    <>
      <div className="cards6" style={{ marginBottom: 16 }}>
        <MetricCard label="QR scans" icon="qr" bg="#2563B0" num={String(countEv("qr_scanned"))} />
        <MetricCard
          label="Provider cards viewed"
          icon="user"
          bg="#0F766E"
          num={String(countEv("provider_card_viewed"))}
        />
        <MetricCard
          label="Direction / contact clicks"
          icon="nav"
          bg="#1aa093"
          num={String(countEv("direction_clicked") + countEv("contact_clicked"))}
        />
        <MetricCard
          label="Community inquiries"
          icon="spark"
          bg="#E0663C"
          num={String(countEv("community_inquiry_clicked"))}
        />
        <MetricCard
          label="Confirmed visits"
          icon="check"
          bg="#1F9D5B"
          num={String(countEv("provider_confirmed_visit"))}
        />
        <MetricCard label={`Hotel impact credits · ${tier[0]}`} icon="star" bg="#C9821E" num={String(c)} />
      </div>
      <div className="modehint" style={{ marginBottom: 14 }}>
        🛡 <b>Anti-gaming:</b> {flagged} repeat event{flagged === 1 ? "" : "s"} from the
        same tourist session were detected and <b>not credited</b>. Generating a QR alone
        earns almost nothing — credits require a real tourist action. Complaints subtract
        points. <b>No hidden commission anywhere in the system.</b>
      </div>
      <div className="acard">
        <h3 style={{ fontSize: 15, marginBottom: 10 }}>
          Provider exposure — where the credits went
        </h3>
        {topCreditProviders(6).map(({ id, c: cr }) => {
          const p = activePick(id);
          return (
            <div className="lbrow" key={id}>
              <div className="nm">
                {p ? `${p.emo} ${p.name}` : id}{" "}
                <span style={{ fontWeight: 500, color: "var(--muted)", fontSize: 11.5 }}>
                  · {p?.ai.loma_cat}
                  {p?.ai.is_hidden_gem ? " · 💎" : ""}
                </span>
              </div>
              <div className="c">{cr} cr</div>
            </div>
          );
        })}
      </div>
      <div className="acard" style={{ marginTop: 14 }}>
        <h3 style={{ fontSize: 15, marginBottom: 10 }}>
          Demand partner leaderboard — Total Local Impact
        </h3>
        {leaderboard().map((r, i) => (
          <div className={"lbrow " + (r.me ? "me" : "")} key={r.name}>
            <div className="r">{i + 1}</div>
            <div className="nm">
              {r.name}
              <span style={{ fontWeight: 500, color: "var(--muted)", fontSize: 11.5 }}>
                {" "}
                · {r.type}
              </span>
            </div>
            <div className="c">{r.credits} cr</div>
          </div>
        ))}
        <div style={{ fontSize: 11, color: "var(--muted)", marginTop: 9 }}>
          Impact per 100 room-nights is not shown — room-night data is not yet collected.
          Ranking uses total Local Impact credits.
        </div>
      </div>
    </>
  );
}

// ---------- 7 · Economic impact · method ----------
const ECON_TIER: Record<EconTier, [string, string, string, ReactNode]> = {
  exact: [
    "Exact",
    "#1F9D5B",
    "b-ready",
    <>
      Community programmes have a <b>published price per person</b>. Bookings give us pax
      × that price. <b>No shop input needed. No estimation.</b>
    </>,
  ],
  declared: [
    "Declared",
    "#2563B0",
    "b-verified",
    <>
      The provider gave us a <b>price band at onboarding</b> (e.g. ฿150–350). A confirmed
      visit × the midpoint. <b>No shop input needed at the till.</b>
    </>,
  ],
  benchmark: [
    "Benchmark",
    "#C9821E",
    "b-warn",
    <>
      No price on file yet. We fall back to a <b>category benchmark</b>. Lowest confidence
      — and the only tier we want to shrink.
    </>,
  ],
};

export function EconView() {
  useVersion(); // re-read the mutable econ engine
  const t = econTotals();
  const rows = econRows();
  const counts: Record<EconTier, number> = { exact: t.nx, declared: t.nd, benchmark: t.nb };
  const Bar = ({ k }: { k: EconTier }) => {
    const v = t[k];
    const pct = t.total ? Math.round((v / t.total) * 100) : 0;
    const [label, color, cls, note] = ECON_TIER[k];
    const n = counts[k];
    return (
      <div style={{ marginBottom: 12 }}>
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "baseline",
            marginBottom: 5,
          }}
        >
          <div style={{ fontSize: 13, fontWeight: 700, color: "var(--ink)" }}>
            <span className={"badge " + cls}>{label}</span>{" "}
            <span style={{ fontWeight: 500, color: "var(--muted)", fontSize: 11.5 }}>
              {n} record{n === 1 ? "" : "s"}
            </span>
          </div>
          <div style={{ fontSize: 14, fontWeight: 800, color: "var(--ink)" }}>
            {bahtF(v)}{" "}
            <span style={{ fontSize: 11, color: "var(--muted)", fontWeight: 600 }}>
              · {pct}%
            </span>
          </div>
        </div>
        <div
          style={{
            height: 9,
            borderRadius: 99,
            background: "var(--surface-2)",
            overflow: "hidden",
          }}
        >
          <i
            style={{
              display: "block",
              height: "100%",
              width: `${pct}%`,
              background: color,
              borderRadius: 99,
            }}
          />
        </div>
        <div
          style={{ fontSize: 11.5, color: "var(--ink-2)", marginTop: 6, lineHeight: 1.5 }}
        >
          {note}
        </div>
      </div>
    );
  };
  return (
    <>
      <div className="gemhead" style={{ alignItems: "flex-start" }}>
        <div>
          <b>💰 We never depend on a shop typing a number.</b>
          <br />
          <span>
            Self-reported spend is optional, unverifiable and gameable — so we do not
            build the impact figure on it. Every baht below is derived from a price the
            provider <b>already published or declared at onboarding</b>, multiplied by an
            action we <b>observed</b> (a booking, or a confirmed visit).
          </span>
        </div>
      </div>
      <div className="cards6" style={{ marginBottom: 16 }}>
        <MetricCard
          label="Estimated Local Economic Impact"
          icon="spark"
          bg="#C9821E"
          num={bahtF(t.total)}
        />
        <MetricCard
          label="Needs zero shop cooperation"
          icon="check"
          bg="#1F9D5B"
          num={t.noShopInput + "%"}
        />
        <MetricCard
          label="Confirmed visits observed"
          icon="check"
          bg="#2563B0"
          num={String(countEv("provider_confirmed_visit"))}
        />
      </div>
      <div className="acard" style={{ marginBottom: 14 }}>
        <h3 style={{ fontSize: 15, marginBottom: 6 }}>A booking is not a visit</h3>
        <div
          style={{
            fontSize: 12.5,
            color: "var(--ink-2)",
            lineHeight: 1.6,
            marginBottom: 10,
          }}
        >
          A community round can be booked and then no-showed. We count <b>฿0</b> until the
          community host <b>scans the guest in</b>. That is why the host has a check-in
          screen — and why our figure is lower than a booking-based one, on purpose.
        </div>
        <div className="mtiles" style={{ gridTemplateColumns: "1fr 1fr 1fr" }}>
          <div className="mtile">
            <div className="v">{t.nx}</div>
            <div className="k">Checked in · counted</div>
          </div>
          <div className="mtile">
            <div className="v" style={{ color: "var(--muted)" }}>
              {t.pendingBookings}
            </div>
            <div className="k">
              Booked, not yet checked in · {bahtF(t.pendingBaht)} <b>not</b> counted
            </div>
          </div>
          <div className="mtile">
            <div className="v" style={{ color: "var(--muted)" }}>
              {t.noshows}
            </div>
            <div className="k">No-shows · ฿0 counted</div>
          </div>
        </div>
      </div>
      <div className="acard" style={{ marginBottom: 14 }}>
        <h3 style={{ fontSize: 15, marginBottom: 12 }}>Where every baht comes from</h3>
        <Bar k="exact" />
        <Bar k="declared" />
        <Bar k="benchmark" />
        <div
          style={{
            borderTop: "1px solid var(--line)",
            marginTop: 6,
            paddingTop: 11,
            fontSize: 12.5,
            color: "var(--ink-2)",
            lineHeight: 1.6,
          }}
        >
          <b>Formula.</b> Impact = Σ (observed action × published or declared price).
          Community bookings use the exact programme price. Confirmed visits use the
          provider's declared band. Only providers with no price on file fall back to a
          category benchmark — and the fix for those is <b>onboarding data, not shop
          honesty</b>.
        </div>
      </div>
      <div className="acard">
        <h3 style={{ fontSize: 15, marginBottom: 10 }}>
          Audit trail — every record, and how it was valued
        </h3>
        {rows.length ? (
          rows.slice(0, 10).map((r, i) => (
            <div className="lbrow" key={i}>
              <span className={"badge " + ECON_TIER[r.tier][2]} style={{ flex: "none" }}>
                {ECON_TIER[r.tier][0]}
              </span>
              <div className="nm">
                {r.name}
                <span style={{ fontWeight: 500, color: "var(--muted)", fontSize: 11.5 }}>
                  {" "}
                  · {r.note}
                </span>
              </div>
              <div className="c">{bahtF(r.baht)}</div>
            </div>
          ))
        ) : (
          <div style={{ color: "var(--muted)", fontSize: 13, padding: "18px 0" }}>
            No confirmed visits or community bookings yet in this session.
          </div>
        )}
        <div style={{ fontSize: 11, color: "var(--muted)", marginTop: 10 }}>
          All figures are labelled <b>Estimated Local Economic Impact</b> — never
          presented as measured revenue.
        </div>
      </div>
    </>
  );
}
