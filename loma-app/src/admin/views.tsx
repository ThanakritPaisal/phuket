import type { ReactNode } from "react";
import KpiTiles, { type Metric } from "./KpiTiles";
import BarChart from "./BarChart";
import LineChart from "./LineChart";
import RingStat from "./RingStat";
import Funnel from "./Funnel";
import PhuketMap from "./PhuketMap";
import OperatorsTable from "./OperatorsTable";
import StaffTable from "./StaffTable";
import RecommendationsTable from "./RecommendationsTable";
import TransactionsTable from "./TransactionsTable";
import {
  DASH,
  OPS,
  STF,
  TUR,
  TX,
  fmtB,
  fmtBk,
  pct,
  topLeadRows,
  underexposedRows,
  partnerAggs,
  categoryAggs,
  recsByArea,
  monthlyTrend,
  concentration,
  monitoredCount,
  verifyQueue,
  staffLeaderboard,
  SELF_DEAL,
} from "./helpers";

function Box({
  title,
  hint,
  extra,
  children,
  style,
}: {
  title?: ReactNode;
  hint?: ReactNode;
  extra?: ReactNode;
  children: ReactNode;
  style?: React.CSSProperties;
}) {
  return (
    <div className="box" style={style}>
      {title && (
        <h3>
          {title} {extra}
        </h3>
      )}
      {hint && <div className="hint">{hint}</div>}
      {children}
    </div>
  );
}

// ---------- 1. Overview ----------
export function OverviewView() {
  const metrics: Metric[] = [
    { label: "Recommendations", icon: "share", bg: "#0F766E", value: DASH.recs.toLocaleString(), delta: "12%" },
    { label: "Tourist card opens", icon: "user", bg: "#2563B0", value: DASH.opens.toLocaleString(), delta: "9%" },
    { label: "Direction / contact clicks", icon: "nav", bg: "#1aa093", value: DASH.dirs.toLocaleString(), delta: "15%" },
    { label: "Confirmed visits", icon: "check", bg: "#1F9D5B", value: DASH.visits.toLocaleString(), delta: "7%" },
    { label: "Reported spend", icon: "spark", bg: "#E08A3C", value: fmtBk(DASH.spend), delta: "11%" },
    { label: "Local economic impact", icon: "spark", bg: "#C9821E", value: fmtBk(DASH.impact), delta: "" },
  ];
  const topVenues = partnerAggs()
    .slice(0, 5)
    .map((p) => [p.venue, p.recs] as [string, number]);
  const selfServe: [string, number][] = [
    ["🧑‍💼 Staff-shared", Math.round(DASH.recs * 0.74)],
    ["📱 Self-serve QR scan", Math.round(DASH.recs * 0.26)],
  ];
  const partnerType: [string, number][] = [
    ["Guesthouse", 38],
    ["Hostel", 31],
    ["Villa / Airbnb", 22],
    ["Small hotel", 19],
    ["Taxi sticker", 12],
  ];
  const pending = OPS.filter((o) => o.vettingStatus === "pending").length;
  const needsReview = OPS.filter((o) => o.vettingStatus === "needs review").length;
  const verified = OPS.filter((o) => o.verified).length;

  return (
    <>
      <KpiTiles metrics={metrics} columns={3} />

      <Box
        title="Recommendation & visit trend"
        hint="Monthly recommendations and confirmed local visits across the pilot."
        style={{ marginTop: 14 }}
      >
        <LineChart data={monthlyTrend()} />
      </Box>

      <div className="grid12">
        <Box
          title="Recommendation → impact funnel"
          hint="Where tourists drop off between a recommendation and a confirmed local visit."
        >
          <Funnel />
        </Box>
        <Box
          title="Top local providers by leads"
          hint="Which providers receive the most tourist traffic."
        >
          <BarChart rows={topLeadRows(5)} />
        </Box>
      </div>

      <div className="grid2">
        <Box
          title="Demand partner usage"
          hint="Which hotels & rentals recommend the most."
        >
          <BarChart rows={topVenues} variant="a" />
        </Box>
        <Box title="Satisfaction & alerts" hint="Tourist feedback after visits.">
          <div style={{ display: "flex", alignItems: "center", gap: 14, margin: "6px 0 14px" }}>
            <div style={{ fontSize: 38, fontWeight: 800, color: "var(--primary-d)" }}>
              {DASH.avgRating.toFixed(1)}
            </div>
            <div>
              <div className="starrow">★★★★★</div>
              <div style={{ fontSize: 12, color: "var(--muted)" }}>
                {DASH.ratingsN.toLocaleString()} ratings · {pct(DASH.positive)} positive
              </div>
            </div>
          </div>
          <div style={{ fontSize: 12.5 }}>
            <div className="alertrow">
              <span>⚠ Pending verification × {pending}</span>
              <span className="tinybadge under">Queue</span>
            </div>
            <div className="alertrow">
              <span>⚠ Needs review × {needsReview}</span>
              <span className="tinybadge under">Review</span>
            </div>
            <div className="alertrow" style={{ borderBottom: "none" }}>
              <span>
                ✓ Verified providers {verified}/{OPS.length}
              </span>
              <span className="tinybadge hot">Clear</span>
            </div>
          </div>
        </Box>
      </div>

      <div className="grid2">
        <Box
          title="Recommendation channel"
          hint="Staff-shared at the counter vs. tourist self-serve QR scans."
        >
          <BarChart rows={selfServe} />
          <div style={{ fontSize: 11.5, color: "var(--muted)", marginTop: 10 }}>
            ~26% of recommendations now come from unattended counters — proof the QR
            fills the gap when no staff is free.
          </div>
        </Box>
        <Box title="Self-serve by partner type" hint="Where the scan QR matters most.">
          <BarChart rows={partnerType} variant="a" />
        </Box>
      </div>
    </>
  );
}

// ---------- 2. Funnel ----------
export function FunnelView() {
  const t = DASH.recs || 1;
  const openPc = Math.round((DASH.opens / t) * 100);
  const visPc = Math.round((DASH.visits / t) * 100);
  const spendOfVisit = DASH.visits
    ? Math.round((DASH.spent / DASH.visits) * 100)
    : 0;
  return (
    <>
      <div className="grid2" style={{ marginTop: 0 }}>
        <RingCard
          label="Card open rate"
          value={DASH.opens / t}
          sub="of recs"
        />
        <RingCard
          label="Visit conversion"
          value={DASH.visits / t}
          sub="of recs"
          color="var(--accent)"
        />
      </div>
      <Box style={{ maxWidth: 720, marginTop: 14 }}>
        <Funnel />
        <div
          style={{
            marginTop: 18,
            fontSize: 12.5,
            color: "var(--ink-2)",
            lineHeight: 1.7,
          }}
        >
          <b>Read:</b> {openPc}% of tourists open the card — strong, because it needs
          no app. {visPc}% of recommendations turn into a confirmed local visit, and
          ~{spendOfVisit}% of confirmed visits log a spend amount. Total reported spend{" "}
          {fmtB(DASH.spend)} → estimated local economic impact {fmtB(DASH.impact)}{" "}
          (commission to partners {fmtB(DASH.commission)}).
        </div>
      </Box>
    </>
  );
}

function RingCard({
  label,
  value,
  sub,
  color,
}: {
  label: string;
  value: number;
  sub?: string;
  color?: string;
}) {
  return (
    <div className="box" style={{ display: "flex", justifyContent: "center" }}>
      <RingStat value={value} label={label} sub={sub} color={color} />
    </div>
  );
}

// ---------- 3. Providers ----------
export function ProvidersView() {
  return (
    <>
      <div className="infonote">
        ℹ️ Lead counts are internal impact metrics for reporting — they do <b>not</b>{" "}
        affect a provider's ranking, and are never shown to businesses. This is what
        removes the incentive to spam recommendations.
      </div>
      <div className="grid2" style={{ marginTop: 0 }}>
        <Box title="🔥 Providers receiving the most leads" hint="Healthy demand.">
          <BarChart rows={topLeadRows(4)} />
        </Box>
        <Box
          title="👀 Underexposed — need visibility"
          hint="Verified but receiving few leads. Surface these in staff results."
        >
          <BarChart rows={underexposedRows(4)} variant="a" />
        </Box>
      </div>
      <Box
        style={{ marginTop: 14 }}
        title="All providers"
        extra={
          <span style={{ fontWeight: 500, color: "var(--muted)", fontSize: 12 }}>
            (top 40 by leads · {OPS.length} total)
          </span>
        }
      >
        <OperatorsTable limit={40} />
      </Box>
    </>
  );
}

// ---------- 4. Partners ----------
export function PartnersView() {
  const list = partnerAggs();
  return (
    <>
      <Box
        title="Demand partner leaderboard"
        extra={
          <span style={{ fontWeight: 500, color: "var(--muted)", fontSize: 12 }}>
            ({list.length} venues)
          </span>
        }
        hint="Hotels, hostels, guesthouses & rental shops driving recommendations."
      >
        <table className="t">
          <thead>
            <tr>
              <th>Partner</th>
              <th>Type</th>
              <th>Area</th>
              <th>Recs</th>
              <th>Opens</th>
              <th>Confirmed visits</th>
              <th>Conversion</th>
            </tr>
          </thead>
          <tbody>
            {list.slice(0, 30).map((p) => (
              <tr key={p.venue}>
                <td>
                  <b>{p.venue}</b>
                </td>
                <td>{p.type}</td>
                <td>{p.area}</td>
                <td>{p.recs}</td>
                <td>{p.opens}</td>
                <td>{p.visits}</td>
                <td>
                  <span
                    className={
                      "tinybadge " + (p.visits / p.recs > 0.25 ? "hot" : "under")
                    }
                  >
                    {Math.round((p.visits / p.recs) * 100)}%
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </Box>
      <Box title="Recommendations by partner (top 12)" style={{ marginTop: 14 }}>
        <BarChart rows={list.slice(0, 12).map((p) => [p.venue, p.recs])} />
      </Box>
    </>
  );
}

// ---------- 5. Frontline staff ----------
export function StaffView() {
  const board = staffLeaderboard();
  const active = STF.filter((s) => s.active).length;
  const totalCommission = STF.reduce((s, x) => s + x.commissionTHB, 0);
  const avgConv =
    STF.reduce((s, x) => s + x.conversionRate, 0) / (STF.length || 1);
  const metrics: Metric[] = [
    { label: "Frontline staff", icon: "user", bg: "#2563B0", value: STF.length.toLocaleString(), delta: "" },
    { label: "Active this period", icon: "check", bg: "#1F9D5B", value: active.toLocaleString(), delta: "4%" },
    { label: "Avg conversion", icon: "spark", bg: "#0F766E", value: pct(avgConv), delta: "2%" },
    { label: "Commission earned", icon: "spark", bg: "#C9821E", value: fmtBk(totalCommission), delta: "11%" },
  ];
  return (
    <>
      <KpiTiles metrics={metrics} columns={4} />
      <Box title="Top staff by commission" style={{ marginTop: 14 }}>
        <BarChart
          rows={board.slice(0, 10).map((s) => [s.name, s.commissionTHB])}
        />
      </Box>
      <Box
        title="Frontline leaderboard"
        extra={
          <span style={{ fontWeight: 500, color: "var(--muted)", fontSize: 12 }}>
            ({STF.length} staff)
          </span>
        }
        style={{ marginTop: 14 }}
      >
        <StaffTable limit={30} />
      </Box>
    </>
  );
}

// ---------- 6. Category ----------
export function CategoryView() {
  const list = categoryAggs();
  return (
    <>
      <div className="grid2" style={{ marginTop: 0 }}>
        <Box
          title="Recommendations by category"
          hint="Demand split across local categories."
        >
          <BarChart
            rows={list.map((c) => [`${c.emo} ${c.cat}`, c.recs])}
          />
        </Box>
        <Box title="Confirmed visits by category">
          <BarChart
            rows={list
              .slice()
              .sort((a, b) => b.visits - a.visits)
              .map((c) => [`${c.emo} ${c.cat}`, c.visits])}
            variant="a"
          />
        </Box>
      </div>
      <Box title="Category performance" style={{ marginTop: 14 }}>
        <table className="t">
          <thead>
            <tr>
              <th>Category</th>
              <th>Recs</th>
              <th>Open rate</th>
              <th>Visit rate</th>
              <th>Avg spend</th>
              <th>Satisfaction</th>
            </tr>
          </thead>
          <tbody>
            {list.map((c) => (
              <tr key={c.cat}>
                <td>
                  <b>
                    {c.emo} {c.cat}
                  </b>
                </td>
                <td>{c.recs}</td>
                <td>{Math.round((c.opens / c.recs) * 100)}%</td>
                <td>{Math.round((c.visits / c.recs) * 100)}%</td>
                <td>{c.sp ? fmtB(c.spend / c.sp) : "—"}</td>
                <td>{c.rn ? (c.rsum / c.rn).toFixed(1) : "—"} ★</td>
              </tr>
            ))}
          </tbody>
        </table>
      </Box>
    </>
  );
}

// ---------- 7. Revenue & transactions ----------
export function RevenueView() {
  const avgSpend = TX.length ? DASH.spend / TX.length : 0;
  const commissionRate = DASH.spend ? DASH.commission / DASH.spend : 0;
  const byMethod = TX.reduce((m: Record<string, number>, t) => {
    m[t.paymentMethod] = (m[t.paymentMethod] || 0) + t.spendTHB;
    return m;
  }, {} as Record<string, number>);
  const methodRows = Object.entries(byMethod)
    .map(([k, v]) => [k, Math.round(v / 1000)] as [string, number])
    .sort((a, b) => b[1] - a[1]);
  const metrics: Metric[] = [
    { label: "Reported spend", icon: "spark", bg: "#0F766E", value: fmtBk(DASH.spend), delta: "11%" },
    { label: "Commission to partners", icon: "spark", bg: "#C9821E", value: fmtBk(DASH.commission), delta: "9%" },
    { label: "Local economic impact", icon: "spark", bg: "#1F9D5B", value: fmtBk(DASH.impact), delta: "13%" },
    { label: "Avg transaction", icon: "spark", bg: "#2563B0", value: fmtB(avgSpend), delta: "" },
  ];
  return (
    <>
      <KpiTiles metrics={metrics} columns={4} />
      <div className="grid2">
        <Box title="Where the money goes" hint="Spend split across the local economy.">
          <RingStat
            value={commissionRate}
            label="Commission share of spend"
            sub="of spend"
            color="var(--accent)"
          />
        </Box>
        <Box title="Spend by payment method">
          <BarChart rows={methodRows} variant="a" />
          <div style={{ fontSize: 11.5, color: "var(--muted)", marginTop: 10 }}>
            Totals shown in ฿ thousands.
          </div>
        </Box>
      </div>
      <Box
        title="Recent transactions"
        extra={
          <span style={{ fontWeight: 500, color: "var(--muted)", fontSize: 12 }}>
            ({TX.length} total)
          </span>
        }
        style={{ marginTop: 14 }}
      >
        <TransactionsTable limit={30} />
      </Box>
    </>
  );
}

// ---------- 8. Map ----------
export function MapView() {
  const sorted = recsByArea();
  return (
    <Box
      title="Recommendation density"
      hint="Where tourists are being sent across Phuket."
    >
      <PhuketMap />
      <div
        style={{
          display: "flex",
          gap: 20,
          marginTop: 14,
          flexWrap: "wrap",
          fontSize: 12.5,
          color: "var(--ink-2)",
        }}
      >
        {sorted.slice(0, 6).map(([a, v]) => (
          <span key={a}>
            ● {a} — {v} recs
          </span>
        ))}
      </div>
    </Box>
  );
}

// ---------- 9. Verification ----------
export function VerifyView() {
  const queue = verifyQueue(12);
  const pendingTotal = OPS.filter((o) => o.vettingStatus !== "verified").length;
  const boat = (cat: string) => /Boat|Sea/.test(cat);
  const statusMap: Record<string, string> = {
    pending: "vs-pending",
    "needs review": "vs-review",
    verified: "vs-verified",
  };
  return (
    <>
      <div style={{ marginBottom: 14, fontSize: 13, color: "var(--ink-2)" }}>
        {pendingTotal} providers awaiting verification. Boat / sea activities require
        extra safety & licensing checks before going live.
      </div>
      <div className="vqueue">
        {queue.map((o) => {
          const susp = boat(o.cat) && (o.safety ?? 100) < 72;
          const cl = susp
            ? "vs-susp"
            : statusMap[o.vettingStatus ?? "pending"] || "vs-pending";
          const lbl = susp
            ? "Needs review"
            : o.vettingStatus === "needs review"
            ? "Needs review"
            : (o.vettingStatus ?? "pending").charAt(0).toUpperCase() +
              (o.vettingStatus ?? "pending").slice(1);
          return (
            <div className="vcard" key={o.id}>
              <div className="vbanner">{o.emo}</div>
              <div className="vh">
                <div>
                  <h3>
                    {o.emo} {o.name}
                  </h3>
                  <div className="cat">
                    {o.cat} · {o.area}
                  </div>
                </div>
                <span className={"vstat " + cl}>{lbl}</span>
              </div>
              <div className="scores4">
                <Score v={o.locality} l="Locality" />
                <Score v={o.quality} l="Quality" />
                <Score v={o.readiness} l="Readiness" />
                <Score v={o.safety} l="Safety" />
              </div>
              <div className="evidence">
                <b>Evidence:</b> <a>Google reviews</a> ({o.rating} · {o.reviews}) ·{" "}
                {o.lang} · {o.booking}
                {susp ? " · ⚠ licensing & life-jacket evidence required" : ""}
              </div>
              <div className="vact">
                <button className="btn btn-primary btn-sm" style={{ flex: 1 }}>
                  Approve
                </button>
                <button className="btn btn-line btn-sm" style={{ flex: 1 }}>
                  Request info
                </button>
                <button className="btn btn-line btn-sm">Reject</button>
              </div>
            </div>
          );
        })}
      </div>
    </>
  );
}

function Score({ v, l }: { v: number; l: string }) {
  return (
    <div className="sc">
      <div className="sv">{v}</div>
      <div className="sl">{l}</div>
    </div>
  );
}

// ---------- 10. Partner approvals ----------
interface PartnerApp {
  display: string;
  type: string;
  area: string;
  submitted: string;
  status: "Under review" | "Needs info" | "Verified" | "Rejected";
  legalName: string;
  regNo: string;
  taxId: string;
  owner: string;
  phone: string;
  email: string;
  address: string;
  google: string;
  checks: [boolean, string][];
}
const PARTNER_APPS: PartnerApp[] = [
  {
    display: "Andaman View Guesthouse",
    type: "Guesthouse",
    area: "Karon",
    submitted: "Today 09:14",
    status: "Under review",
    legalName: "Andaman View Co., Ltd.",
    regNo: "0835559001234",
    taxId: "0835559001234",
    owner: "Pakorn Thongchai",
    phone: "+66 81 234 5678",
    email: "book@andamanview.co.th",
    address: "42/7 Karon Beach Rd, Karon, Phuket 83100",
    google: "g.page/andaman-view-guesthouse",
    checks: [
      [true, "Registered name matches DBD registry"],
      [true, "Business phone verified (OTP)"],
      [true, "Google Business Profile owner-claimed"],
      [true, "Email on a business domain"],
      [true, "Business licence / TAT certificate"],
      [true, "Owner ID card"],
      [true, "Storefront photo with signage"],
    ],
  },
  {
    display: "Kata Surf Hostel",
    type: "Hostel",
    area: "Kata",
    submitted: "Yesterday 16:40",
    status: "Needs info",
    legalName: "Kata Surf Hostel Partnership",
    regNo: "0835560004567",
    taxId: "0835560004567",
    owner: "Ratana P.",
    phone: "+66 89 555 1122",
    email: "stay@katasurf.com",
    address: "18 Kata Rd, Karon, Phuket 83100",
    google: "g.page/kata-surf-hostel",
    checks: [
      [true, "Registered name matches DBD registry"],
      [true, "Business phone verified (OTP)"],
      [false, "Google Business Profile owner-claimed"],
      [true, "Email on a business domain"],
      [false, "Business licence / TAT certificate"],
      [true, "Owner ID card"],
      [true, "Storefront photo with signage"],
    ],
  },
];
export function PartnerAppsView() {
  const pend = PARTNER_APPS.filter(
    (a) => a.status === "Under review" || a.status === "Needs info"
  );
  const chk = (ok: boolean, t: string) => (
    <div className="chkrow" key={t}>
      <span style={{ color: ok ? "var(--ok)" : "var(--warn)", fontWeight: 800 }}>
        {ok ? "✓" : "⚠"}
      </span>
      <span style={{ color: "var(--ink-2)" }}>{t}</span>
    </div>
  );
  const card = (a: PartnerApp) => (
    <div className="vcard" key={a.display}>
      <div className="vh">
        <div>
          <h3>{a.display}</h3>
          <div className="cat">
            {a.type} · {a.area} · applied {a.submitted}
          </div>
        </div>
        <span
          className={
            "vstat " +
            (a.status === "Verified"
              ? "vs-verified"
              : a.status === "Rejected"
              ? "vs-susp"
              : a.status === "Needs info"
              ? "vs-pending"
              : "vs-review")
          }
        >
          {a.status}
        </span>
      </div>
      <div className="evidence" style={{ marginTop: 12, lineHeight: 1.75 }}>
        <div>
          <b>Legal name:</b> {a.legalName}
        </div>
        <div>
          <b>Registration / licence:</b> {a.regNo}
        </div>
        <div>
          <b>Tax ID:</b> {a.taxId} · <b>Owner:</b> {a.owner}
        </div>
        <div>
          <b>Contact:</b> {a.phone} · {a.email}
        </div>
        <div>
          <b>Address:</b> {a.address}
        </div>
        <div>
          <b>Google:</b> <a>{a.google}</a>
        </div>
      </div>
      <div
        style={{
          marginTop: 11,
          borderTop: "1px solid var(--line-2)",
          paddingTop: 9,
        }}
      >
        {a.checks.map(([ok, t]) => chk(ok, t))}
      </div>
      <div className="vact">
        <button className="btn btn-primary btn-sm" style={{ flex: 1 }}>
          Approve & activate
        </button>
        <button className="btn btn-line btn-sm">Needs info</button>
        <button className="btn btn-line btn-sm">Reject</button>
      </div>
    </div>
  );
  return (
    <>
      <div style={{ marginBottom: 14, fontSize: 13, color: "var(--ink-2)" }}>
        {pend.length} business{pend.length === 1 ? "" : "es"} awaiting verification.
        Confirm identity &amp; ownership before activating — this is what stops anyone
        registering under a business they don't own.
      </div>
      <div className="vqueue">{pend.map(card)}</div>
    </>
  );
}

// ---------- 11. Integrity & fraud ----------
export function IntegrityView() {
  const conc = concentration();
  const flagged = conc.filter((c) => c.share >= 0.5).length;
  const metrics: Metric[] = [
    { label: "Self-dealing alerts", icon: "spark", bg: "#C2452F", value: String(SELF_DEAL.length), up: false },
    { label: "Concentration flags", icon: "spark", bg: "#C9821E", value: String(flagged), up: false },
    { label: "Providers monitored", icon: "check", bg: "#1F9D5B", value: String(monitoredCount()) },
  ];
  return (
    <>
      <KpiTiles metrics={metrics} columns={3} />
      <Box
        title="🔗 Possible self-dealing (partner recommends a business they own)"
        hint="Detected by matching owner identity — phone, National ID, or Google-listing owner — between a demand partner and a local provider."
        style={{ marginTop: 14 }}
      >
        {SELF_DEAL.map((s, i) => (
          <div key={i} className="dealrow">
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                gap: 10,
              }}
            >
              <div style={{ fontWeight: 700, fontSize: 13.5 }}>
                {s.partner}{" "}
                <span style={{ color: "var(--muted)", fontWeight: 500 }}>
                  → recommends →
                </span>{" "}
                {s.provider}
              </div>
              <span
                className={"vstat " + (s.risk === "High" ? "vs-susp" : "vs-review")}
              >
                {s.risk} risk
              </span>
            </div>
            <div style={{ fontSize: 12, color: "var(--danger)", marginTop: 6 }}>
              ⚠ {s.signal}
            </div>
            <div style={{ display: "flex", gap: 8, marginTop: 10 }}>
              <button className="btn btn-primary btn-sm" style={{ flex: 1 }}>
                Block attribution
              </button>
              <button className="btn btn-line btn-sm">Manual review</button>
              <button className="btn btn-line btn-sm">Dismiss</button>
            </div>
          </div>
        ))}
      </Box>
      <Box
        title="📈 Lead-concentration watch"
        hint="Honest partners spread recommendations widely. A single partner sending most of a provider's leads can signal collusion or self-promotion."
        style={{ marginTop: 14 }}
      >
        <table className="t">
          <thead>
            <tr>
              <th>Provider</th>
              <th>Top partner</th>
              <th>Their share</th>
              <th>Total leads</th>
              <th>Status</th>
            </tr>
          </thead>
          <tbody>
            {conc.map((c, i) => (
              <tr key={i}>
                <td>
                  <b>{c.name}</b>
                </td>
                <td>{c.partner}</td>
                <td>{Math.round(c.share * 100)}%</td>
                <td>{c.leads}</td>
                <td>
                  {c.share >= 0.5 ? (
                    <span className="tinybadge under">Watch</span>
                  ) : (
                    <span className="tinybadge hot">Normal</span>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </Box>
      <Box title="How LOMA defends this" style={{ marginTop: 14 }}>
        <div style={{ fontSize: 12.5, color: "var(--ink-2)", lineHeight: 1.8 }}>
          ✓ Cross-check owner identity (phone / National ID / Google owner) between
          partner & provider
          <br />✓ Concentration & velocity anomaly detection (this view)
          <br />✓ Official impact counts only{" "}
          <b>Verified partner → Verified provider → confirmed visit</b>
          <br />✓ No commission/reward paid on flagged or self-dealt traffic (KYC +
          manual review before payout)
        </div>
      </Box>
    </>
  );
}

// ---------- 12. Feedback ----------
export function FeedbackView() {
  const open = OPS.filter((o) => o.vettingStatus === "needs review").length;
  const metrics: Metric[] = [
    { label: "Avg satisfaction", icon: "star", bg: "#E0A93C", value: DASH.avgRating.toFixed(1) + " ★", delta: "0.1" },
    { label: "Positive feedback", icon: "check", bg: "#1F9D5B", value: pct(DASH.positive), delta: "3%" },
    { label: "Open complaints", icon: "spark", bg: "#C2452F", value: String(open), delta: "1", up: false },
    { label: "Total ratings", icon: "user", bg: "#2563B0", value: DASH.ratingsN.toLocaleString(), delta: "5%" },
  ];
  return (
    <>
      <KpiTiles metrics={metrics} columns={4} />
      <Box title="Recent tourist feedback" style={{ marginTop: 14 }}>
        <RecommendationsTable limit={12} />
      </Box>
    </>
  );
}

// tourist mix is available if needed later
export const _tourists = TUR;
