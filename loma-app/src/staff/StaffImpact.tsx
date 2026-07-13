import { LomaBadges } from "../components/AiScorePanel";
import { activePick } from "../activeAccount";
import { LOMA_CATS } from "../scoring";
import {
  impactCredits,
  hotelTier,
  nextTier,
  countEv,
  providersSupported,
  topCreditProviders,
  topCreditCats,
  creditTrend,
  leaderboard,
  flaggedCount,
} from "../impact";
import { useVersion } from "../store";
import { StaffAppbar, StaffTabbar, bg, useStaff } from "./helpers";
import "./impact.css";

const CAT_EMOJI: Record<string, string> = Object.fromEntries(LOMA_CATS);
const lomaEmo = (c: string) => CAT_EMOJI[c] || "📍";

/** HOTEL IMPACT CREDITS DASHBOARD — "No hidden commission." */
export default function StaffImpact() {
  useVersion(); // re-render when tracking events mutate the engines
  const { openProv } = useStaff();

  const c = impactCredits();
  const t = hotelTier(c);
  const nt = nextTier(c);
  const pct = nt ? Math.max(0, Math.min(100, Math.round(((c - t[2]) / (nt[2] - t[2])) * 100))) : 100;
  const flagged = flaggedCount();
  const trend = creditTrend();
  const max = Math.max(...trend.map((x) => x[1]), 1);
  const cats = topCreditCats();
  const providers = topCreditProviders(5);
  const board = leaderboard();

  const tiles: [string | number, string][] = [
    [countEv("qr_scanned"), "QR scans"],
    [countEv("provider_card_viewed"), "Provider cards viewed"],
    [countEv("direction_clicked") + countEv("contact_clicked"), "Direction / contact clicks"],
    [countEv("community_inquiry_clicked"), "Community inquiries"],
    [countEv("provider_confirmed_visit"), "Confirmed visits"],
    [providersSupported(), "Local providers supported"],
  ];

  return (
    <div className="scroll">
      <StaffAppbar />
      <div className="ed-top">
        <h1>
          What your hotel
          <br />
          gave back.
        </h1>
        <div className="sub">Transparent impact — never a commission.</div>
      </div>
      <div className="pad" style={{ paddingTop: 12 }}>
        <div className="credit">
          <div className="lab">Hotel Impact Credits</div>
          <div className="big">{c}</div>
          <div className="tier">
            🏅 {t[0]} · {t[1]}
          </div>
          {nt ? (
            <>
              <div className="bar">
                <i style={{ width: `${pct}%` }} />
              </div>
              <div style={{ fontSize: 11.5, opacity: 0.85, marginTop: 6 }}>
                {nt[2] - c} credits to{" "}
                <b>
                  {nt[0]} · {nt[1]}
                </b>
              </div>
            </>
          ) : (
            <div style={{ fontSize: 11.5, opacity: 0.85, marginTop: 8 }}>
              Top tier reached. Thank you for backing Phuket's local economy.
            </div>
          )}
        </div>
        <div className="nocomm">🛡 No hidden commission. Transparent impact credits.</div>

        <div className="mtiles">
          {tiles.map(([v, k]) => (
            <div className="mtile" key={k}>
              <div className="v">{v}</div>
              <div className="k">{k}</div>
            </div>
          ))}
        </div>

        <div className="h-sec">Monthly trend</div>
        <div className="trend">
          {trend.map(([m, v]) => (
            <div className="col" key={m}>
              <i style={{ height: Math.round((v / max) * 62) }} />
              <span>{m}</span>
            </div>
          ))}
        </div>

        <div className="h-sec">Top categories</div>
        {cats.length ? (
          cats.map(([c2, v]) => (
            <div className="lbrow" key={c2}>
              <div className="nm">
                {lomaEmo(c2)} {c2}
              </div>
              <div className="c">{v} cr</div>
            </div>
          ))
        ) : (
          <div style={{ fontSize: 12.5, color: "var(--muted)" }}>No credits yet.</div>
        )}

        <div className="h-sec">Top providers you sent guests to</div>
        {providers.map(({ id, c: v }) => {
          const p = activePick(id);
          if (!p) return null;
          return (
            <div className="prow" key={id} onClick={() => openProv(id)}>
              <div className="thumb" style={bg(p.img)} />
              <div className="info">
                <h3 style={{ fontSize: 14 }}>{p.name}</h3>
                <div className="m">
                  {p.ai.loma_cat} · {p.area}
                </div>
                <div className="bd">
                  <LomaBadges ai={p.ai} />
                </div>
              </div>
              <div style={{ alignSelf: "center", fontWeight: 800, fontSize: 13, color: "var(--primary)" }}>
                {v} cr
              </div>
            </div>
          );
        })}

        <div className="h-sec">Local impact leaderboard</div>
        {board.map((r, i) => (
          <div className={`lbrow ${r.me ? "me" : ""}`} key={r.name}>
            <div className="r">{i + 1}</div>
            <div className="nm">{r.name}</div>
            <div className="c">{r.credits}</div>
          </div>
        ))}

        <div className="modehint" style={{ marginTop: 12 }}>
          <span>
            🛡 <b>How credits are earned:</b> a scan is worth little; a real tourist action is worth a
            lot. Confirmed visit +20 · community inquiry +10 · direction or contact click +5. Hidden gems
            ×1.3, community experiences ×1.5, under-served areas ×1.2. {flagged} repeat event
            {flagged === 1 ? "" : "s"} from the same session {flagged === 1 ? "was" : "were"} detected and
            not credited. Complaints subtract points. <b>No hidden commission.</b>
          </span>
        </div>
        <div style={{ height: 14 }} />
      </div>
      <StaffTabbar active="impact" />
    </div>
  );
}
