import { useRef, useState } from "react";
import Icon from "../components/Icon";
import type { IconName } from "../types";
import { COMMUNITY_ACCOUNTS, community, type Community, type CommunityAccount } from "../v2data";
import { commInit } from "./lib";
import CommunityHome from "./CommunityHome";
import CommunityBookings from "./CommunityBookings";
import CommunityCheckin from "./CommunityCheckin";
import CommunityFeedback from "./CommunityFeedback";
import CommunityProfile from "./CommunityProfile";
import "./community.css";

export type CommScreen = "home" | "bookings" | "checkin" | "feedback" | "profile";

const TABS: [CommScreen, IconName, string][] = [
  ["home", "home", "Home"],
  ["bookings", "list", "Bookings"],
  ["checkin", "check", "Check-in"],
  ["feedback", "star", "Feedback"],
  ["profile", "user", "Profile"],
];

/** Props every scoped screen receives. `c` is ALWAYS the signed-in community. */
export interface CommScreenProps {
  c: Community;
  acct: CommunityAccount;
  onGo: (s: CommScreen) => void;
  toast: (m: string) => void;
}

export default function CommunityApp() {
  const [acct, setAcct] = useState<CommunityAccount | null>(null);
  const [screen, setScreen] = useState<CommScreen>("home");

  const [toastMsg, setToastMsg] = useState("");
  const [toastOn, setToastOn] = useState(false);
  const toastTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const toast = (m: string) => {
    setToastMsg(m);
    setToastOn(true);
    if (toastTimer.current) clearTimeout(toastTimer.current);
    toastTimer.current = setTimeout(() => setToastOn(false), 1900);
  };

  const signIn = (a: CommunityAccount) => {
    setAcct(a);
    setScreen("home");
  };
  const signOut = () => {
    setAcct(null);
    setScreen("home");
  };

  // ---------- logged out ----------
  // Resolve the community up front; a bad/orphaned account never gets in.
  const c = acct ? community(acct.commId) : undefined;
  if (!acct || !c) {
    return (
      <div className="scroll" style={{ display: "flex", flexDirection: "column" }}>
        <CommunityLogin onLogin={signIn} />
        <div className={`comm-toast${toastOn ? " show" : ""}`}>{toastMsg}</div>
      </div>
    );
  }

  const props: CommScreenProps = { c, acct, onGo: setScreen, toast };

  return (
    <>
      <div className="scroll" style={{ display: "flex", flexDirection: "column" }}>
        <CommAppbar c={c} acct={acct} onSignOut={signOut} />
        {screen === "home" && <CommunityHome {...props} />}
        {screen === "bookings" && <CommunityBookings {...props} />}
        {screen === "checkin" && <CommunityCheckin {...props} />}
        {screen === "feedback" && <CommunityFeedback {...props} />}
        {screen === "profile" && <CommunityProfile {...props} onSignOut={signOut} />}
        <CommTabbar active={screen} onGo={setScreen} />
      </div>
      <div className={`comm-toast${toastOn ? " show" : ""}`}>{toastMsg}</div>
    </>
  );
}

/* ---------------- chrome ---------------- */
function CommAppbar({
  c,
  acct,
  onSignOut,
}: {
  c: Community;
  acct: CommunityAccount;
  onSignOut: () => void;
}) {
  return (
    <div className="appbar">
      <div className="row1">
        <img src="/loma-navy.png" alt="LOMA" className="wordmark-sm" />
        <div className="where">
          <div className="t">Community host</div>
          <div className="p">
            {c.emo} {c.name}
          </div>
        </div>
        <div className="avatar" title={`Sign out — ${acct.person || acct.user}`} onClick={onSignOut}>
          {commInit(c.name)}
        </div>
      </div>
    </div>
  );
}

function CommTabbar({ active, onGo }: { active: CommScreen; onGo: (s: CommScreen) => void }) {
  return (
    <div className="tabbar">
      {TABS.map(([s, ic, label]) => (
        <button key={s} className={active === s ? "on" : ""} onClick={() => onGo(s)}>
          <span className="ic">
            <Icon name={ic} size={21} />
          </span>
          {label}
        </button>
      ))}
    </div>
  );
}

/* ---------------- community host sign in ---------------- */
function CommunityLogin({ onLogin }: { onLogin: (a: CommunityAccount) => void }) {
  const [user, setUser] = useState("");
  const [pass, setPass] = useState("");
  const [err, setErr] = useState("");

  const submit = () => {
    const a = COMMUNITY_ACCOUNTS.find((x) => x.user === user.trim() && x.pass === pass);
    if (!a) {
      setErr("Wrong username or password. Tap a demo community below.");
      return;
    }
    onLogin(a);
  };

  return (
    <div style={{ flex: 1, display: "flex", flexDirection: "column", justifyContent: "center", padding: "26px 22px" }}>
      <div style={{ textAlign: "center", marginBottom: 20 }}>
        <div
          style={{
            width: 54,
            height: 54,
            borderRadius: 15,
            background: "var(--primary)",
            display: "grid",
            placeItems: "center",
            color: "#fff",
            fontWeight: 800,
            fontSize: 26,
            margin: "0 auto 12px",
          }}
        >
          🌿
        </div>
        <h2 style={{ fontSize: 21 }}>Community host sign in</h2>
        <div style={{ fontSize: 12.5, color: "var(--muted)", marginTop: 3 }}>
          Manage your own community's bookings, check-ins and income
        </div>
      </div>
      <div className="h-sec">Username</div>
      <input
        className="pp-input sm"
        value={user}
        onChange={(e) => setUser(e.target.value)}
        placeholder="e.g. bangrong"
        autoComplete="off"
      />
      <div className="h-sec">Password</div>
      <input
        className="pp-input sm"
        type="password"
        value={pass}
        onChange={(e) => setPass(e.target.value)}
        placeholder="••••••••"
        autoComplete="off"
      />
      {err && (
        <div
          style={{
            color: "var(--danger)",
            fontSize: 12.5,
            marginTop: 10,
            background: "var(--danger-l)",
            padding: "9px 11px",
            borderRadius: 9,
          }}
        >
          {err}
        </div>
      )}
      <div style={{ marginTop: 16 }}>
        <button className="btn btn-primary" onClick={submit}>
          Sign in
        </button>
      </div>

      <div style={{ marginTop: 22, borderTop: "1px solid var(--line)", paddingTop: 14 }}>
        <div
          style={{
            fontSize: 11,
            fontWeight: 700,
            textTransform: "uppercase",
            letterSpacing: ".4px",
            color: "var(--muted)",
            marginBottom: 9,
          }}
        >
          Community hosts — each sees only its own bookings
        </div>
        {COMMUNITY_ACCOUNTS.map((a) => {
          const c = community(a.commId);
          if (!c) return null;
          return (
            <div
              className="prow ch-login-row"
              key={a.user}
              onClick={() => {
                setUser(a.user);
                setPass(a.pass);
                setErr("");
              }}
            >
              <div className="ch-emo" style={{ width: 42, height: 42, borderRadius: 10, fontSize: 20 }}>
                {c.emo}
              </div>
              <div className="info">
                <h3>{c.name}</h3>
                <div className="m">
                  👤 {a.user} &nbsp;·&nbsp; 🔑 {a.pass}
                </div>
              </div>
            </div>
          );
        })}
      </div>
      <div className="modehint" style={{ marginTop: 12 }}>
        🔒 You can only ever see and manage <b>your own</b> community — never another community's
        bookings, guests or income.
      </div>
    </div>
  );
}
