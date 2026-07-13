import Icon from "../components/Icon";
import { Screen, catEmo, useStaff } from "./helpers";

export function StaffRoute() {
  const { routeDest, routeCats, setRouteDest, toggleRouteCat, setFilter, go, toast } = useStaff();
  const dests = ["Rawai", "Chalong", "Kata", "Karon", "Nai Yang", "Old Town", "Bang Tao"];
  const cats = [
    "Café",
    "Local Food",
    "Souvenir & Local Product",
    "Community Experience",
    "Local Market",
    "Massage & Wellness",
  ];
  return (
    <Screen active="route">
      <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 4 }}>
        <button
          onClick={() => go("home")}
          style={{ width: 30, height: 30, borderRadius: "50%", background: "var(--surface-2)", display: "grid", placeItems: "center" }}
        >
          <Icon name="back" size={18} />
        </button>
        <h2 style={{ fontSize: 17 }}>Route-based stops</h2>
      </div>
      <div style={{ fontSize: 12.5, color: "var(--muted)", marginBottom: 6 }}>
        For tourists renting a bike or car — pick where they're heading and what to look for on the way.
      </div>
      <div className="h-sec">Heading toward</div>
      <div className="chips">
        {dests.map((d) => (
          <button
            key={d}
            className={`chip ${routeDest === d ? "on" : ""}`}
            onClick={() => setRouteDest(d)}
          >
            📍 {d}
          </button>
        ))}
      </div>
      <div className="h-sec">Stops to include</div>
      <div className="chips">
        {cats.map((c) => (
          <button
            key={c}
            className={`chip ${routeCats.includes(c) ? "on" : ""}`}
            onClick={() => toggleRouteCat(c)}
          >
            {catEmo(c)} {c}
          </button>
        ))}
      </div>
      <div style={{ marginTop: 20 }}>
        <button
          className="btn btn-primary"
          onClick={() => {
            if (!routeCats.length) return toast("Pick at least one stop type");
            setFilter({ mode: "route" });
            go("results");
          }}
        >
          <Icon name="spark" size={16} /> Show route stops
        </button>
      </div>
    </Screen>
  );
}

export function StaffHalfday() {
  const { hd, setHd, setFilter, go } = useStaff();
  const budgets: [string, string][] = [
    ["low", "Low ฿"],
    ["low-med", "Low–medium ฿฿"],
  ];
  const groups: [string, string][] = [
    ["solo", "Solo"],
    ["small", "Small group"],
    ["family", "Family"],
  ];
  return (
    <Screen active="halfday">
      <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 4 }}>
        <button
          onClick={() => go("home")}
          style={{ width: 30, height: 30, borderRadius: "50%", background: "var(--surface-2)", display: "grid", placeItems: "center" }}
        >
          <Icon name="back" size={18} />
        </button>
        <h2 style={{ fontSize: 17 }}>Half-day local experience</h2>
      </div>
      <div style={{ fontSize: 12.5, color: "var(--muted)", marginBottom: 6 }}>
        Affordable, authentic things to do for an afternoon — community walks, markets, workshops &amp; food.
      </div>
      <div className="h-sec">Budget</div>
      <div className="chips">
        {budgets.map(([k, l]) => (
          <button key={k} className={`chip ${hd.budget === k ? "on" : ""}`} onClick={() => setHd({ budget: k })}>
            {l}
          </button>
        ))}
      </div>
      <div className="h-sec">Group</div>
      <div className="chips">
        {groups.map(([k, l]) => (
          <button key={k} className={`chip ${hd.group === k ? "on" : ""}`} onClick={() => setHd({ group: k })}>
            {l}
          </button>
        ))}
      </div>
      <div style={{ marginTop: 20 }}>
        <button
          className="btn btn-primary"
          onClick={() => {
            setFilter({ mode: "halfday" });
            go("results");
          }}
        >
          <Icon name="spark" size={16} /> Show experiences
        </button>
      </div>
    </Screen>
  );
}
