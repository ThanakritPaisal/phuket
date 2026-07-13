import type { BarRow } from "./helpers";

export default function BarChart({
  rows,
  variant = "",
}: {
  rows: BarRow[];
  variant?: "" | "a";
}) {
  const max = Math.max(1, ...rows.map((r) => r[1]));
  return (
    <div className="blist">
      {rows.map(([name, value], i) => (
        <div className="brow" key={name + i}>
          <div className="nm" title={name}>
            {name}
          </div>
          <div className="track">
            <div
              className={"fill " + variant}
              style={{ width: Math.round((value / max) * 100) + "%" }}
            />
          </div>
          <div className="vv">{value.toLocaleString()}</div>
        </div>
      ))}
    </div>
  );
}
