import { useEffect, useState } from "react";
import QRCodeLib from "qrcode";

/** Renders a real, scannable QR code for `value` (any string / URL). Regenerates
 *  whenever the value changes, so every share produces a genuine, current code. */
export default function QRCode({
  value,
  size = 180,
  className,
  style,
}: {
  value: string;
  size?: number;
  className?: string;
  style?: React.CSSProperties;
}) {
  const [src, setSrc] = useState("");

  useEffect(() => {
    let alive = true;
    QRCodeLib.toDataURL(value, {
      margin: 1,
      width: size * 2, // 2× for crisp rendering on hi-dpi screens
      errorCorrectionLevel: "M",
      color: { dark: "#0C1F1D", light: "#ffffff" },
    })
      .then((url) => alive && setSrc(url))
      .catch(() => alive && setSrc(""));
    return () => {
      alive = false;
    };
  }, [value, size]);

  // Render the img only once the QR data-URL is ready (avoids an empty-src warning
  // and the browser refetching the page for src="").
  return src ? (
    <img
      src={src}
      width={size}
      height={size}
      alt="QR code"
      className={className}
      style={{ width: size, height: size, display: "block", ...style }}
    />
  ) : (
    <div style={{ width: size, height: size, ...style }} className={className} />
  );
}
