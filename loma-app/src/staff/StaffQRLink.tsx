import Icon from "../components/Icon";
import { LomaBadges } from "../components/AiScorePanel";
import { activePick } from "../activeAccount";
import { recUrl } from "../recommendations";
import { StaffAppbar, StaffTabbar, QrSVG, bg, useStaff } from "./helpers";
import "./impact.css";

/** The generated QR / shareable link for a recommendation list (assisted or passive). */
export default function StaffQRLink() {
  const { curList: rl, partner, go, toast } = useStaff();
  if (!rl) {
    // No list in flight — offer a way back to the Recommend builder.
    return (
      <div className="scroll">
        <StaffAppbar />
        <div className="pad" style={{ textAlign: "center", color: "var(--muted)", paddingTop: 40 }}>
          <div style={{ fontSize: 34 }}>🔗</div>
          <div style={{ fontWeight: 700, color: "var(--ink)", marginTop: 8 }}>No recommendation yet</div>
          <div style={{ fontSize: 13, marginTop: 5 }}>Build one to generate a QR / link.</div>
          <div style={{ marginTop: 18 }}>
            <button
              className="btn btn-primary"
              style={{ width: "auto", padding: "11px 18px", margin: "0 auto" }}
              onClick={() => go("recommend")}
            >
              <Icon name="spark" size={16} /> Create Assisted Recommendation
            </button>
          </div>
        </div>
        <StaffTabbar active="recommend" />
      </div>
    );
  }
  const passive = rl.kind === "passive";
  const items = rl.items.map((id) => activePick(id)).filter((p) => !!p);
  const rootTab = passive ? "saved" : "recommend";

  return (
    <div className="scroll">
      <StaffAppbar />
      <div className="pad">
        <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 4 }}>
          <button
            onClick={() => go(rootTab)}
            style={{
              width: 30,
              height: 30,
              borderRadius: "50%",
              background: "var(--surface-2)",
              display: "grid",
              placeItems: "center",
              fontSize: 19,
              color: "var(--ink-2)",
              lineHeight: 1,
            }}
          >
            ‹
          </button>
          <h2 style={{ fontSize: 18 }}>{passive ? "Hotel Local Picks QR" : "Assisted Recommendation"}</h2>
        </div>
        <p style={{ fontSize: 13, color: "var(--muted)", marginBottom: 14 }}>
          {passive
            ? `A permanent QR for ${partner.name}. Print it for the front desk, the lobby standee and the guest rooms — it always shows your current saved favourites.`
            : `A one-off link for this guest. It opens only the ${items.length} place${
                items.length > 1 ? "s" : ""
              } you chose — then they can explore further on their own.`}
        </p>

        <div className="qrblock">
          <div className="frame">
            <QrSVG />
          </div>
          <div className="cap">{passive ? "Recommended by this hotel" : "Local picks recommended for you"}</div>
          <div className="url">{recUrl(rl)}</div>
          <div style={{ display: "flex", gap: 8, marginTop: 12 }}>
            <button
              className="btn btn-line btn-sm"
              style={{ flex: 1 }}
              onClick={() => toast("Link copied — " + recUrl(rl))}
            >
              <Icon name="copy" size={15} /> Copy link
            </button>
            <button
              className="btn btn-line btn-sm"
              style={{ flex: 1 }}
              onClick={() => toast("Sending to the guest…")}
            >
              <Icon name="share" size={15} /> Send
            </button>
          </div>
        </div>

        <div className="h-sec">What the tourist will see</div>
        {items.length ? (
          items.map((o) => (
            <div className="prow" key={o!.id}>
              <div className="thumb" style={bg(o!.img)} />
              <div className="info">
                <h3 style={{ fontSize: 14 }}>{o!.name}</h3>
                <div className="m">
                  {o!.ai.loma_cat} · {o!.dist} · {o!.price}
                </div>
                <div className="bd">
                  <LomaBadges ai={o!.ai} />
                </div>
              </div>
            </div>
          ))
        ) : (
          <div
            style={{
              fontSize: 12.5,
              color: "var(--muted)",
              padding: 14,
              textAlign: "center",
              background: "var(--surface-2)",
              borderRadius: 10,
            }}
          >
            No saved favourites yet — add some from any provider card.
          </div>
        )}

        <div className="nocomm" style={{ marginTop: 14 }}>
          🛡 No hidden commission — this hotel earns transparent Impact Credits when the guest actually
          visits.
        </div>
      </div>
      <StaffTabbar active={rootTab} />
    </div>
  );
}
