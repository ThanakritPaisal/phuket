import type { CatalogProvider } from "../../types";
import Icon from "../../components/Icon";
import { PARTNER } from "./helpers";

export default function Thanks({
  p,
  onMore,
  onBack,
}: {
  p: CatalogProvider;
  onMore: () => void;
  onBack: () => void;
}) {
  return (
    <div
      className="scroll"
      style={{
        display: "flex",
        flexDirection: "column",
        justifyContent: "center",
        padding: "34px 26px",
        textAlign: "center",
      }}
    >
      <div
        style={{
          width: 78,
          height: 78,
          borderRadius: "50%",
          background: "var(--ok-l)",
          color: "var(--ok)",
          display: "grid",
          placeItems: "center",
          margin: "0 auto 18px",
          fontSize: 40,
        }}
      >
        ✓
      </div>
      <h2 style={{ fontSize: 22 }}>Thank you! 🙏</h2>
      <p
        style={{
          fontSize: 13.5,
          color: "var(--ink-2)",
          marginTop: 10,
          maxWidth: 300,
          marginInline: "auto",
          lineHeight: 1.55,
        }}
      >
        Your feedback on <b>{p.name}</b> is in. It helps {PARTNER.name} recommend better and
        supports local Phuket businesses.
      </p>
      <div
        style={{
          fontSize: 11.5,
          color: "var(--muted)",
          background: "var(--surface-2)",
          borderRadius: 9,
          padding: "9px 12px",
          margin: "18px auto 0",
          maxWidth: 300,
        }}
      >
        🔒 Shared privately with the place, the property that recommended it, and LOMA — never
        posted publicly.
      </div>
      <div style={{ marginTop: 20, maxWidth: 300, marginInline: "auto" }}>
        <button className="btn btn-primary" onClick={onMore}>
          <Icon name="spark" size={17} /> See more local picks
        </button>
      </div>
      <div style={{ marginTop: 10, maxWidth: 300, marginInline: "auto" }}>
        <button className="btn btn-line" onClick={onBack}>
          Back to recommendation
        </button>
      </div>
    </div>
  );
}
