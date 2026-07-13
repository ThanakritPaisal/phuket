import { useVersion } from "../store";
import { bookingsFor } from "../bookings";
import { statusBadge, commStats } from "./lib";
import type { CommScreenProps } from "./CommunityApp";

const fmtDate = (iso: string) => {
  const d = new Date(iso + "T00:00:00");
  return isNaN(d.getTime())
    ? iso
    : d.toLocaleDateString("en-GB", { weekday: "short", day: "numeric", month: "short" });
};

export default function CommunityBookings({ c, onGo }: CommScreenProps) {
  useVersion();
  // DATA ISOLATION: only this community's bookings, sorted by date.
  const bookings = [...bookingsFor(c.id)].sort((a, b) => a.date.localeCompare(b.date));
  const st = commStats(c);

  return (
    <>
      <div className="ed-top">
        <h1>
          Who is coming,
          <br />
          and when.
        </h1>
        <div className="sub">Every booking below was sent to {c.name} — and only to you.</div>
      </div>

      <div className="pad" style={{ paddingTop: 12 }}>
        <div className="mtiles" style={{ gridTemplateColumns: "1fr 1fr 1fr" }}>
          <div className="mtile">
            <div className="v">{st.upcomingPax}</div>
            <div className="k">Guests upcoming</div>
          </div>
          <div className="mtile">
            <div className="v">{st.checkedIn}</div>
            <div className="k">Checked in</div>
          </div>
          <div className="mtile">
            <div className="v">{st.noshows}</div>
            <div className="k">No-shows</div>
          </div>
        </div>

        <div className="h-sec">All bookings for {c.name}</div>

        {bookings.length === 0 ? (
          <div
            style={{
              textAlign: "center",
              color: "var(--muted)",
              padding: "34px 20px",
              fontSize: 12.5,
              background: "var(--surface-2)",
              borderRadius: 12,
            }}
          >
            No LOMA bookings yet. Hotels contact you directly — there is no "Book Now" here.
          </div>
        ) : (
          bookings.map((b) => {
            const badge = statusBadge(b.status);
            const pending = b.status === "requested" || b.status === "confirmed";
            return (
              <div className="pcard" key={b.ref} style={{ marginBottom: 9, padding: "12px 13px", cursor: "default" }}>
                <div style={{ display: "flex", alignItems: "center", gap: 11 }}>
                  <div
                    className="ch-emo"
                    style={{
                      width: 44,
                      height: 44,
                      borderRadius: 11,
                      background:
                        b.status === "attended"
                          ? "var(--ok-l)"
                          : b.status === "noshow"
                          ? "var(--surface-2)"
                          : "var(--primary-l)",
                      color:
                        b.status === "attended"
                          ? "var(--ok-d)"
                          : b.status === "noshow"
                          ? "var(--muted)"
                          : "var(--primary)",
                      fontWeight: 800,
                      fontSize: 13,
                    }}
                  >
                    {b.pax}p
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontWeight: 700, fontSize: 14 }}>
                      {b.guest} · {b.pax} guest{b.pax > 1 ? "s" : ""}
                    </div>
                    <div style={{ fontSize: 11.5, color: "var(--muted)" }}>
                      {fmtDate(b.date)} · sent by {b.hotel} · <b>{b.ref}</b>
                    </div>
                    <div style={{ marginTop: 6 }}>
                      <span className={`badge ${badge.cls}`}>{badge.label}</span>
                    </div>
                  </div>
                </div>
                {pending && (
                  <div style={{ marginTop: 8, fontSize: 11.5, color: "var(--muted)" }}>
                    A booking is not a visit yet.{" "}
                    <button
                      onClick={() => onGo("checkin")}
                      style={{ color: "var(--primary)", fontWeight: 700 }}
                    >
                      Check in on the day →
                    </button>
                  </div>
                )}
              </div>
            );
          })
        )}

        <div className="modehint" style={{ marginTop: 6 }}>
          🛡 Communities are contact-first. Hotels recommend you and guests reach you directly — LOMA never takes
          a cut of what a guest pays you.
        </div>
        <div style={{ height: 14 }} />
      </div>
    </>
  );
}
