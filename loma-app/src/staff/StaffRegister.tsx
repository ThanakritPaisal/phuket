import { useState } from "react";
import Icon from "../components/Icon";
import { ACCOUNTS_REAL as ACCOUNTS } from "../activeAccount";
import type { Account } from "../types";
import { AREAS, AREA_XY, type AuthScreen } from "./helpers";

function initials(s: string): string {
  return (
    String(s)
      .replace(/[^A-Za-z ]/g, "")
      .split(" ")
      .filter(Boolean)
      .slice(0, 2)
      .map((w) => w[0].toUpperCase())
      .join("") || "U"
  );
}

function mkAccount(p: Partial<Account>): Account {
  return {
    id: "acc" + Date.now(),
    name: "",
    type: "",
    area: "Patong",
    user: "",
    pass: "",
    staff: "",
    staffInit: "U",
    staffCount: 1,
    x: 52,
    y: 55,
    status: "active",
    level: "individual",
    kind: "individual",
    inviteCode: "",
    housePicks: [],
    ...p,
  };
}

export interface AuthProps {
  screen: AuthScreen;
  setScreen: (s: AuthScreen) => void;
  onSignIn: (a: Account) => void;
  pendingAcct: Account | null;
  setPendingAcct: (a: Account | null) => void;
  approveDemo: () => void;
  toast: (m: string) => void;
}

const CHANNELS = ["WhatsApp", "LINE", "QR", "SMS", "Copy link"];
const GUESTS = ["Family", "Backpacker", "Luxury", "Long-stay", "Digital nomad", "Domestic", "Mixed"];
const ORG_TYPES = [
  "Hotel",
  "Hostel",
  "Guesthouse",
  "Villa / property manager",
  "Car rental",
  "Motorbike rental",
  "Transfer / driver company",
  "Guide company",
];

function BackHead({ onBack, title }: { onBack: () => void; title: string }) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 4 }}>
      <button onClick={onBack} style={{ width: 30, height: 30, borderRadius: "50%", background: "var(--surface-2)", display: "grid", placeItems: "center" }}>
        <Icon name="back" size={18} />
      </button>
      <h2 style={{ fontSize: 18 }}>{title}</h2>
    </div>
  );
}

function ConsentBtn({ on, toggle }: { on: boolean; toggle: () => void }) {
  return (
    <button
      onClick={toggle}
      style={{
        justifyContent: "flex-start",
        textAlign: "left",
        fontSize: 12,
        lineHeight: 1.4,
        width: "100%",
        border: `1px solid ${on ? "#BFE6CF" : "var(--line)"}`,
        borderRadius: 11,
        padding: "11px 12px",
        display: "flex",
        gap: 9,
        alignItems: "flex-start",
        background: on ? "var(--ok-l)" : "var(--surface)",
      }}
    >
      <span style={{ fontWeight: 800, color: on ? "var(--ok)" : "var(--muted)" }}>{on ? "✓" : "☐"}</span>
      <span style={{ color: "var(--ink-2)" }}>
        I agree my recommendations are tracked anonymously for impact, and I won't share tourist personal data.
      </span>
    </button>
  );
}

function PhoneRow({ verified, onVerify }: { verified: boolean; onVerify: () => void }) {
  return (
    <div style={{ display: "flex", gap: 8, marginBottom: 2 }}>
      <input className="pp-input sm" placeholder="Mobile phone" inputMode="tel" style={{ flex: 1, margin: 0 }} />
      <button
        className={`btn btn-line ${verified ? "doc-ok" : ""}`}
        style={{ width: "auto", padding: "0 14px", whiteSpace: "nowrap" }}
        onClick={onVerify}
      >
        {verified ? "✓ Verified" : "Verify"}
      </button>
    </div>
  );
}

export default function StaffRegister(props: AuthProps) {
  const { screen, setScreen, onSignIn, pendingAcct, approveDemo, toast } = props;

  const [role, setRole] = useState("");
  const [type, setType] = useState("Hotel");
  const [area, setArea] = useState("Patong");
  const [opAreas, setOpAreas] = useState<string[]>([]);
  const [channel, setChannel] = useState("WhatsApp");
  const [guest, setGuest] = useState("Mixed");
  const [phoneVerified, setPhoneVerified] = useState(false);
  const [consent, setConsent] = useState(false);
  const [name, setName] = useState("");
  const [contact, setContact] = useState("");
  const [code, setCode] = useState("");
  const [err, setErr] = useState("");

  const toggleArea = (a: string) =>
    setOpAreas((prev) => (prev.includes(a) ? prev.filter((x) => x !== a) : [...prev, a]));

  /* ---------- role picker ---------- */
  if (screen === "rolePick") {
    const roles: [string, AuthScreen | "regOrg" | "regIndividual", string, string][] = [
      ["Accommodation", "regOrg", "🏨", "Hotel · hostel · guesthouse · villa"],
      ["Car / motorbike rental", "regOrg", "🛵", "Set up a partner profile + dashboard"],
      ["Driver / taxi / transfer", "regIndividual", "🚕", "Quick personal sign-up"],
      ["Local guide", "regIndividual", "🧭", "Quick personal sign-up"],
      ["Other", "regIndividual", "✨", "Quick personal sign-up"],
    ];
    return (
      <div className="scroll">
        <div style={{ padding: 22 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 4 }}>
            <button onClick={() => setScreen("login")} style={{ width: 30, height: 30, borderRadius: "50%", background: "var(--surface-2)", display: "grid", placeItems: "center" }}>
              <Icon name="back" size={18} />
            </button>
            <h2 style={{ fontSize: 19 }}>How do you use LOMA?</h2>
          </div>
          <div style={{ fontSize: 12.5, color: "var(--muted)", marginBottom: 6 }}>
            Pick what fits you. We only ask for what's needed — most people start in under a minute.
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 9, marginTop: 10 }}>
            {roles.map(([l, target, e, sub]) => (
              <button
                key={l}
                className="prow"
                style={{ width: "100%", textAlign: "left", cursor: "pointer" }}
                onClick={() => {
                  setRole(l);
                  setErr("");
                  setScreen(target as AuthScreen);
                }}
              >
                <div style={{ width: 42, height: 42, borderRadius: 11, background: "var(--primary-l)", display: "grid", placeItems: "center", fontSize: 20, flex: "none" }}>
                  {e}
                </div>
                <div className="info">
                  <h3 style={{ fontSize: 14 }}>{l}</h3>
                  <div className="m" style={{ fontSize: 11.5 }}>
                    {sub}
                  </div>
                </div>
                <div style={{ alignSelf: "center", color: "var(--muted)", fontSize: 18 }}>›</div>
              </button>
            ))}
          </div>
        </div>
      </div>
    );
  }

  /* ---------- individual ---------- */
  if (screen === "regIndividual") {
    const submit = () => {
      const miss: string[] = [];
      if (!name.trim()) miss.push("your name");
      if (!phoneVerified) miss.push("phone verification");
      if (!consent) miss.push("consent");
      if (miss.length) return setErr("Please complete: " + miss.join(", ") + ".");
      const a0 = opAreas[0] || "Patong";
      const xy = AREA_XY[a0] || [52, 55];
      onSignIn(
        mkAccount({
          name,
          type: role || "Individual",
          area: a0,
          staff: name,
          staffInit: initials(name),
          x: xy[0],
          y: xy[1],
          level: "individual",
          kind: "individual",
        })
      );
      toast("Welcome to LOMA · Level 1");
    };
    return (
      <div className="scroll">
        <div style={{ padding: "20px 22px" }}>
          <BackHead onBack={() => setScreen("rolePick")} title="Quick sign-up" />
          <div style={{ fontSize: 12.5, color: "var(--muted)", marginBottom: 8 }}>
            {role || "Individual"} · active right away — get a verified badge later.
          </div>
          <div className="h-sec">Your name</div>
          <input className="pp-input sm" placeholder="Name or nickname" value={name} onChange={(e) => setName(e.target.value)} />
          <div className="h-sec">Phone</div>
          <PhoneRow verified={phoneVerified} onVerify={() => setPhoneVerified((v) => !v)} />
          <div className="h-sec">Work areas</div>
          <div className="chips">
            {AREAS.map((a) => (
              <button key={a} className={`chip ${opAreas.includes(a) ? "on" : ""}`} onClick={() => toggleArea(a)}>
                {a}
              </button>
            ))}
          </div>
          <div className="h-sec">Preferred share channel</div>
          <div className="chips">
            {CHANNELS.map((c) => (
              <button key={c} className={`chip ${channel === c ? "on" : ""}`} onClick={() => setChannel(c)}>
                {c}
              </button>
            ))}
          </div>
          <div className="h-sec">Consent</div>
          <ConsentBtn on={consent} toggle={() => setConsent((c) => !c)} />
          {err && <ErrBox msg={err} />}
          <div style={{ marginTop: 16 }}>
            <button className="btn btn-primary" onClick={submit}>
              <Icon name="spark" size={16} /> Start using LOMA
            </button>
          </div>
          <Foot>Level 1 · Registered User. Search &amp; share now; verify later for a badge, dashboard &amp; official attribution.</Foot>
        </div>
      </div>
    );
  }

  /* ---------- organization ---------- */
  if (screen === "regOrg") {
    const submit = () => {
      const miss: string[] = [];
      if (!name.trim()) miss.push("business name");
      if (!phoneVerified) miss.push("phone verification");
      if (!consent) miss.push("consent");
      if (miss.length) return setErr("Please complete: " + miss.join(", ") + ".");
      const xy = AREA_XY[area] || [52, 55];
      const invite = (name.replace(/[^A-Za-z]/g, "").toUpperCase().slice(0, 8) || "PARTNER") + "24";
      onSignIn(
        mkAccount({
          name,
          type,
          area,
          staff: contact || name,
          staffInit: initials(name),
          x: xy[0],
          y: xy[1],
          level: "org",
          kind: "org",
          inviteCode: invite,
        })
      );
      toast("Partner created · invite code " + invite);
    };
    return (
      <div className="scroll">
        <div style={{ padding: "20px 22px" }}>
          <BackHead onBack={() => setScreen("rolePick")} title="Set up your partner" />
          <div style={{ fontSize: 12.5, color: "var(--muted)", marginBottom: 8 }}>
            You'll get a dashboard right away. Verify later for the official “Recommended by” badge.
          </div>
          <div className="h-sec">Business name</div>
          <input className="pp-input sm" placeholder="e.g. Andaman View Guesthouse" value={name} onChange={(e) => setName(e.target.value)} />
          <div className="h-sec">Partner type</div>
          <div className="chips">
            {ORG_TYPES.map((t) => (
              <button key={t} className={`chip ${type === t ? "on" : ""}`} onClick={() => setType(t)}>
                {t}
              </button>
            ))}
          </div>
          <div className="h-sec">Location</div>
          <input className="pp-input sm" placeholder="Google Maps link (optional)" style={{ marginBottom: 8 }} />
          <div className="chips">
            {AREAS.map((a) => (
              <button key={a} className={`chip ${area === a ? "on" : ""}`} onClick={() => setArea(a)}>
                {a}
              </button>
            ))}
          </div>
          <div className="h-sec">Contact person</div>
          <input className="pp-input sm" placeholder="Name of contact" value={contact} onChange={(e) => setContact(e.target.value)} />
          <div className="h-sec">Phone</div>
          <PhoneRow verified={phoneVerified} onVerify={() => setPhoneVerified((v) => !v)} />
          <div className="h-sec">Main guest type</div>
          <div className="chips">
            {GUESTS.map((g) => (
              <button key={g} className={`chip ${guest === g ? "on" : ""}`} onClick={() => setGuest(g)}>
                {g}
              </button>
            ))}
          </div>
          <div className="h-sec">Consent</div>
          <ConsentBtn on={consent} toggle={() => setConsent((c) => !c)} />
          {err && <ErrBox msg={err} />}
          <div style={{ marginTop: 16 }}>
            <button className="btn btn-primary" onClick={submit}>
              <Icon name="check" size={16} /> Create partner
            </button>
          </div>
          <Foot>
            Level 2 · Registered Organization. Dashboard + a staff invite code now. No business documents needed
            yet — verify later for the badge &amp; official attribution.
          </Foot>
        </div>
      </div>
    );
  }

  /* ---------- staff join ---------- */
  if (screen === "regStaff") {
    const submit = () => {
      const miss: string[] = [];
      if (!name.trim()) miss.push("your name");
      if (!phoneVerified) miss.push("phone verification");
      if (!code.trim()) miss.push("invite code");
      if (!consent) miss.push("consent");
      if (miss.length) return setErr("Please complete: " + miss.join(", ") + ".");
      const org = ACCOUNTS.find((a) => a.inviteCode && a.inviteCode === code.trim().toUpperCase());
      if (!org) return setErr("Invite code not found. Ask your manager for the correct code (try SEABREEZE24).");
      onSignIn(
        mkAccount({
          id: "s" + Date.now(),
          name: org.name,
          type: "Staff",
          area: org.area,
          staff: name,
          staffInit: initials(name),
          x: org.x,
          y: org.y,
          level: org.level,
          kind: "org-staff",
          inviteCode: org.inviteCode,
        })
      );
      toast("Joined " + org.name);
    };
    return (
      <div className="scroll">
        <div style={{ padding: "20px 22px" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 4 }}>
            <button onClick={() => setScreen("login")} style={{ width: 30, height: 30, borderRadius: "50%", background: "var(--surface-2)", display: "grid", placeItems: "center" }}>
              <Icon name="back" size={18} />
            </button>
            <h2 style={{ fontSize: 18 }}>Join your property</h2>
          </div>
          <div style={{ fontSize: 12.5, color: "var(--muted)", marginBottom: 8 }}>
            Front-desk / concierge / rental staff — enter the invite code from your manager to join their LOMA
            workspace.
          </div>
          <div className="h-sec">Your name</div>
          <input className="pp-input sm" placeholder="Name or nickname" value={name} onChange={(e) => setName(e.target.value)} />
          <div className="h-sec">Phone</div>
          <PhoneRow verified={phoneVerified} onVerify={() => setPhoneVerified((v) => !v)} />
          <div className="h-sec">Property invite code</div>
          <input
            className="pp-input"
            placeholder="e.g. SEABREEZE24"
            style={{ textTransform: "uppercase", letterSpacing: 1 }}
            value={code}
            onChange={(e) => setCode(e.target.value)}
          />
          <div style={{ fontSize: 11, color: "var(--muted)", marginTop: 6 }}>
            Ask your manager for the code. You'll join their verified property and recommend on its behalf.
          </div>
          <div className="h-sec">Consent</div>
          <ConsentBtn on={consent} toggle={() => setConsent((c) => !c)} />
          {err && <ErrBox msg={err} />}
          <div style={{ marginTop: 16 }}>
            <button className="btn btn-primary" onClick={submit}>
              <Icon name="check" size={16} /> Join property
            </button>
          </div>
          <Foot>
            🔒 Staff can only join via a valid invite code — no self-declared properties. This keeps every
            recommendation tied to a verified business.
          </Foot>
        </div>
      </div>
    );
  }

  /* ---------- pending ---------- */
  const a = pendingAcct;
  return (
    <div className="scroll">
      <div style={{ flex: 1, display: "flex", flexDirection: "column", justifyContent: "center", padding: "30px 24px", textAlign: "center", minHeight: "100%" }}>
        <div style={{ width: 74, height: 74, borderRadius: "50%", background: "var(--warn-l)", color: "var(--warn)", display: "grid", placeItems: "center", margin: "0 auto 16px", fontSize: 34 }}>
          🕓
        </div>
        <h2 style={{ fontSize: 20 }}>Account under review</h2>
        <p style={{ fontSize: 13.5, color: "var(--ink-2)", marginTop: 8, maxWidth: 310, marginInline: "auto" }}>
          <b>{a?.name || "Your business"}</b> has been submitted. The LOMA team is verifying your identity,
          ownership and documents. You can sign in once it's approved — usually within 1 business day.
        </p>
        <div className="kv" style={{ textAlign: "left", margin: "20px auto 0", maxWidth: 320 }}>
          <div>
            <div className="k">Username</div>
            <div className="v" style={{ fontSize: 13 }}>
              {a?.user || "—"}
            </div>
          </div>
          <div>
            <div className="k">Status</div>
            <div className="v" style={{ fontSize: 13, color: "var(--warn)" }}>
              Pending approval
            </div>
          </div>
        </div>
        <div style={{ fontSize: 11.5, color: "var(--muted)", maxWidth: 320, margin: "14px auto 0" }}>
          Reviewers see your application under <b>Admin → Partner approvals</b>. For this demo, approve it
          yourself below.
        </div>
        <div style={{ marginTop: 12, maxWidth: 320, marginInline: "auto" }}>
          <button className="btn btn-soft" onClick={approveDemo}>
            ⚡ (Demo) Approve as LOMA admin
          </button>
        </div>
        <div style={{ marginTop: 10, maxWidth: 320, marginInline: "auto" }}>
          <button className="btn btn-line" onClick={() => setScreen("login")}>
            Back to sign in
          </button>
        </div>
      </div>
    </div>
  );
}

function ErrBox({ msg }: { msg: string }) {
  return (
    <div style={{ color: "var(--danger)", fontSize: 12.5, marginTop: 10, background: "var(--danger-l)", padding: "9px 11px", borderRadius: 9 }}>
      {msg}
    </div>
  );
}
function Foot({ children }: { children: React.ReactNode }) {
  return (
    <div style={{ fontSize: 11.5, color: "var(--muted)", background: "var(--surface-2)", borderRadius: 9, padding: "9px 11px", marginTop: 12 }}>
      {children}
    </div>
  );
}
