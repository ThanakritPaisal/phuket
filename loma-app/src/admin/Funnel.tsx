import { DASH } from "./helpers";

export default function Funnel() {
  const t = DASH.recs || 1;
  const steps: [string, number, string][] = [
    ["Recommendations", DASH.recs, ""],
    ["Card opens", DASH.opens, "b2"],
    ["Direction / contact", DASH.dirs, "b3"],
    ["Confirmed visits", DASH.visits, "b4"],
    ["Reported spend", DASH.spent, "b5"],
  ];
  return (
    <div className="funnel">
      {steps.map(([label, v, cls]) => {
        const pc = Math.round((v / t) * 100);
        return (
          <div className="fstep" key={label}>
            <div
              className={"bar " + cls}
              style={{ width: Math.max(pc, 18) + "%" }}
            >
              {label} · {v.toLocaleString()}
            </div>
            <div className="meta">
              <span className="pc">{pc}%</span>
            </div>
          </div>
        );
      })}
    </div>
  );
}
