import Icon from "../components/Icon";
import RealMap from "../components/RealMap";
import { Screen, attribution, levelLabel, useStaff } from "./helpers";

export default function StaffSettings() {
  const { partner, go, openModal, signOut, toast } = useStaff();
  const lv = partner.level || "verified";
  const badge =
    lv === "verified" ? (
      <span className="badge b-verified">
        <Icon name="verified" size={12} /> Verified Partner
      </span>
    ) : lv === "org" ? (
      <span className="badge" style={{ background: "var(--info-l)", color: "var(--info)" }}>
        Registered Organization
      </span>
    ) : (
      <span className="badge b-price">Registered User</span>
    );

  return (
    <Screen active="settings">
      <h2 style={{ fontSize: 17 }}>Partner profile</h2>
      <div style={{ display: "flex", gap: 6, flexWrap: "wrap", margin: "6px 0 10px" }}>{badge}</div>
      <div style={{ fontSize: 12, color: "var(--muted)", marginBottom: 6 }}>
        Tourist card shows: <b style={{ color: "var(--ink-2)" }}>“{attribution(partner)}”</b>
      </div>
      <div className="kv" style={{ gridTemplateColumns: "1fr" }}>
        <div>
          <div className="k">{partner.kind === "individual" ? "Name" : "Partner name"}</div>
          <div className="v">{partner.name}</div>
        </div>
        <div>
          <div className="k">Type</div>
          <div className="v">{partner.type}</div>
        </div>
        <div>
          <div className="k">Area</div>
          <div className="v">{partner.area}</div>
        </div>
        {partner.inviteCode && (
          <div>
            <div className="k">Staff invite code</div>
            <div className="v" style={{ letterSpacing: 1 }}>
              {partner.inviteCode}
            </div>
          </div>
        )}
        <div>
          <div className="k">Level</div>
          <div className="v" style={{ fontSize: 13 }}>
            {levelLabel(partner)}
          </div>
        </div>
      </div>

      {lv !== "verified" && (
        <div className="why" style={{ marginTop: 14, background: "var(--accent-l)" }}>
          <div className="lab" style={{ color: "var(--accent)" }}>
            <Icon name="spark" size={12} /> Get the verified badge
          </div>
          <p style={{ color: "var(--warn)" }}>
            Verify your business to unlock the official “Recommended by{" "}
            {partner.kind === "individual" ? "your name" : partner.name}” attribution, full dashboard and
            incentives.
          </p>
          <div style={{ marginTop: 10 }}>
            <button className="btn btn-primary" onClick={() => go("getverified")}>
              <Icon name="verified" size={16} /> Get Verified
            </button>
          </div>
        </div>
      )}

      <div className="h-sec">{partner.kind === "individual" ? "Work area" : "Property location"}</div>
      <div className="mapbox" style={{ height: 150, borderRadius: 12, overflow: "hidden" }}>
        <RealMap you={{ lat: partner.lat, lng: partner.lng }} zoom={14} interactive={false} />
      </div>

      <div style={{ marginTop: 14 }}>
        <button className="btn btn-soft" onClick={() => openModal({ kind: "counterqr" })}>
          <Icon name="qr" size={16} /> Display counter QR (self-serve)
        </button>
      </div>
      <div style={{ marginTop: 10 }}>
        <button className="btn btn-line" onClick={() => toast("Edit form — coming in the full build")}>
          Edit details
        </button>
      </div>
      <div style={{ marginTop: 10 }}>
        <button className="btn btn-ghost" style={{ color: "var(--danger)", borderColor: "#F3C9C1" }} onClick={signOut}>
          Sign out
        </button>
      </div>
      <div style={{ height: 14 }} />
    </Screen>
  );
}
