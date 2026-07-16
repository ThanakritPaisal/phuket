import { useRef, useState } from "react";
import { operator } from "../mock";
import { ProvAppbar, ProvTabbar, type ProvScreen } from "./Chrome";
import { ProviderLogin, ProviderRegister } from "./ProviderOnboarding";
import ProviderDashboard from "./ProviderDashboard";
import ProviderLeads from "./ProviderLeads";
import { ProviderConfirm, ProviderDone } from "./ProviderConfirm";
import ProviderReviews from "./ProviderReviews";
import ProviderProfile from "./ProviderProfile";
import ProviderEdit from "./ProviderEdit";
import type { ProviderAccount } from "./lib";
import "./provider.css";

export default function ProviderApp() {
  const [authed, setAuthed] = useState(false);
  const [authScreen, setAuthScreen] = useState<"login" | "register">("login");
  const [acct, setAcct] = useState<ProviderAccount | null>(null);
  const [status, setStatus] = useState("verified");
  const [screen, setScreen] = useState<ProvScreen>("home");
  const [avail, setAvail] = useState(true);
  // Phone vs. tablet/desktop ("desk") view — self-contained to the provider shell.
  const [view, setView] = useState<"phone" | "desk">("phone");

  const [toastMsg, setToastMsg] = useState("");
  const [toastOn, setToastOn] = useState(false);
  const toastTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const toast = (m: string) => {
    setToastMsg(m);
    setToastOn(true);
    if (toastTimer.current) clearTimeout(toastTimer.current);
    toastTimer.current = setTimeout(() => setToastOn(false), 1900);
  };

  const changeView = (v: "phone" | "desk") => {
    setView(v);
    toast(
      v === "desk"
        ? "💻 Tablet / desktop console — what the front desk actually uses"
        : "📱 Phone view"
    );
  };
  const ViewSwitch = (
    <div className="viewbar">
      <div className="viewsw">
        <button className={view === "phone" ? "on" : ""} onClick={() => changeView("phone")}>
          📱 Phone
        </button>
        <button className={view === "desk" ? "on" : ""} onClick={() => changeView("desk")}>
          💻 Tablet
        </button>
      </div>
    </div>
  );

  const login = (a: ProviderAccount) => {
    setAcct(a);
    setStatus(a.status);
    setScreen("home");
    setAuthed(true);
  };
  const submitApplication = () => {
    setAcct({ user: "", pass: "", provId: "BRT", status: "pending" });
    setStatus("pending");
    setScreen("home");
    setAuthed(true);
    setAuthScreen("login");
  };
  const signOut = () => {
    setAuthed(false);
    setAuthScreen("login");
    setAcct(null);
    setScreen("home");
  };

  // ---------- unauthenticated ----------
  if (!authed) {
    return (
      <div className="scroll" style={{ display: "flex", flexDirection: "column" }}>
        {authScreen === "register" ? (
          <ProviderRegister
            onBack={() => setAuthScreen("login")}
            onSubmit={submitApplication}
            toast={toast}
          />
        ) : (
          <ProviderLogin onLogin={login} onRegister={() => setAuthScreen("register")} />
        )}
        <div className={`prov-toast${toastOn ? " show" : ""}`}>{toastMsg}</div>
      </div>
    );
  }

  const p = operator(acct?.provId ?? "BRT") ?? operator("BRT");
  if (!p) return null;

  return (
    <div className={`prov-shell${view === "desk" ? " desk" : ""}`}>
      {ViewSwitch}
      <div className="scroll" style={{ display: "flex", flexDirection: "column" }}>
        <ProvAppbar p={p} onProfile={() => setScreen("profile")} />
        {screen === "home" && (
          <ProviderDashboard
            p={p}
            status={status}
            avail={avail}
            onToggleAvail={() => setAvail((v) => !v)}
            onApprove={() => {
              setStatus("verified");
              toast("Approved — you're now a verified provider");
            }}
            onGo={setScreen}
          />
        )}
        {screen === "leads" && <ProviderLeads p={p} onGo={setScreen} />}
        {screen === "confirm" && (
          <ProviderConfirm p={p} onConfirm={() => setScreen("done")} toast={toast} />
        )}
        {screen === "done" && <ProviderDone p={p} onGo={setScreen} />}
        {screen === "reviews" && <ProviderReviews p={p} />}
        {screen === "profile" && (
          <ProviderProfile
            p={p}
            status={status}
            onSignOut={signOut}
            toast={toast}
            onEdit={() => setScreen("edit")}
          />
        )}
        {screen === "edit" && (
          <ProviderEdit p={p} onBack={() => setScreen("profile")} toast={toast} />
        )}
        <ProvTabbar active={screen} onGo={setScreen} />
      </div>
      <div className={`prov-toast${toastOn ? " show" : ""}`}>{toastMsg}</div>
    </div>
  );
}
