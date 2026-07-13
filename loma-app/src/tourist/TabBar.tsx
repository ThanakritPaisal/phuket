import Icon from "../components/Icon";
import type { IconName } from "../types";

export type TouristTab = "recommended" | "explore" | "community" | "hotel";

const TABS: [TouristTab, IconName, string][] = [
  ["recommended", "bookmark", "Recommended"],
  ["explore", "search", "Explore Nearby"],
  ["community", "map", "Community"],
  ["hotel", "home", "Hotel Info"],
];

export default function TabBar({
  tab,
  onTab,
}: {
  tab: TouristTab;
  onTab: (t: TouristTab) => void;
}) {
  return (
    <div className="t-tabbar">
      {TABS.map(([id, ic, label]) => (
        <button key={id} className={tab === id ? "on" : ""} onClick={() => onTab(id)}>
          <span className="ic">
            <Icon name={ic} size={21} />
          </span>
          {label}
        </button>
      ))}
    </div>
  );
}
