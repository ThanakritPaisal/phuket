import type { TrendPoint } from "./helpers";

// Simple dual-series line chart drawn with inline SVG (no chart libs).
export default function LineChart({
  data,
  height = 180,
}: {
  data: TrendPoint[];
  height?: number;
}) {
  const W = 640;
  const H = height;
  const padX = 34;
  const padY = 18;
  const n = data.length;
  const max = Math.max(1, ...data.map((d) => d.recs));
  const x = (i: number) => padX + (i / Math.max(1, n - 1)) * (W - padX * 2);
  const y = (v: number) => H - padY - (v / max) * (H - padY * 2);

  const line = (sel: (d: TrendPoint) => number) =>
    data.map((d, i) => `${i === 0 ? "M" : "L"}${x(i).toFixed(1)},${y(sel(d)).toFixed(1)}`).join(" ");
  const area = (sel: (d: TrendPoint) => number) =>
    `${line(sel)} L${x(n - 1).toFixed(1)},${H - padY} L${x(0).toFixed(1)},${H - padY} Z`;

  const gridVals = [0, 0.5, 1].map((f) => Math.round(max * f));

  return (
    <div className="linewrap">
      <svg viewBox={`0 0 ${W} ${H}`} className="lchart" preserveAspectRatio="none">
        <defs>
          <linearGradient id="lc-fill" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor="var(--primary)" stopOpacity="0.22" />
            <stop offset="1" stopColor="var(--primary)" stopOpacity="0" />
          </linearGradient>
        </defs>
        {gridVals.map((gv, i) => (
          <g key={i}>
            <line
              x1={padX}
              x2={W - padX}
              y1={y(gv)}
              y2={y(gv)}
              stroke="var(--line)"
              strokeWidth="1"
            />
            <text x={4} y={y(gv) + 3} fontSize="9" fill="var(--muted)">
              {gv}
            </text>
          </g>
        ))}
        <path d={area((d) => d.recs)} fill="url(#lc-fill)" />
        <path
          d={line((d) => d.recs)}
          fill="none"
          stroke="var(--primary)"
          strokeWidth="2.5"
          strokeLinejoin="round"
          strokeLinecap="round"
        />
        <path
          d={line((d) => d.visits)}
          fill="none"
          stroke="var(--accent)"
          strokeWidth="2.5"
          strokeLinejoin="round"
          strokeLinecap="round"
          strokeDasharray="1 0"
        />
        {data.map((d, i) => (
          <g key={i}>
            <circle cx={x(i)} cy={y(d.recs)} r="3" fill="var(--primary)" />
            <circle cx={x(i)} cy={y(d.visits)} r="3" fill="var(--accent)" />
            <text
              x={x(i)}
              y={H - 4}
              fontSize="10"
              fill="var(--muted)"
              textAnchor="middle"
            >
              {d.label}
            </text>
          </g>
        ))}
      </svg>
      <div className="llegend">
        <span>
          <i style={{ background: "var(--primary)" }} /> Recommendations
        </span>
        <span>
          <i style={{ background: "var(--accent)" }} /> Confirmed visits
        </span>
      </div>
    </div>
  );
}
