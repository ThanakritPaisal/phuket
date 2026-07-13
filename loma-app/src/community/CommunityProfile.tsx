import { useState, type ReactNode } from "react";
import Icon from "../components/Icon";
import { readiness } from "./lib";
import { READINESS_LEVELS } from "../v2data";
import type { CommScreenProps } from "./CommunityApp";

export default function CommunityProfile({
  c,
  acct,
  toast,
  onSignOut,
}: CommScreenProps & { onSignOut: () => void }) {
  const rl = readiness(c);
  // Local, editable copy — the community only ever edits ITS OWN details.
  const [name, setName] = useState(c.name);
  const [about, setAbout] = useState(c.about);
  const [priceFrom, setPriceFrom] = useState(c.priceFrom);
  const [duration, setDuration] = useState(c.duration);
  const [phone, setPhone] = useState(c.phone);

  return (
    <>
      <div className="ed-top">
        <h1>
          This is what
          <br />
          they see.
        </h1>
        <div className="sub">Complete details raise your readiness — never your ranking.</div>
      </div>

      <div className="pad" style={{ paddingTop: 12 }}>
        <div style={{ display: "flex", gap: 5, flexWrap: "wrap", marginBottom: 12 }}>
          <span className="badge b-pick">
            {c.emo} Community Experience
          </span>
          <span className={`badge ${rl.cls}`}>{rl.label}</span>
        </div>

        <div className="h-sec">Readiness ladder</div>
        <div className="specs">
          {READINESS_LEVELS.map((lvl, i) => (
            <div className="r" key={lvl}>
              <span>
                {i <= rl.level ? "✓" : "○"} {lvl}
              </span>
              <b style={{ color: i === rl.level ? "var(--primary)" : "var(--muted)" }}>
                {i === rl.level ? "You are here" : i < rl.level ? "Done" : ""}
              </b>
            </div>
          ))}
        </div>

        <div className="h-sec">What you offer</div>
        {c.activities.map((a) => (
          <div key={a} style={{ display: "flex", gap: 9, alignItems: "flex-start", marginBottom: 8 }}>
            <span style={{ color: "var(--accent)", fontWeight: 800 }}>✓</span>
            <span style={{ fontSize: 13.5, color: "var(--ink-2)", lineHeight: 1.5 }}>{a}</span>
          </div>
        ))}

        <div className="h-sec">When you run it</div>
        <div className="specs">
          {c.schedule.map((s) => (
            <div className="r" key={s}>
              <span style={{ color: "var(--ink-2)" }}>{s}</span>
            </div>
          ))}
        </div>

        <div className="h-sec">Your details</div>
        <Field label="Community name">
          <input className="pp-input sm" value={name} onChange={(e) => setName(e.target.value)} />
        </Field>
        <Field label="About your community">
          <textarea className="pp-input sm" rows={4} value={about} onChange={(e) => setAbout(e.target.value)} />
        </Field>
        <Field label="Price (published to tourists)">
          <input className="pp-input sm" value={priceFrom} onChange={(e) => setPriceFrom(e.target.value)} />
        </Field>
        <Field label="Programme length">
          <input className="pp-input sm" value={duration} onChange={(e) => setDuration(e.target.value)} />
        </Field>
        <Field label="Phone / LINE">
          <input className="pp-input sm" value={phone} onChange={(e) => setPhone(e.target.value)} />
        </Field>

        <div style={{ marginTop: 14 }}>
          <button
            className="btn btn-coral"
            onClick={() => toast("Saved — tourists see this immediately")}
          >
            <Icon name="check" size={16} /> Save — tourists see this immediately
          </button>
        </div>

        <div className="modehint" style={{ marginTop: 10 }}>
          🛡 You can never pay LOMA to appear higher. Filling this in only proves you are <b>ready for tourists</b>.
        </div>

        <div style={{ marginTop: 16 }}>
          <button className="btn btn-line" onClick={onSignOut}>
            Sign out {acct.person ? `· ${acct.person}` : ""}
          </button>
        </div>
        <div style={{ height: 16 }} />
      </div>
    </>
  );
}

function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div style={{ marginBottom: 10 }}>
      <div
        style={{
          fontSize: 11,
          fontWeight: 700,
          color: "var(--muted)",
          textTransform: "uppercase",
          letterSpacing: ".3px",
          marginBottom: 4,
        }}
      >
        {label}
      </div>
      {children}
    </div>
  );
}
