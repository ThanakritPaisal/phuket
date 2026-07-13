import icons from "../data/mock/icons.json";
import type { IconName } from "../types";

const ICONS = icons as Record<string, string>;

export default function Icon({
  name,
  size = 18,
  className,
}: {
  name: IconName;
  size?: number;
  className?: string;
}) {
  const svg = ICONS[name] || "";
  return (
    <span
      className={className}
      style={{ display: "inline-flex", width: size, height: size }}
      aria-hidden
      dangerouslySetInnerHTML={{ __html: svg }}
    />
  );
}
