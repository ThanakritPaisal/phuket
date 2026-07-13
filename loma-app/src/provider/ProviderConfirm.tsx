import { useState } from "react";
import Icon from "../components/Icon";
import type { CatalogProvider } from "../types";
import { refFor } from "./lib";
import type { ProvScreen } from "./Chrome";

export function ProviderConfirm({
  p,
  onConfirm,
  toast,
}: {
  p: CatalogProvider;
  onConfirm: () => void;
  toast: (m: string) => void;
}) {
  const [code, setCode] = useState(refFor(p.id));
  const [spend, setSpend] = useState("");
  const [notes, setNotes] = useState("");
  return (
    <div className="pad">
      <h2 style={{ fontSize: 18 }}>Confirm tourist visit</h2>
      <div style={{ fontSize: 12.5, color: "var(--muted)", margin: "3px 0 14px" }}>
        Ask the tourist for their code or scan the QR.
      </div>
      <div className="h-sec">Referral code</div>
      <input className="pp-input" value={code} onChange={(e) => setCode(e.target.value)} placeholder="LOMA-XXXX" />
      <div style={{ margin: "12px 0" }}>
        <button className="btn btn-line" onClick={() => toast("Camera would open to scan QR")}>
          <Icon name="qr" size={16} /> Scan QR instead
        </button>
      </div>
      <div className="h-sec">Estimated spend (optional)</div>
      <input
        className="pp-input sm"
        placeholder="e.g. 620"
        inputMode="numeric"
        value={spend}
        onChange={(e) => setSpend(e.target.value)}
      />
      <div style={{ fontSize: 11.5, color: "var(--muted)", marginTop: 6 }}>
        Helps measure local economic impact. Never shown to tourists.
      </div>
      <div className="h-sec">Notes (optional)</div>
      <input
        className="pp-input sm"
        placeholder="e.g. ordered seafood set, very happy"
        value={notes}
        onChange={(e) => setNotes(e.target.value)}
      />
      <div style={{ marginTop: 18 }}>
        <button className="btn btn-primary" onClick={onConfirm}>
          <Icon name="check" size={16} /> Confirm visit
        </button>
      </div>
      <div
        style={{
          fontSize: 11.5,
          color: "var(--muted)",
          background: "var(--surface-2)",
          borderRadius: 9,
          padding: "9px 11px",
          marginTop: 12,
        }}
      >
        Keep it simple — no POS, no payment, no tourist personal data.
      </div>
    </div>
  );
}

export function ProviderDone({
  p,
  onGo,
}: {
  p: CatalogProvider;
  onGo: (s: ProvScreen) => void;
}) {
  return (
    <div className="confirm-ok">
      <div className="ck">
        <Icon name="check" size={40} />
      </div>
      <h2 style={{ fontSize: 20 }}>Visit confirmed</h2>
      <p style={{ fontSize: 13.5, color: "var(--ink-2)", marginTop: 8, maxWidth: 280, marginInline: "auto" }}>
        Thank you for supporting local tourism. This visit now counts toward Phuket's local impact
        dashboard.
      </p>
      <div className="kv" style={{ textAlign: "left", margin: "20px 16px 0" }}>
        <div>
          <div className="k">Referral</div>
          <div className="v" style={{ fontSize: 13 }}>
            {refFor(p.id)}
          </div>
        </div>
        <div>
          <div className="k">Recommended by</div>
          <div className="v" style={{ fontSize: 12 }}>
            Sea Breeze Hotel
          </div>
        </div>
      </div>
      <div style={{ margin: "18px 16px 0" }}>
        <button className="btn btn-ghost" onClick={() => onGo("leads")}>
          Back to leads
        </button>
      </div>
    </div>
  );
}
