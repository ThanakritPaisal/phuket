import { useState } from "react";
import { community, commReady, READINESS_LEVELS } from "../v2data";
import type { Community } from "../v2data";
import Icon from "../components/Icon";
import { LomaBadges } from "../components/AiScorePanel";
import RealMap, { type MapPin } from "../components/RealMap";
import { communityMembers, getActiveAccount } from "../activeAccount";
import { trackEvent } from "../impact";
import { useVersion } from "../store";
import {
  bookDays,
  slotSeats,
  myBooking,
  addBooking,
  cancelBooking,
  COMMUNITY_ROUNDS,
  SLOT_CAPACITY,
} from "../bookings";

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

// "Book your visit" — ported from LOMA-prototype.html. Live availability by day +
// round; a confirmed booking lands in the shared BOOKINGS store, so the community
// host sees it on their Bookings / Check-in screens right away. A booking is still
// not a visit — only a host check-in turns it into counted income.
function BookVisit({ c }: { c: Community }) {
  useVersion(); // re-render when a booking is created / cancelled
  const [dayIdx, setDayIdx] = useState(0);
  const [guests, setGuests] = useState(2);
  const days = bookDays();
  const day = days[dayIdx];
  const hotel = getActiveAccount().name;

  const book = (round: string) => {
    addBooking({
      id: c.id,
      date: day.iso,
      round,
      pax: guests,
      hotel,
      guest: "App guest",
    });
    trackEvent("community_inquiry_clicked", { community_id: c.id });
  };

  const mine = COMMUNITY_ROUNDS.some((r) => myBooking(c.id, day.iso, r));

  return (
    <>
      <div className="sec-h">Book your visit</div>
      <div style={{ fontSize: 12, color: "var(--muted)", margin: "-2px 0 10px" }}>
        Live availability — pick a day and round.
      </div>

      <div style={{ display: "flex", gap: 8, overflowX: "auto", paddingBottom: 6 }}>
        {days.map((d) => (
          <button
            key={d.idx}
            className={`chip ${dayIdx === d.idx ? "on" : ""}`}
            onClick={() => setDayIdx(d.idx)}
            style={{
              flexDirection: "column",
              minWidth: 54,
              padding: "8px 4px",
              gap: 1,
              textAlign: "center",
              lineHeight: 1.15,
            }}
          >
            <span style={{ fontSize: 10.5 }}>{d.top}</span>
            <b style={{ fontSize: 15 }}>{d.num}</b>
          </button>
        ))}
      </div>

      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", margin: "13px 0 8px" }}>
        <span style={{ fontSize: 12.5, color: "var(--ink-2)", fontWeight: 700 }}>Guests</span>
        <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
          <button
            onClick={() => setGuests((g) => Math.max(1, g - 1))}
            style={{ width: 32, height: 32, borderRadius: "50%", border: "1px solid var(--line)", fontSize: 19, color: "var(--primary)", lineHeight: 1 }}
          >
            −
          </button>
          <b style={{ fontSize: 16, minWidth: 20, textAlign: "center" }}>{guests}</b>
          <button
            onClick={() => setGuests((g) => Math.min(10, g + 1))}
            style={{ width: 32, height: 32, borderRadius: "50%", border: "1px solid var(--line)", fontSize: 19, color: "var(--primary)", lineHeight: 1 }}
          >
            +
          </button>
        </div>
      </div>

      {COMMUNITY_ROUNDS.map((r) => {
        const seats = slotSeats(c.id, day.iso, r);
        const booked = myBooking(c.id, day.iso, r);
        const notEnough = seats < guests;
        return (
          <div
            key={r}
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              border: `1px solid ${booked ? "var(--ok)" : "var(--line)"}`,
              background: booked ? "var(--ok-l)" : "var(--surface)",
              borderRadius: 12,
              padding: "12px 14px",
              marginBottom: 9,
            }}
          >
            <div>
              <div style={{ fontWeight: 800, fontSize: 15.5 }}>{r}</div>
              <div
                style={{
                  fontSize: 12,
                  fontWeight: 600,
                  color: seats <= 0 ? "var(--danger)" : seats <= 3 ? "var(--warn-d)" : "var(--ok-d)",
                }}
              >
                {seats <= 0 ? "Fully booked" : `${seats} of ${SLOT_CAPACITY} seats left`}
              </div>
            </div>
            {booked ? (
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <span style={{ fontSize: 13, fontWeight: 800, color: "var(--ok-d)" }}>✓ Confirmed</span>
                <button
                  className="btn btn-line btn-sm"
                  style={{ width: "auto" }}
                  onClick={() => cancelBooking(booked.ref)}
                >
                  Cancel
                </button>
              </div>
            ) : (
              <button
                className="btn btn-coral btn-sm"
                style={{ width: "auto", ...(notEnough ? { opacity: 0.45, cursor: "not-allowed" } : {}) }}
                disabled={seats <= 0 || notEnough}
                onClick={() => book(r)}
              >
                {seats <= 0 ? "Full" : notEnough ? "Not enough" : `Book ${guests}`}
              </button>
            )}
          </div>
        );
      })}

      {mine && (
        <div
          style={{
            background: "var(--ok-l)",
            borderRadius: 10,
            padding: "9px 12px",
            fontSize: 12.5,
            color: "var(--ok-d)",
            fontWeight: 700,
            marginBottom: 2,
          }}
        >
          ✓ Your booking was sent to {c.name}. They will greet you on the day — a booking is not a
          visit until they check you in.
        </div>
      )}
    </>
  );
}

export default function CommunityDetail({
  id,
  onBack,
}: {
  id: string;
  onBack: () => void;
}) {
  const c = community(id);
  if (!c) return null;
  const tel = c.phone.replace(/[^0-9]/g, "");
  const inquire = () => trackEvent("community_inquiry_clicked", { community_id: c.id });
  const members = communityMembers(c.memberIds);

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
          walk-in shop. Contact the community first to confirm availability, group
          size and price. You cannot just walk in.
        </div>

        <div className="cta2">
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

        <BookVisit c={c} />

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
