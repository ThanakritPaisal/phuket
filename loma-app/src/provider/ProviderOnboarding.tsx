import { useState } from "react";
import Icon from "../components/Icon";
import { operator, catEmoji } from "../mock";
import {
  PROVIDER_ACCOUNTS,
  GOOGLE_RESULTS,
  AREAS,
  REG_CATS,
  type ProviderAccount,
  type GoogleResult,
} from "./lib";
import Photo from "./Photo";

/* ---------------- Provider sign in ---------------- */
export function ProviderLogin({
  onLogin,
  onRegister,
}: {
  onLogin: (acct: ProviderAccount) => void;
  onRegister: () => void;
}) {
  const [user, setUser] = useState("");
  const [pass, setPass] = useState("");
  const [err, setErr] = useState("");

  const signIn = () => {
    const acct = PROVIDER_ACCOUNTS.find((a) => a.user === user.trim() && a.pass === pass);
    if (!acct) {
      setErr("Wrong username or password. Try a demo account below.");
      return;
    }
    onLogin(acct);
  };

  return (
    <div style={{ flex: 1, display: "flex", flexDirection: "column", justifyContent: "center", padding: "26px 22px" }}>
      <div style={{ textAlign: "center", marginBottom: 20 }}>
        <div
          style={{
            width: 54,
            height: 54,
            borderRadius: 15,
            background: "linear-gradient(135deg,var(--primary),#19a89c)",
            display: "grid",
            placeItems: "center",
            color: "#fff",
            fontWeight: 800,
            fontSize: 26,
            margin: "0 auto 12px",
          }}
        >
          L
        </div>
        <h2 style={{ fontSize: 21 }}>Provider sign in</h2>
        <div style={{ fontSize: 12.5, color: "var(--muted)", marginTop: 3 }}>
          For local businesses recommended through LOMA
        </div>
      </div>
      <div className="h-sec">Username</div>
      <input className="pp-input sm" value={user} onChange={(e) => setUser(e.target.value)} placeholder="e.g. baanrimtalay" autoComplete="off" />
      <div className="h-sec">Password</div>
      <input className="pp-input sm" type="password" value={pass} onChange={(e) => setPass(e.target.value)} placeholder="••••••••" autoComplete="off" />
      {err && (
        <div style={{ color: "var(--danger)", fontSize: 12.5, marginTop: 10, background: "var(--danger-l)", padding: "9px 11px", borderRadius: 9 }}>
          {err}
        </div>
      )}
      <div style={{ marginTop: 16 }}>
        <button className="btn btn-primary" onClick={signIn}>
          Sign in
        </button>
      </div>
      <div style={{ textAlign: "center", marginTop: 13, fontSize: 13, color: "var(--muted)" }}>
        New local business?{" "}
        <a onClick={onRegister} style={{ color: "var(--primary)", fontWeight: 700, cursor: "pointer" }}>
          List your business →
        </a>
      </div>
      <div style={{ marginTop: 22, borderTop: "1px solid var(--line)", paddingTop: 14 }}>
        <div style={{ fontSize: 11, fontWeight: 700, textTransform: "uppercase", letterSpacing: ".4px", color: "var(--muted)", marginBottom: 9 }}>
          Demo accounts — tap to fill
        </div>
        {PROVIDER_ACCOUNTS.map((a) => {
          const p = operator(a.provId);
          if (!p) return null;
          return (
            <div
              className="prow"
              key={a.user}
              onClick={() => {
                setUser(a.user);
                setPass(a.pass);
                setErr("");
              }}
            >
              <Photo img={p.img} emo={p.emo} size={42} />
              <div className="info">
                <h3 style={{ fontSize: 13.5 }}>{p.name}</h3>
                <div className="m" style={{ fontSize: 11.5 }}>
                  👤 {a.user} &nbsp;·&nbsp; 🔑 {a.pass}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

/* ---------------- List your business ---------------- */
export function ProviderRegister({
  onBack,
  onSubmit,
  toast,
}: {
  onBack: () => void;
  onSubmit: () => void;
  toast: (m: string) => void;
}) {
  const [cat, setCat] = useState("Local Food");
  const [area, setArea] = useState("Patong");
  const [imported, setImported] = useState<GoogleResult | null>(null);
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<GoogleResult[]>([]);
  const [docs, setDocs] = useState<{ license: boolean; storefront: boolean }>({ license: false, storefront: false });
  const [phoneVerified, setPhoneVerified] = useState(false);
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");

  const search = () => {
    const q = query.trim().toLowerCase();
    setResults(q ? GOOGLE_RESULTS.filter((r) => r.name.toLowerCase().includes(q)) : GOOGLE_RESULTS);
  };
  const importResult = (r: GoogleResult) => {
    setImported(r);
    setName(r.name);
    setPhone(r.phone);
    setCat(r.cat);
    setArea(r.area);
    setResults([]);
    toast("Imported from Google");
  };

  const docBtn = (k: "license" | "storefront", label: string) => {
    const ok = docs[k];
    return (
      <button
        className="btn btn-line"
        onClick={() => setDocs((d) => ({ ...d, [k]: true }))}
        style={{
          justifyContent: "flex-start",
          fontSize: 12.5,
          ...(ok ? { color: "var(--ok)", borderColor: "#BFE6CF", background: "var(--ok-l)" } : {}),
        }}
      >
        {ok ? `✓ ${label} uploaded` : `⬆ Upload ${label}`}
      </button>
    );
  };

  return (
    <div style={{ padding: "20px 22px" }}>
      <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 6 }}>
        <button
          onClick={onBack}
          style={{ width: 30, height: 30, borderRadius: "50%", background: "var(--surface-2)", display: "grid", placeItems: "center" }}
        >
          <Icon name="back" size={16} />
        </button>
        <h2 style={{ fontSize: 18 }}>List your business</h2>
      </div>
      <div style={{ fontSize: 12.5, color: "var(--muted)", marginBottom: 10 }}>
        Apply to be a verified local provider. The LOMA team checks every business before it can
        receive tourist leads.
      </div>

      {/* Google import */}
      <div style={{ border: "1px solid var(--line)", borderRadius: 12, padding: 12, background: "var(--surface-2)", marginBottom: 6 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 7 }}>
          <span style={{ width: 22, height: 22, borderRadius: 6, background: "#fff", border: "1px solid var(--line)", display: "grid", placeItems: "center", fontWeight: 800, fontSize: 13, color: "#4285F4" }}>
            G
          </span>
          <b style={{ fontSize: 13.5 }}>Import from Google</b>
        </div>
        <div style={{ fontSize: 11.5, color: "var(--muted)", marginBottom: 9 }}>
          Already on Google Maps? Find your business to auto-fill everything.
        </div>
        <div style={{ display: "flex", gap: 8 }}>
          <input
            className="pp-input sm"
            placeholder="Search your business name"
            style={{ flex: 1, margin: 0 }}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
          <button className="btn btn-primary" onClick={search} style={{ width: "auto", padding: "0 16px" }}>
            Search
          </button>
        </div>
        {results.length > 0 && (
          <div style={{ marginTop: 9 }}>
            {results.map((r) => (
              <div className="prow" key={r.name} onClick={() => importResult(r)} style={{ marginBottom: 6 }}>
                <Photo img={r.img} emo="📍" size={42} />
                <div className="info">
                  <h3 style={{ fontSize: 13 }}>{r.name}</h3>
                  <div className="m">
                    {r.rating}★ · {r.reviews} reviews · {r.area}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
      {imported && (
        <div style={{ display: "flex", gap: 10, alignItems: "center", background: "var(--ok-l)", border: "1px solid #BFE6CF", borderRadius: 11, padding: "10px 11px", marginBottom: 6 }}>
          <Photo img={imported.img} emo="📍" size={44} radius={9} />
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: 12.5, fontWeight: 700 }}>✓ Imported from Google</div>
            <div style={{ fontSize: 11, color: "var(--ink-2)" }}>
              {imported.rating}★ · {imported.reviews} reviews · owner-claimed listing counts toward
              verification
            </div>
          </div>
        </div>
      )}

      <div className="h-sec">Business name</div>
      <input className="pp-input sm" value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Chalong Seafood House" />
      <div className="h-sec">Category</div>
      <div className="chips">
        {REG_CATS.map((c) => (
          <button key={c} className={`chip ${cat === c ? "on" : ""}`} onClick={() => setCat(c)}>
            {catEmoji(c)} {c}
          </button>
        ))}
      </div>
      <div className="h-sec">Area</div>
      <div className="chips">
        {AREAS.map((a) => (
          <button key={a} className={`chip ${area === a ? "on" : ""}`} onClick={() => setArea(a)}>
            {a}
          </button>
        ))}
      </div>
      {imported && (
        <>
          <div className="h-sec">Imported details</div>
          <div className="kv">
            <div>
              <div className="k">Address</div>
              <div className="v" style={{ fontSize: 11.5 }}>
                {imported.address}
              </div>
            </div>
            <div>
              <div className="k">Hours</div>
              <div className="v" style={{ fontSize: 11.5 }}>
                {imported.hours}
              </div>
            </div>
          </div>
        </>
      )}
      <div className="h-sec">Owner / contact</div>
      <input className="pp-input sm" placeholder="Owner full name" style={{ marginBottom: 8 }} />
      <div style={{ display: "flex", gap: 8 }}>
        <input
          className="pp-input sm"
          placeholder="Business phone"
          inputMode="tel"
          style={{ flex: 1, margin: 0 }}
          value={phone}
          onChange={(e) => setPhone(e.target.value)}
        />
        <button
          className="btn btn-line"
          onClick={() => setPhoneVerified(true)}
          style={{
            width: "auto",
            padding: "0 14px",
            whiteSpace: "nowrap",
            ...(phoneVerified ? { color: "var(--ok)", borderColor: "#BFE6CF", background: "var(--ok-l)" } : {}),
          }}
        >
          {phoneVerified ? "✓ Verified" : "Verify"}
        </button>
      </div>
      <div className="h-sec">Verification documents</div>
      <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
        {docBtn("license", "licence / registration")}
        {docBtn("storefront", "storefront photo")}
      </div>
      <div className="h-sec">Your login</div>
      <input className="pp-input sm" placeholder="Choose a username" autoComplete="off" style={{ marginBottom: 8 }} />
      <input className="pp-input sm" type="password" placeholder="Choose a password" autoComplete="off" />
      <div style={{ marginTop: 16 }}>
        <button className="btn btn-primary" onClick={onSubmit}>
          <Icon name="check" size={16} /> Submit application
        </button>
      </div>
      <div style={{ fontSize: 11.5, color: "var(--muted)", background: "var(--surface-2)", borderRadius: 9, padding: "9px 11px", marginTop: 12 }}>
        🔒 Your application goes to the LOMA team's Provider verification queue. You can use the
        portal while you wait.
      </div>
      <div style={{ height: 12 }} />
    </div>
  );
}
