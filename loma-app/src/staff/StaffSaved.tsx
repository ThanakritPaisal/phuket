import Icon from "../components/Icon";
import { createRecList } from "../recommendations";
import { LocalBadge, Screen, bg, prov, useStaff } from "./helpers";
import "./impact.css";

export default function StaffSaved() {
  const { saved, shareDeselect, toggleDeselect, selectAllSaved, openProv, go, setPlanKind, openModal, setCurList, toast } =
    useStaff();
  const ids = [...saved];
  const sel = ids.filter((id) => !shareDeselect.has(id));

  const showPassiveQR = () => {
    if (!ids.length) return toast("Save some picks first");
    const rl = createRecList(ids, "passive");
    setCurList(rl);
    go("qrlink");
  };

  return (
    <Screen active="saved">
      <h2 style={{ fontSize: 17 }}>Saved local picks</h2>
      <div style={{ fontSize: 12.5, color: "var(--muted)", margin: "3px 0 12px" }}>
        {ids.length
          ? `${ids.length} saved · tick the ones to send this tourist (unticking doesn't unsave).`
          : "Your go-to providers for fast recommendations."}
      </div>

      {ids.length > 0 && (
        <>
          <button
            onClick={showPassiveQR}
            style={{
              width: "100%",
              textAlign: "left",
              display: "flex",
              alignItems: "center",
              gap: 12,
              background: "var(--primary)",
              color: "#fff",
              borderRadius: 14,
              padding: 14,
              marginBottom: 14,
            }}
          >
            <span
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
            </span>
            <span style={{ flex: 1 }}>
              <span style={{ fontWeight: 800, fontSize: 14.5, display: "block" }}>Hotel Local Picks QR</span>
              <span style={{ fontSize: 11.5, color: "rgba(255,255,255,.88)", lineHeight: 1.4 }}>
                Permanent QR of all {ids.length} favourites — front desk, lobby standee, guest rooms
              </span>
            </span>
            <span style={{ fontSize: 18, opacity: 0.9 }}>›</span>
          </button>
          <div className="modehint" style={{ marginBottom: 12 }}>
            <span>
              💡 Passive QR helps tourists browse — it's what a guest scans when nobody is at the counter.
              For a specific question, use <b>Recommend</b> instead.
            </span>
          </div>
        </>
      )}

      {ids.length > 0 && (
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
          <div style={{ fontSize: 12, color: "var(--muted)" }}>
            <b style={{ color: "var(--ink)" }}>{sel.length}</b> of {ids.length} selected
          </div>
          <button
            style={{ fontSize: 12, color: "var(--primary)", fontWeight: 700 }}
            onClick={selectAllSaved}
          >
            {sel.length === ids.length ? "Clear all" : "Select all"}
          </button>
        </div>
      )}

      {sel.length > 0 && (
        <div style={{ marginBottom: 12 }}>
          <button
            className="btn btn-primary"
            onClick={() => {
              if (!sel.length) return toast("Select at least one pick");
              setPlanKind("custom");
              openModal({ kind: "shareset" });
            }}
          >
            <Icon name="share" size={16} /> Share {sel.length} selected pick{sel.length > 1 ? "s" : ""} to one
            tourist
          </button>
        </div>
      )}

      {ids.length ? (
        ids.map((id) => {
          const p = prov(id);
          const on = !shareDeselect.has(id);
          return (
            <div className="prow" key={id} style={{ alignItems: "center" }}>
              <button
                onClick={() => toggleDeselect(id)}
                style={{
                  width: 24,
                  height: 24,
                  borderRadius: 7,
                  border: `2px solid ${on ? "var(--primary)" : "var(--line)"}`,
                  background: on ? "var(--primary)" : "#fff",
                  color: "#fff",
                  display: "grid",
                  placeItems: "center",
                  flex: "none",
                  fontSize: 13,
                  fontWeight: 800,
                }}
              >
                {on ? "✓" : ""}
              </button>
              <div className="thumb" style={bg(p.img)} onClick={() => openProv(id)} />
              <div className="info" onClick={() => openProv(id)}>
                <h3>{p.name}</h3>
                <div className="m">
                  {p.cat} · {p.dist}
                </div>
                <div className="bd">
                  <LocalBadge />
                  {p.pick && <span className="badge b-pick">⭐ Staff pick</span>}
                </div>
              </div>
            </div>
          );
        })
      ) : (
        <div style={{ textAlign: "center", padding: "48px 20px", color: "var(--muted)" }}>
          <div style={{ fontSize: 40, marginBottom: 10 }}>🤍</div>
          <div style={{ fontWeight: 700, color: "var(--ink)", fontSize: 15 }}>No saved picks yet</div>
          <div style={{ fontSize: 13, marginTop: 6, lineHeight: 1.5 }}>
            Tap the heart on any provider to save it here for fast recommendations.
          </div>
          <div style={{ marginTop: 18 }}>
            <button
              className="btn btn-ghost"
              style={{ width: "auto", padding: "11px 18px", margin: "0 auto" }}
              onClick={() => go("home")}
            >
              <Icon name="spark" size={16} /> Find Local Picks
            </button>
          </div>
        </div>
      )}
    </Screen>
  );
}
