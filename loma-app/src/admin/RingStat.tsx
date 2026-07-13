// SVG donut / ring stat — a percentage ring with a centered value.
export default function RingStat({
  value,
  label,
  sub,
  color = "var(--primary)",
  size = 108,
}: {
  value: number; // 0..1
  label: string;
  sub?: string;
  color?: string;
  size?: number;
}) {
  const r = 44;
  const c = 2 * Math.PI * r;
  const clamped = Math.max(0, Math.min(1, value));
  const dash = clamped * c;
  return (
    <div className="ringstat">
      <svg width={size} height={size} viewBox="0 0 108 108">
        <circle
          cx="54"
          cy="54"
          r={r}
          fill="none"
          stroke="var(--surface-2)"
          strokeWidth="11"
        />
        <circle
          cx="54"
          cy="54"
          r={r}
          fill="none"
          stroke={color}
          strokeWidth="11"
          strokeLinecap="round"
          strokeDasharray={`${dash} ${c}`}
          transform="rotate(-90 54 54)"
        />
        <text
          x="54"
          y="52"
          textAnchor="middle"
          fontSize="22"
          fontWeight="800"
          fill="var(--ink)"
        >
          {Math.round(clamped * 100)}%
        </text>
        <text x="54" y="70" textAnchor="middle" fontSize="9" fill="var(--muted)">
          {sub || ""}
        </text>
      </svg>
      <div className="rlabel">{label}</div>
    </div>
  );
}
