import Icon from "../components/Icon";
import { useVersion } from "../store";
import { bahtF } from "../econ";
import { bookingsFor, setBookingStatus } from "../bookings";
import { trackEvent } from "../impact";
import { statusBadge, commRevenue } from "./lib";
import type { CommScreenProps } from "./CommunityApp";

const fmtDate = (iso: string) => {
  const d = new Date(iso + "T00:00:00");
  return isNaN(d.getTime())
    ? iso
    : d.toLocaleDateString("en-GB", { weekday: "short", day: "numeric", month: "short" });
};

export default function CommunityCheckin({ c, toast }: CommScreenProps) {
  useVersion();
  const bookings = [...bookingsFor(c.id)].sort((a, b) => a.date.localeCompare(b.date));
  const rev = commRevenue(c);

  const checkIn = (ref: string, pax: number) => {
    setBookingStatus(ref, "attended"); // a booking becomes a real visit
    // A checked-in guest is a confirmed visit; the sending hotel earns Impact Credits.
    trackEvent("provider_confirmed_visit", { community_id: c.id });
    toast(`Checked in ${pax} guest${pax > 1 ? "s" : ""} — counted as income`);
  };
  const noShow = (ref: string) => {
    setBookingStatus(ref, "noshow"); // ฿0 — a no-show is not a visit
    toast("Marked no-show — ฿0 counted");
  };
  const undo = (ref: string) => {
    setBookingStatus(ref, "confirmed");
    toast("Undone — back to awaiting check-in");
  };

  return (
    <>
      <div className="ed-top">
        <h1>
          A booking is not
          <br />
          a visit yet.
        </h1>
        <div className="sub">Check the guest in — that is what makes it real income.</div>
      </div>

      <div className="pad" style={{ paddingTop: 12 }}>
        <div
          style={{
            width: "100%",
            display: "flex",
            alignItems: "center",
            gap: 12,
            background: "var(--primary)",
            color: "#fff",
            borderRadius: 14,
            padding: 14,
            marginBottom: 12,
          }}
        >
          <div
            style={{
              width: 44,
              height: 44,
              borderRadius: 12,
              background: "rgba(255,255,255,.16)",
              display: "grid",
              placeItems: "center",
              flex: "none",
            }}
          >
            <Icon name="qr" size={22} />
          </div>
          <div style={{ flex: 1 }}>
            <div style={{ fontWeight: 800, fontSize: 14.5 }}>Scan the guest's QR code</div>
            <div style={{ fontSize: 11.5, color: "rgba(255,255,255,.88)", lineHeight: 1.4 }}>
              Or ask for their LOMA code. Only a check-in counts as income.
            </div>
          </div>
        </div>

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
            No LOMA bookings to check in.
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

                {pending ? (
                  <div style={{ display: "flex", gap: 8, marginTop: 10 }}>
                    <button className="btn btn-coral btn-sm" onClick={() => checkIn(b.ref, b.pax)}>
                      <Icon name="check" size={16} /> Check in
                    </button>
                    <button className="btn btn-line btn-sm" onClick={() => noShow(b.ref)}>
                      Mark no-show
                    </button>
                  </div>
                ) : (
                  <div style={{ marginTop: 8, fontSize: 11.5, color: "var(--muted)" }}>
                    {b.status === "attended"
                      ? "Counted as a confirmed visit — the hotel that sent them earned Impact Credits."
                      : "Not counted. ฿0 economic impact recorded."}{" "}
                    <button onClick={() => undo(b.ref)} style={{ color: "var(--primary)", fontWeight: 700 }}>
                      Undo
                    </button>
                  </div>
                )}
              </div>
            );
          })
        )}

        <div style={{ background: "var(--ok-l)", borderRadius: 12, padding: "12px 13px", marginTop: 12 }}>
          <div
            style={{
              fontSize: 10.5,
              fontWeight: 800,
              letterSpacing: ".6px",
              textTransform: "uppercase",
              color: "var(--ok-d)",
            }}
          >
            Income recorded so far
          </div>
          <div className="statbig" style={{ fontSize: 28, color: "var(--ok-d)", marginTop: 2 }}>
            {bahtF(rev.baht)}
          </div>
          <div style={{ fontSize: 11.5, color: "var(--ink-2)", marginTop: 4 }}>
            From {rev.pax} checked-in guest{rev.pax === 1 ? "" : "s"} × your published ฿{rev.mid}. LOMA takes ฿0.
          </div>
        </div>
        <div style={{ height: 14 }} />
      </div>
    </>
  );
}
