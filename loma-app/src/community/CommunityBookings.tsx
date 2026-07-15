import { useVersion } from "../store";
import { bookingsFor, getCapacity, setCapacity, remainingSlots, setBookingStatus } from "../bookings";
import { statusBadge, commStats } from "./lib";
import type { CommScreenProps } from "./CommunityApp";

const fmtDate = (iso: string) => {
  const d = new Date(iso + "T00:00:00");
  return isNaN(d.getTime())
    ? iso
    : d.toLocaleDateString("en-GB", { weekday: "short", day: "numeric", month: "short" });
};

export default function CommunityBookings({ c, onGo, toast }: CommScreenProps) {
  useVersion();
  // DATA ISOLATION: only this community's bookings, sorted by date.
  const bookings = [...bookingsFor(c.id)].sort((a, b) => a.date.localeCompare(b.date));
  const st = commStats(c);
  const cap = getCapacity(c.id);
  const left = remainingSlots(c.id);
  const confirm = (ref: string) => {
    setBookingStatus(ref, "confirmed");
    toast("Booking confirmed");
  };
  const cancel = (ref: string) => {
    setBookingStatus(ref, "noshow"); // frees the seat; ฿0 recorded
    toast("Booking cancelled — seat released");
  };

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

        {/* Manage published capacity — availability the tourist app reads live. */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            gap: 10,
            border: "1px solid var(--line)",
            borderRadius: 12,
            padding: "12px 14px",
            marginTop: 12,
          }}
        >
          <div>
            <div style={{ fontWeight: 800, fontSize: 14 }}>Seats published</div>
            <div style={{ fontSize: 11.5, color: left <= 3 ? "var(--danger)" : "var(--muted)" }}>
              {left} of {cap} available now
            </div>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <button
              className="btn btn-line btn-sm"
              style={{ width: 38, padding: 0 }}
              onClick={() => setCapacity(c.id, cap - 1)}
            >
              −
            </button>
            <span style={{ fontWeight: 800, fontSize: 16, minWidth: 22, textAlign: "center" }}>{cap}</span>
            <button
              className="btn btn-line btn-sm"
              style={{ width: 38, padding: 0 }}
              onClick={() => setCapacity(c.id, cap + 1)}
            >
              +
            </button>
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
                  <div style={{ display: "flex", gap: 8, marginTop: 10, flexWrap: "wrap" }}>
                    {b.status === "requested" && (
                      <button className="btn btn-primary btn-sm" style={{ width: "auto" }} onClick={() => confirm(b.ref)}>
                        Confirm
                      </button>
                    )}
                    <button className="btn btn-line btn-sm" style={{ width: "auto" }} onClick={() => onGo("checkin")}>
                      Check in →
                    </button>
                    <button
                      className="btn btn-line btn-sm"
                      style={{ width: "auto", color: "var(--danger)" }}
                      onClick={() => cancel(b.ref)}
                    >
                      Cancel
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
