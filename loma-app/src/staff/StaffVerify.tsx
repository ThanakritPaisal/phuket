import { useState } from "react";
import Icon from "../components/Icon";
import { AREAS, useStaff } from "./helpers";

const FIXED_TYPES = ["Hotel", "Hostel", "Guesthouse", "Villa manager", "Car rental", "Motorbike rental"];
const MOBILE_TYPES = ["Taxi / private driver", "Tuk-tuk", "Freelance tour guide"];
const ALL_TYPES = [...FIXED_TYPES, ...MOBILE_TYPES];

type DocKey = "license" | "id" | "storefront" | "permit";

export default function StaffVerify() {
  const { partner, go, toast } = useStaff();
  const [type, setType] = useState(FIXED_TYPES.includes(partner.type) ? partner.type : "Hotel");
  const [area, setArea] = useState(partner.area || "Patong");
  const [opAreas, setOpAreas] = useState<string[]>([]);
  const [phoneVerified, setPhoneVerified] = useState(false);
  const [docs, setDocs] = useState<Record<DocKey, boolean>>({ license: false, id: false, storefront: false, permit: false });

  const mobile = MOBILE_TYPES.includes(type);
  const vehicle = /Taxi|Tuk-tuk/.test(type);
  const guide = /guide/i.test(type);

  const toggleArea = (a: string) =>
    setOpAreas((prev) => (prev.includes(a) ? prev.filter((x) => x !== a) : [...prev, a]));
  const toggleDoc = (k: DocKey) => setDocs((d) => ({ ...d, [k]: !d[k] }));

  const licLabel = mobile ? (guide ? "professional guide licence" : "driver's licence") : "business licence / TAT cert";
  const idLabel = mobile ? "national ID card" : "owner ID card";
  const photoLabel = mobile
    ? vehicle
      ? "vehicle photo with plate"
      : "guide licence card photo"
    : "storefront photo with signage";

  const DocBtn = ({ k, label }: { k: DocKey; label: string }) => (
    <button
      className={`btn btn-line ${docs[k] ? "doc-ok" : ""}`}
      style={{ justifyContent: "flex-start", fontSize: 12.5 }}
      onClick={() => toggleDoc(k)}
    >
      {docs[k] ? "✓ " + label + " uploaded" : "⬆ Upload " + label}
    </button>
  );

  const submit = () => {
    toast("Submitted for verification — pending LOMA review");
    go("settings");
  };

  return (
    <div className="scroll">
      <div style={{ padding: "20px 22px" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 6 }}>
          <button onClick={() => go("settings")} style={{ width: 30, height: 30, borderRadius: "50%", background: "var(--surface-2)", display: "grid", placeItems: "center" }}>
            <Icon name="back" size={18} />
          </button>
          <h2 style={{ fontSize: 18 }}>Get Verified</h2>
        </div>
        <div style={{ fontSize: 12.5, color: "var(--muted)", marginBottom: 6 }}>
          Upgrade to a Verified Partner (Level 3) for the official “Recommended by” badge, attribution and
          incentives. This is the only step that needs documents.
        </div>

        <div className="h-sec">Partner type</div>
        <div className="chips">
          {ALL_TYPES.map((x) => (
            <button key={x} className={`chip ${type === x ? "on" : ""}`} onClick={() => setType(x)}>
              {x}
            </button>
          ))}
        </div>

        <div className="h-sec">{mobile ? "You & your service" : "Business identity"}</div>
        <input
          className="pp-input sm"
          placeholder={mobile ? "Your name + service (e.g. Somchai · Phuket Taxi)" : "Trading / display name"}
          style={{ marginBottom: 8 }}
        />
        {!mobile && <input className="pp-input sm" placeholder="Legal registered name (e.g. Andaman View Co., Ltd.)" />}

        {mobile ? (
          <>
            <div className="h-sec">Operating areas</div>
            <div className="chips">
              {AREAS.map((a) => (
                <button key={a} className={`chip ${opAreas.includes(a) ? "on" : ""}`} onClick={() => toggleArea(a)}>
                  {a}
                </button>
              ))}
            </div>
          </>
        ) : (
          <>
            <div className="h-sec">Area</div>
            <div className="chips">
              {AREAS.map((a) => (
                <button key={a} className={`chip ${area === a ? "on" : ""}`} onClick={() => setArea(a)}>
                  {a}
                </button>
              ))}
            </div>
          </>
        )}

        <div className="h-sec">Contact</div>
        <div style={{ display: "flex", gap: 8, marginBottom: 8 }}>
          <input className="pp-input sm" placeholder={mobile ? "Mobile phone" : "Business phone"} inputMode="tel" style={{ flex: 1, margin: 0 }} />
          <button
            className={`btn btn-line ${phoneVerified ? "doc-ok" : ""}`}
            style={{ width: "auto", padding: "0 14px", whiteSpace: "nowrap" }}
            onClick={() => setPhoneVerified((v) => !v)}
          >
            {phoneVerified ? "✓ Verified" : "Verify"}
          </button>
        </div>

        <div className="h-sec">Verification documents</div>
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          <DocBtn k="license" label={licLabel} />
          <DocBtn k="id" label={idLabel} />
          <DocBtn k="storefront" label={photoLabel} />
          {vehicle && <DocBtn k="permit" label="public-transport / taxi permit" />}
        </div>

        <div style={{ marginTop: 16 }}>
          <button className="btn btn-primary" onClick={submit}>
            <Icon name="check" size={16} /> Submit for verification
          </button>
        </div>
        <div style={{ fontSize: 11.5, color: "var(--muted)", background: "var(--surface-2)", borderRadius: 9, padding: "9px 11px", marginTop: 12 }}>
          🔒 LOMA cross-checks your registered name against the public DBD registry and confirms your Google
          listing before you go live.
        </div>
        <div style={{ height: 12 }} />
      </div>
    </div>
  );
}
