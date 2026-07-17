import { useState } from "react";
import { community, commReady, READINESS_LEVELS } from "../v2data";
import type { Community } from "../v2data";
import Icon from "../components/Icon";
import { LomaBadges } from "../components/AiScorePanel";
import QRCode from "../components/QRCode";
import { communityMembers, getActiveAccount } from "../activeAccount";
import { useVersion } from "../store";
import { createBooking, remainingSlots, getCapacity, type Booking } from "../bookings";
import RealMap, { type MapPin } from "../components/RealMap";
import { trackEvent } from "../impact";

const READY_CLASS = ["b-price", "b-price", "b-ready", "b-verified"];
const READY_EMOJI = ["📄", "📞", "✓", "💠"];

// Readiness badge derived from commReady() + READINESS_LEVELS — reused by the
// Community list, the Recommended landing and this detail screen.
export function ReadinessBadge({ c }: { c: Community }) {
  const r = commReady(c);
  return (
    <span className={`badge ${READY_CLASS[r]}`}>
      {READY_EMOJI[r]} {READINESS_LEVELS[r]}
    </span>
  );
}

export default function CommunityDetail({
  id,
  onBack,
}: {
  id: string;
  onBack: () => void;
}) {
  useVersion(); // re-read live availability after any booking
  const c = community(id);
  const [pax, setPax] = useState(2);
  const [date, setDate] = useState("2026-07-16");
  const [booked, setBooked] = useState<Booking | null>(null);
  const [err, setErr] = useState("");
  if (!c) return null;
  const tel = c.phone.replace(/[^0-9]/g, "");
  const inquire = () => trackEvent("community_inquiry_clicked", { community_id: c.id });
  const members = communityMembers(c.memberIds);

  const cap = getCapacity(c.id);
  const left = remainingSlots(c.id);
  const book = () => {
    const r = createBooking({
      commId: c.id,
      pax,
      guest: "LOMA guest",
      hotel: getActiveAccount().name,
      date,
    });
    if (r.ok && r.booking) {
      setBooked(r.booking);
      setErr("");
      trackEvent("community_booked", { community_id: c.id, metadata: { pax, ref: r.booking.ref } });
    } else {
      setErr(r.reason || "Could not book");
    }
  };

  return (
    <div className="scroll">
      <div className="hero" style={c.img ? { backgroundImage: `url(${c.img})` } : undefined}>
        {!c.img && <div className="ph-emo">{c.emo}</div>}
        <button className="back" onClick={onBack}>
          ←
        </button>
      </div>
      <div className="pad">
        <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginBottom: 8 }}>
          <span className="badge b-pick">🛶 Community Experience</span>
          <ReadinessBadge c={c} />
          <span className="badge b-warn-s">📞 Contact Before Visiting</span>
        </div>
        <h2 style={{ fontSize: 22, lineHeight: 1.2 }}>{c.name}</h2>
        <div style={{ fontSize: 13.5, color: "var(--ink-2)", fontWeight: 600 }}>{c.nameEn}</div>
        <div style={{ fontSize: 13, color: "var(--muted)", marginTop: 3 }}>📍 {c.area}, Phuket</div>

        <div className="t-modehint">
          🛶 This is a <b>planned experience</b> run by the village itself — not a
          walk-in shop. Reserve a seat below, then show your QR to the host on the day.
        </div>

        {/* Real booking: reserve a seat -> availability drops -> QR to show the host. */}
        <div
          style={{
            border: "1px solid var(--line)",
            borderRadius: 14,
            padding: 14,
            marginTop: 14,
            background: "var(--surface-2)",
          }}
        >
          {booked ? (
            <div style={{ textAlign: "center" }}>
              <div style={{ fontWeight: 800, fontSize: 15, color: "var(--ok-d)" }}>✓ Seat reserved</div>
              <div style={{ fontSize: 12, color: "var(--muted)", marginTop: 2 }}>
                {booked.pax} guest{booked.pax > 1 ? "s" : ""} · {date} · {booked.ref}
              </div>
              <div style={{ display: "inline-block", padding: 12, background: "#fff", borderRadius: 14, marginTop: 12, border: "1px solid var(--line)" }}>
                <QRCode value={booked.ref} size={150} />
              </div>
              <div style={{ fontSize: 12, fontWeight: 700, color: "var(--primary-d)", marginTop: 8 }}>
                Show this QR to the community host
              </div>
              <div style={{ fontSize: 11.5, color: "var(--muted)", marginTop: 3 }}>
                They scan it on arrival — that's what confirms you actually came.
              </div>
            </div>
          ) : (
            <>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline" }}>
                <div style={{ fontWeight: 800, fontSize: 15 }}>🎟️ Reserve a seat</div>
                <div style={{ fontSize: 12.5, fontWeight: 700, color: left <= 3 ? "var(--danger)" : "var(--ok-d)" }}>
                  {left} of {cap} seats left
                </div>
              </div>
              <div style={{ fontSize: 12, color: "var(--muted)", marginTop: 2 }}>from {c.priceFrom}</div>

              <div style={{ display: "flex", alignItems: "center", gap: 14, marginTop: 12 }}>
                <span style={{ fontSize: 12.5, color: "var(--ink-2)" }}>Guests</span>
                <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                  <button
                    className="btn btn-line btn-sm"
                    style={{ width: 38, padding: 0 }}
                    onClick={() => setPax((n) => Math.max(1, n - 1))}
                  >
                    −
                  </button>
                  <span style={{ fontWeight: 800, fontSize: 16, minWidth: 18, textAlign: "center" }}>{pax}</span>
                  <button
                    className="btn btn-line btn-sm"
                    style={{ width: 38, padding: 0 }}
                    onClick={() => setPax((n) => Math.min(left || 1, n + 1))}
                  >
                    +
                  </button>
                </div>
              </div>

              <div style={{ display: "flex", alignItems: "center", gap: 14, marginTop: 10 }}>
                <span style={{ fontSize: 12.5, color: "var(--ink-2)" }}>Date</span>
                <input
                  className="pp-input sm"
                  type="date"
                  value={date}
                  onChange={(e) => setDate(e.target.value)}
                  style={{ flex: 1 }}
                />
              </div>

              {err && (
                <div style={{ color: "var(--danger)", fontSize: 12, marginTop: 10 }}>{err}</div>
              )}

              <button
                className="btn btn-primary"
                style={{ marginTop: 12 }}
                disabled={left < 1}
                onClick={book}
              >
                <Icon name="check" size={16} /> {left < 1 ? "Fully booked" : `Book ${pax} seat${pax > 1 ? "s" : ""}`}
              </button>
              <div style={{ fontSize: 11, color: "var(--muted)", textAlign: "center", marginTop: 8 }}>
                No payment now — you pay the community directly. LOMA takes ฿0.
              </div>
            </>
          )}
        </div>

        <div className="cta2" style={{ marginTop: 14 }}>
          <a className="btn btn-primary" href={`tel:${tel}`} onClick={inquire}>
            <Icon name="phone" size={17} /> Contact Community
          </a>
          <a className="btn btn-ghost" href={`tel:${tel}`} onClick={inquire}>
            <Icon name="clock" size={17} /> Ask Availability
          </a>
        </div>

        <p style={{ fontSize: 14, color: "var(--ink-2)", marginTop: 14, lineHeight: 1.6 }}>
          {c.about}
        </p>

        {c.lat != null && c.lng != null && (
          <>
            <div className="sec-h">Where it is</div>
            <div className="mapbox" style={{ height: 180, borderRadius: 12, overflow: "hidden" }}>
              <RealMap
                you={{ lat: c.lat, lng: c.lng }}
                pins={members
                  .filter((m) => m.lat != null && m.lng != null)
                  .map((m): MapPin => ({ id: m.id, lat: m.lat, lng: m.lng, emoji: m.emo }))}
                interactive={false}
              />
            </div>
            <div style={{ fontSize: 11, color: "var(--muted)", marginTop: 6 }}>
              📍 Community centre (median of its {members.length} member businesses) · pins are the
              members themselves.
            </div>
          </>
        )}

        <div className="sec-h">What you'll do</div>
        <div style={{ marginTop: 8 }}>
          {c.activities.map((a) => (
            <div className="t-act" key={a}>
              <span className="tick">✓</span>
              <span className="tx">{a}</span>
            </div>
          ))}
        </div>

        <div className="sec-h">Good to know</div>
        <div style={{ marginTop: 8 }}>
          {c.schedule.map((s) => (
            <div className="t-act" key={s}>
              <span className="tick">·</span>
              <span className="tx">{s}</span>
            </div>
          ))}
        </div>

        <div className="t-specs">
          <div className="r">
            <span className="k">Price from</span>
            <span className="v">{c.priceFrom}</span>
          </div>
          <div className="r">
            <span className="k">Duration</span>
            <span className="v">{c.duration}</span>
          </div>
          <div className="r">
            <span className="k">Readiness</span>
            <span className="v">{READINESS_LEVELS[commReady(c)]}</span>
          </div>
        </div>

        {members.length > 0 && (
          <>
            <div className="sec-h">
              Local businesses in this community{" "}
              <span style={{ fontWeight: 500, textTransform: "none", letterSpacing: 0, color: "var(--muted)" }}>
                · {members.length} verified
              </span>
            </div>
            {members.slice(0, 6).map((m) => (
              <div className="prow" key={m.id} style={{ cursor: "default" }}>
                <div
                  className="thumb"
                  style={{
                    width: 54,
                    height: 54,
                    borderRadius: 10,
                    backgroundSize: "cover",
                    backgroundPosition: "center",
                    backgroundImage: m.img ? `url(${m.img})` : undefined,
                    backgroundColor: "#dfe7e4",
                    flex: "none",
                    display: "grid",
                    placeItems: "center",
                    fontSize: 22,
                  }}
                >
                  {!m.img && m.emo}
                </div>
                <div className="info" style={{ flex: 1, minWidth: 0 }}>
                  <h3 style={{ fontSize: 13.5 }}>{m.name}</h3>
                  <div className="m" style={{ fontSize: 11.5, color: "var(--muted)" }}>
                    {m.emo} {m.cat}
                    {m.rating ? ` · ★ ${m.rating}` : ""}
                  </div>
                  <div className="bd" style={{ display: "flex", gap: 4, marginTop: 5, flexWrap: "wrap" }}>
                    <LomaBadges ai={m.ai} />
                  </div>
                </div>
              </div>
            ))}
            <div style={{ fontSize: 11.5, color: "var(--muted)", marginTop: 4 }}>
              Every business here is community-run and vetted by LOMA — income stays in the village.
            </div>
          </>
        )}

        <div className="t-contactcard">
          <div className="lab">Questions? Contact the community</div>
          <div className="num">{c.phone}</div>
          <div style={{ fontSize: 11.5, color: "var(--ink-2)", marginBottom: 12 }}>
            Your visit is arranged directly with the community — no middleman.
          </div>
          <div className="cta2" style={{ marginTop: 0 }}>
            <a className="btn btn-line" href={`tel:${tel}`} onClick={inquire}>
              <Icon name="phone" size={16} /> Call
            </a>
          </div>
        </div>
        <div style={{ height: 16 }} />
      </div>
    </div>
  );
}
