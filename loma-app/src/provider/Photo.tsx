import type { CSSProperties } from "react";

// Background-image thumb with emoji fallback (prototype data-photo / data-emo pattern)
export default function Photo({
  img,
  emo,
  size,
  radius = 10,
  style,
}: {
  img?: string | null;
  emo?: string;
  size: number;
  radius?: number;
  style?: CSSProperties;
}) {
  return (
    <div
      className="pthumb"
      style={{
        width: size,
        height: size,
        borderRadius: radius,
        flex: "none",
        backgroundImage: img ? `url(${img})` : undefined,
        fontSize: Math.round(size * 0.42),
        ...style,
      }}
    >
      {!img && emo && <span className="ph-emo">{emo}</span>}
    </div>
  );
}
