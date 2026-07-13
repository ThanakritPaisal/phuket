import { useVersion } from "../store";
import { bahtF } from "../econ";
import { commRevenue, commStats, readiness, recommendingHotels, commInit } from "./lib";
import type { CommScreenProps } from "./CommunityApp";

export default function CommunityHome({ c, acct, onGo }: CommScreenProps) {
  useVersion(); // re-render after any check-in / status change
  const rev = commRevenue(c);
  const st = commStats(c);
  const rl = readiness(c);
  const hotels = recommendingHotels(c);

  return (
    <>
      <div className="ed-top">
        <h1>
          Hotels are sending
          <br />
          guests to your village.
        </h1>
        <div className="sub">Nobody paid to be here — including you.</div>
      </div>

      <div className="pad" style={{ paddingTop: 12 }}>
        <div style={{ display: "flex", gap: 5, flexWrap: "wrap", marginBottom: 12 }}>
          <span className="badge b-pick">🛶 Community Experience</span>
          <span className={`badge ${rl.cls}`}>{rl.label}</span>
        </div>

        {st.upcoming > 0 && (
          <button
            onClick={() => onGo("checkin")}
            style={{
              width: "100%",
              textAlign: "left",
              display: "flex",
              alignItems: "center",
              gap: 11,
              background: "var(--accent)",
              color: "#fff",
              borderRadius: 13,
              padding: "12px 13px",
              marginBottom: 12,
            }}
          >
            <div
              style={{
                width: 38,
                height: 38,
                borderRadius: 10,
                background: "rgba(255,255,255,.18)",
                display: "grid",
                placeItems: "center",
                flex: "none",
                fontSize: 17,
              }}
            >
              📷
            </div>
            <div style={{ flex: 1 }}>
              <div style={{ fontWeight: 800, fontSize: 13.5 }}>
                {st.upcoming} guest booking{st.upcoming > 1 ? "s" : ""} awaiting check-in
              </div>
              <div style={{ fontSize: 11.5, color: "rgba(255,255,255,.9)" }}>
                Check them in — a booking only becomes income once you do
              </div>
            </div>
            <span style={{ opacity: 0.9 }}>›</span>
          </button>
        )}

        <div className="mtiles">
          <div className="mtile">
            <div className="v">{st.upcomingPax}</div>
            <div className="k">Guests booked · upcoming</div>
          </div>
          <div className="mtile">
            <div className="v">{rev.pax}</div>
            <div className="k">Guests checked in</div>
          </div>
          <div className="mtile">
            <div className="v">{rev.n}</div>
            <div className="k">Visits completed</div>
          </div>
          <div className="mtile">
            <div className="v">{st.noshows}</div>
            <div className="k">No-shows · ฿0 counted</div>
          </div>
        </div>

        <div style={{ background: "var(--accent-l)", borderRadius: 14, padding: "14px 15px", marginTop: 11 }}>
          <div
            style={{
              fontSize: 10.5,
              fontWeight: 800,
              letterSpacing: ".7px",
              textTransform: "uppercase",
              color: "var(--accent-d)",
            }}
          >
            Income via LOMA · checked-in guests
          </div>
          <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", marginTop: 3 }}>
            <div className="statbig" style={{ fontSize: 34, color: "var(--accent-d)" }}>
              {bahtF(rev.baht)}
            </div>
            <div style={{ fontSize: 12, fontWeight: 700, color: "var(--accent-d)" }}>
              {rev.pax} guests × ฿{rev.mid}
            </div>
          </div>
          <div style={{ fontSize: 11.5, color: "var(--ink-2)", marginTop: 6, lineHeight: 1.5 }}>
            Calculated from <b>your own published price</b> × guests you checked in. <b>LOMA takes ฿0 of it.</b>
          </div>
        </div>

        <div className="h-sec">Your programme &amp; readiness</div>
        <div className="specs">
          <div className="r">
            <span>Programme</span>
            <b>{c.duration}</b>
          </div>
          <div className="r">
            <span>Price</span>
            <b>{c.priceFrom}</b>
          </div>
          <div className="r">
            <span>Area</span>
            <b>{c.area}</b>
          </div>
          <div className="r">
            <span>Readiness</span>
            <b>{rl.label}</b>
          </div>
          <div className="r">
            <span>Contact</span>
            <b>{c.phone}</b>
          </div>
        </div>
        <div style={{ marginTop: 10 }}>
          <button className="btn btn-line" onClick={() => onGo("profile")}>
            ✏️ Update my details &amp; readiness
          </button>
        </div>

        <div className="h-sec">Who recommends you</div>
        {hotels.map((h) => (
          <div className="prow" key={h}>
            <div
              className="ch-emo"
              style={{ width: 42, height: 42, borderRadius: 11, background: "var(--primary-l)", color: "var(--primary)", fontWeight: 800, fontSize: 12 }}
            >
              {commInit(h)}
            </div>
            <div className="info">
              <h3>{h}</h3>
              <div className="m">
                Sends guests to you · <b>no commission taken</b>
              </div>
            </div>
            <span style={{ fontSize: 16, flex: "none" }}>🤝</span>
          </div>
        ))}

        <div className="modehint" style={{ marginTop: 12 }}>
          🛡 You can never pay LOMA to rank higher. Hotels recommend you because you passed screening — not
          because you paid.
        </div>
        <div className="modehint" style={{ marginTop: 8 }}>
          🔒 Signed in as <b>{acct.person || acct.user}</b>. You only ever see <b>{c.name}</b>'s bookings, guests
          and income.
        </div>
        <div style={{ height: 14 }} />
      </div>
    </>
  );
}
