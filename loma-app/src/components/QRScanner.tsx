import { useEffect, useRef, useState } from "react";
import jsQR from "jsqr";

/** Live camera QR scanner. Opens the device camera, decodes QR codes frame-by-frame with
 *  jsQR, and calls onResult with the decoded text on the first successful read. Used by the
 *  provider to scan a tourist's visit QR at the counter. Requires https or localhost. */
export default function QRScanner({
  onResult,
  onClose,
}: {
  onResult: (text: string) => void;
  onClose: () => void;
}) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const rafRef = useRef<number | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const doneRef = useRef(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const canvas = document.createElement("canvas");
    const ctx = canvas.getContext("2d", { willReadFrequently: true });

    const stop = () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
      streamRef.current?.getTracks().forEach((t) => t.stop());
    };

    const tick = () => {
      const video = videoRef.current;
      if (!doneRef.current && video && video.readyState === video.HAVE_ENOUGH_DATA && ctx) {
        canvas.width = video.videoWidth;
        canvas.height = video.videoHeight;
        ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
        const img = ctx.getImageData(0, 0, canvas.width, canvas.height);
        const code = jsQR(img.data, img.width, img.height, { inversionAttempts: "dontInvert" });
        if (code && code.data) {
          doneRef.current = true;
          stop();
          onResult(code.data.trim());
          return;
        }
      }
      rafRef.current = requestAnimationFrame(tick);
    };

    (async () => {
      try {
        if (!navigator.mediaDevices?.getUserMedia) {
          setError("Camera not available in this browser.");
          return;
        }
        const stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: "environment" },
          audio: false,
        });
        streamRef.current = stream;
        const video = videoRef.current;
        if (video) {
          video.srcObject = stream;
          video.setAttribute("playsinline", "true");
          await video.play();
          rafRef.current = requestAnimationFrame(tick);
        }
      } catch {
        setError("Couldn't access the camera. Allow camera permission and try again.");
      }
    })();

    return stop;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()} style={{ maxWidth: 360 }}>
        <div className="pad">
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <h3 style={{ fontSize: 16 }}>Scan tourist QR</h3>
            <button style={{ fontSize: 22, color: "var(--muted)" }} onClick={onClose}>
              ×
            </button>
          </div>
          {error ? (
            <div style={{ fontSize: 13, color: "var(--muted)", padding: "24px 8px", textAlign: "center" }}>
              {error}
            </div>
          ) : (
            <div
              style={{
                position: "relative",
                marginTop: 12,
                borderRadius: 14,
                overflow: "hidden",
                background: "#000",
                aspectRatio: "1 / 1",
              }}
            >
              <video
                ref={videoRef}
                muted
                playsInline
                style={{ width: "100%", height: "100%", objectFit: "cover" }}
              />
              {/* framing guide */}
              <div
                style={{
                  position: "absolute",
                  inset: "18%",
                  border: "3px solid rgba(255,255,255,.9)",
                  borderRadius: 12,
                  boxShadow: "0 0 0 100vmax rgba(0,0,0,.25)",
                }}
              />
            </div>
          )}
          <div style={{ fontSize: 11.5, color: "var(--muted)", textAlign: "center", marginTop: 10 }}>
            Point the camera at the tourist's visit QR code.
          </div>
        </div>
      </div>
    </div>
  );
}
