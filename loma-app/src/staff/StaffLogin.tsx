import { useState } from "react";
import { ACCOUNTS_REAL as ACCOUNTS } from "../activeAccount";
import type { Account } from "../types";
import type { AuthScreen } from "./helpers";

export default function StaffLogin({
  prefillUser,
  setScreen,
  onSignIn,
  toast,
}: {
  prefillUser: string;
  setScreen: (s: AuthScreen) => void;
  onSignIn: (a: Account) => void;
  toast: (m: string) => void;
}) {
  const demos = ACCOUNTS.filter((a) => a.status === "approved");
  const [user, setUser] = useState(prefillUser);
  const [pass, setPass] = useState("");
  const [err, setErr] = useState("");

  const signIn = () => {
    const a = ACCOUNTS.find((x) => x.user === user.trim() && x.pass === pass);
    if (!a) return setErr("Incorrect username or password. Try a demo account below.");
    if (a.status !== "approved") return setErr("This account is still pending LOMA approval.");
    setErr("");
    onSignIn(a);
    toast("Signed in · " + a.name);
  };

  return (
    <div className="scroll">
      <div style={{ flex: 1, display: "flex", flexDirection: "column", justifyContent: "center", padding: "26px 22px", minHeight: "100%" }}>
        <div style={{ textAlign: "center", marginBottom: 20 }}>
          <div style={{ width: 54, height: 54, borderRadius: 15, background: "linear-gradient(135deg,var(--primary),#19a89c)", display: "grid", placeItems: "center", color: "#fff", fontWeight: 800, fontSize: 26, margin: "0 auto 12px" }}>
            L
          </div>
          <h2 style={{ fontSize: 21 }}>Sign in to LOMA</h2>
          <div style={{ fontSize: 12.5, color: "var(--muted)", marginTop: 3 }}>
            Recommend trusted local Phuket businesses to your guests
          </div>
        </div>
        <div className="h-sec">Username</div>
        <input className="pp-input sm" placeholder="e.g. seabreeze" autoComplete="off" value={user} onChange={(e) => setUser(e.target.value)} />
        <div className="h-sec">Password</div>
        <input className="pp-input sm" type="password" placeholder="••••••••" autoComplete="off" value={pass} onChange={(e) => setPass(e.target.value)} />
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
          New to LOMA?{" "}
          <a onClick={() => setScreen("rolePick")} style={{ color: "var(--primary)", fontWeight: 700, cursor: "pointer" }}>
            Register your business →
          </a>
        </div>
        <div style={{ textAlign: "center", marginTop: 7, fontSize: 12.5, color: "var(--muted)" }}>
          Staff joining a property?{" "}
          <a onClick={() => setScreen("regStaff")} style={{ color: "var(--primary)", fontWeight: 700, cursor: "pointer" }}>
            Enter your invite code →
          </a>
        </div>
        <div style={{ marginTop: 22, borderTop: "1px solid var(--line)", paddingTop: 14 }}>
          <div style={{ fontSize: 11, fontWeight: 700, textTransform: "uppercase", letterSpacing: ".4px", color: "var(--muted)", marginBottom: 9 }}>
            Demo accounts — tap to fill
          </div>
          {demos.map((a) => (
            <div
              className="prow"
              key={a.id}
              style={{ cursor: "pointer" }}
              onClick={() => {
                setUser(a.user);
                setPass(a.pass);
                setErr("");
              }}
            >
              <div style={{ width: 42, height: 42, borderRadius: 10, background: "var(--primary-l)", color: "var(--primary-d)", display: "grid", placeItems: "center", fontWeight: 800, fontSize: 12, flex: "none" }}>
                {a.staffInit}
              </div>
              <div className="info">
                <h3 style={{ fontSize: 13.5 }}>{a.name}</h3>
                <div className="m" style={{ fontSize: 11.5 }}>
                  👤 {a.user} &nbsp;·&nbsp; 🔑 {a.pass}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
