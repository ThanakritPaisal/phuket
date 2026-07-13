import Icon from "../components/Icon";
import type { IconName } from "../types";
import type { CatalogProvider } from "../types";
import { provInit } from "./lib";

export type ProvScreen = "home" | "leads" | "confirm" | "done" | "reviews" | "profile" | "edit";

export function ProvAppbar({
  p,
  onProfile,
}: {
  p: CatalogProvider;
  onProfile: () => void;
}) {
  return (
    <div className="appbar">
      <div className="row1">
        <img src="/loma-navy.png" alt="LOMA" className="wordmark-sm" />
        <div className="where">
          <div className="t">Provider portal</div>
          <div className="p">
            {p.emo} {p.name}
          </div>
        </div>
        <div className="avatar" title={p.name} onClick={onProfile}>
          {provInit(p.name)}
        </div>
      </div>
    </div>
  );
}

const TABS: [ProvScreen, IconName, string][] = [
  ["home", "home", "Home"],
  ["leads", "list", "Leads"],
  ["confirm", "check", "Confirm"],
  ["reviews", "star", "Feedback"],
  ["profile", "user", "Profile"],
];

export function ProvTabbar({
  active,
  onGo,
}: {
  active: ProvScreen;
  onGo: (s: ProvScreen) => void;
}) {
  // 'done' shares the Confirm tab; 'edit' shares the Profile tab
  const cur = active === "done" ? "confirm" : active === "edit" ? "profile" : active;
  return (
    <div className="tabbar">
      {TABS.map(([s, ic, label]) => (
        <button key={s} className={cur === s ? "on" : ""} onClick={() => onGo(s)}>
          <span className="ic">
            <Icon name={ic} size={21} />
          </span>
          {label}
        </button>
      ))}
    </div>
  );
}
