import { DEFAULT_ACCOUNT } from "../../activeAccount";

// The "logged-in" hotel doing the recommending — now a REAL Phuket property,
// with real lat/lng (projected to x/y for the stylised map).
export const PARTNER = DEFAULT_ACCOUNT;

export function attribution(): string {
  return `Recommended by ${PARTNER.name}`;
}

// Deterministic referral code — ported from prototype refFor().
export function refFor(id: string): string {
  let h = 0;
  const s = "LOMA" + id;
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) >>> 0;
  const tail = String(id).toUpperCase().replace(/[^A-Z0-9]/g, "").slice(0, 4);
  return "LOMA-" + tail + "-" + (1000 + (h % 9000));
}

// Simple deterministic QR-like grid (decorative, like the prototype's qrSVG).
export function MiniQR({ seed }: { seed: string }) {
  let h = 0;
  for (let i = 0; i < seed.length; i++) h = (h * 131 + seed.charCodeAt(i)) >>> 0;
  const cells = Array.from({ length: 81 }, (_, k) => {
    const x = k % 9,
      y = Math.floor(k / 9);
    const corner = (x < 3 && y < 3) || (x > 5 && y < 3) || (x < 3 && y > 5);
    if (corner) return (x === 0 || x === 2 || y === 0 || y === 2 || (x === 1 && y === 1)) ? 1 : 0;
    h = (h * 1103515245 + 12345) & 0x7fffffff;
    return (h >> (k % 16)) & 1;
  });
  return (
    <div className="qr">
      {cells.map((on, i) => (
        <i key={i} className={on ? "" : "off"} />
      ))}
    </div>
  );
}
