import type { CatalogProvider } from "../../types";
import Icon from "../../components/Icon";
import { attribution, refFor, MiniQR } from "./helpers";

export default function Referral({ p, onBack }: { p: CatalogProvider; onBack: () => void }) {
  return (
    <div className="scroll pad" style={{ paddingTop: 22 }}>
      <div style={{ textAlign: "center" }}>
        <div style={{ fontSize: 13, color: "var(--muted)" }}>Show this at</div>
        <h2 style={{ fontSize: 19, marginTop: 2 }}>{p.name}</h2>
      </div>
      <div className="refcode" style={{ marginTop: 16 }}>
        <div className="lab">Your referral code</div>
        <div className="code">{refFor(p.id)}</div>
        <MiniQR seed={p.id} />
        <div style={{ fontSize: 11.5, color: "var(--muted)" }}>
          Show the code or QR. The provider scans it to confirm your visit — it helps local
          businesses get recognised.
        </div>
      </div>
      <div className="tc-by" style={{ marginTop: 16 }}>
        <div className="h">🏨</div>
        <div>
          <b>{attribution()}</b>
        </div>
      </div>
      <div style={{ marginTop: 14 }}>
        <button className="btn btn-line" onClick={onBack}>
          <Icon name="back" size={17} /> Back to recommendation
        </button>
      </div>
    </div>
  );
}
