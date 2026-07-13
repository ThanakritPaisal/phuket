import { useState } from "react";
import { ACCOUNTS_REAL, setActiveAccount } from "../activeAccount";
import type { Account, RealAccount } from "../types";
import "./staff.css";
import {
  StaffProvider,
  intentPatch,
  type AuthScreen,
  type Filter,
  type Modal,
  type PlanKind,
  type StaffCtx,
  type StaffScreen,
} from "./helpers";
import StaffLogin from "./StaffLogin";
import StaffRegister from "./StaffRegister";
import StaffHome from "./StaffHome";
import StaffResults from "./StaffResults";
import { StaffHalfday, StaffRoute } from "./StaffPlan";
import StaffDetail from "./StaffDetail";
import StaffRecent from "./StaffRecent";
import StaffSaved from "./StaffSaved";
import StaffReviews from "./StaffReviews";
import StaffSettings from "./StaffSettings";
import StaffVerify from "./StaffVerify";
import StaffRecommend from "./StaffRecommend";
import StaffImpact from "./StaffImpact";
import StaffQRLink from "./StaffQRLink";
import { CounterQR, ShareOne, ShareSet } from "./ShareModal";
import type { RecList } from "../recommendations";

const DEFAULT_FILTER: Filter = {
  intent: "Local Food",
  cat: "Local Food",
  cats: null,
  place: "property",
  destArea: null,
  time: "now",
  openNow: true,
  maxMin: null,
  budget: null,
  family: false,
  rainy: false,
  halfday: false,
  sort: "match",
  mode: "standard",
};

export default function StaffApp() {
  // auth
  const [authed, setAuthed] = useState(false);
  const [authScreen, setAuthScreen] = useState<AuthScreen>("login");
  const [pendingAcct, setPendingAcct] = useState<Account | null>(null);
  const [prefillUser] = useState("");

  // signed-in navigation
  const [partner, setPartner] = useState<RealAccount>(ACCOUNTS_REAL[0]);
  const [screen, setScreen] = useState<StaffScreen>("home");
  const [curProv, setCurProv] = useState(ACCOUNTS_REAL[0].housePicks[0]);
  const [filter, setFilterState] = useState<Filter>(DEFAULT_FILTER);
  const [routeDest, setRouteDest] = useState("Rawai");
  const [routeCats, setRouteCats] = useState<string[]>(["Café", "Local Food"]);
  const [hd, setHdState] = useState({ budget: "low-med", group: "small" });
  const [ssMode, setSsMode] = useState<"auto" | "house">("auto");
  const [saved, setSaved] = useState<Set<string>>(new Set());
  const [shareDeselect, setShareDeselect] = useState<Set<string>>(new Set());
  const [planKind, setPlanKind] = useState<PlanKind>("route");
  const [curList, setCurList] = useState<RecList | null>(null);
  const [modal, setModal] = useState<Modal>(null);
  const [toastMsg, setToastMsg] = useState("");

  const toast = (msg: string) => {
    setToastMsg(msg);
    window.clearTimeout((toast as unknown as { _t?: number })._t);
    (toast as unknown as { _t?: number })._t = window.setTimeout(() => setToastMsg(""), 1900);
  };

  const signIn = (a: Account) => {
    // Distances are computed from the signed-in property, so tell the picks engine
    // who we are before any screen renders.
    const real = (ACCOUNTS_REAL.find((r) => r.id === a.id) ?? ACCOUNTS_REAL[0]) as RealAccount;
    setActiveAccount(real);
    setPartner(real);
    setCurProv(real.housePicks[0]);
    setAuthed(true);
    setScreen("home");
    setFilterState(DEFAULT_FILTER);
    setSaved(new Set());
  };

  // ---------- unauthenticated ----------
  if (!authed) {
    if (authScreen === "login") {
      return (
        <>
          <StaffLogin prefillUser={prefillUser} setScreen={setAuthScreen} onSignIn={signIn} toast={toast} />
          {toastMsg && <div className="staff-toast">{toastMsg}</div>}
        </>
      );
    }
    return (
      <>
        <StaffRegister
          screen={authScreen}
          setScreen={setAuthScreen}
          onSignIn={signIn}
          pendingAcct={pendingAcct}
          setPendingAcct={setPendingAcct}
          approveDemo={() => {
            if (pendingAcct) toast("✓ Approved by LOMA admin — sign in now");
            setAuthScreen("login");
          }}
          toast={toast}
        />
        {toastMsg && <div className="staff-toast">{toastMsg}</div>}
      </>
    );
  }

  // ---------- authenticated context ----------
  const ctx: StaffCtx = {
    partner,
    saved,
    filter,
    routeDest,
    routeCats,
    hd,
    ssMode,
    shareDeselect,
    planKind,
    curProv,
    curList,
    setCurList,
    go: (s) => setScreen(s),
    setFilter: (patch) => setFilterState((f) => ({ ...f, ...patch })),
    applyIntent: (name) => setFilterState((f) => ({ ...f, ...intentPatch(name) })),
    openProv: (id) => {
      setCurProv(id);
      setScreen("detail");
    },
    toggleSave: (id) => {
      setSaved((prev) => {
        const next = new Set(prev);
        if (next.has(id)) {
          next.delete(id);
          toast("Removed from Local Picks");
        } else {
          next.add(id);
          toast("❤ Saved to Local Picks");
        }
        return next;
      });
    },
    openModal: (m) => setModal(m),
    closeModal: () => setModal(null),
    setRouteDest,
    toggleRouteCat: (c) =>
      setRouteCats((prev) => (prev.includes(c) ? prev.filter((x) => x !== c) : [...prev, c])),
    setHd: (patch) => setHdState((h) => ({ ...h, ...patch })),
    setSsMode: (m) => {
      setSsMode(m);
      toast(m === "house" ? "QR shows house picks only" : "QR shows house picks + auto-fill");
    },
    toggleDeselect: (id) =>
      setShareDeselect((prev) => {
        const next = new Set(prev);
        if (next.has(id)) next.delete(id);
        else next.add(id);
        return next;
      }),
    selectAllSaved: () => {
      const ids = [...saved];
      const allOn = ids.every((id) => !shareDeselect.has(id));
      setShareDeselect(allOn ? new Set(ids) : new Set());
    },
    setPlanKind,
    markRecommended: () => {
      setModal(null);
      toast("✓ Marked as recommended — tracking started");
      setScreen("recent");
    },
    signOut: () => {
      setAuthed(false);
      setAuthScreen("login");
      setSaved(new Set());
      toast("Signed out");
    },
    toast,
  };

  const screens: Record<StaffScreen, React.ReactNode> = {
    home: <StaffHome />,
    results: <StaffResults />,
    detail: <StaffDetail />,
    recent: <StaffRecent />,
    saved: <StaffSaved />,
    reviews: <StaffReviews />,
    settings: <StaffSettings />,
    route: <StaffRoute />,
    halfday: <StaffHalfday />,
    getverified: <StaffVerify />,
    recommend: <StaffRecommend />,
    impact: <StaffImpact />,
    qrlink: <StaffQRLink />,
  };

  return (
    <StaffProvider value={ctx}>
      {screens[screen]}
      {modal?.kind === "share" && <ShareOne id={modal.id} />}
      {modal?.kind === "shareset" && <ShareSet />}
      {modal?.kind === "counterqr" && <CounterQR />}
      {toastMsg && <div className="staff-toast">{toastMsg}</div>}
    </StaffProvider>
  );
}
