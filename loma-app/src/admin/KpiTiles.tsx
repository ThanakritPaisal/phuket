import Icon from "../components/Icon";
import type { IconName } from "../types";

export interface Metric {
  label: string;
  icon: IconName;
  bg: string;
  value: string;
  delta?: string;
  up?: boolean;
}

export function MetricCard({ label, icon, bg, value, delta, up = true }: Metric) {
  return (
    <div className="mcard">
      <div className="lab">
        <span className="i" style={{ background: bg }}>
          <Icon name={icon} size={15} />
        </span>
        {label}
      </div>
      <div className="num">{value}</div>
      {delta !== undefined && (
        <div className={"delta " + (up ? "up" : "down")}>
          {up ? "▲" : "▼"} {delta}
          {delta ? " vs prev. period" : ""}
        </div>
      )}
    </div>
  );
}

export default function KpiTiles({
  metrics,
  columns = 3,
}: {
  metrics: Metric[];
  columns?: number;
}) {
  return (
    <div
      className="cards6"
      style={{ gridTemplateColumns: `repeat(${columns},1fr)` }}
    >
      {metrics.map((m) => (
        <MetricCard key={m.label} {...m} />
      ))}
    </div>
  );
}
