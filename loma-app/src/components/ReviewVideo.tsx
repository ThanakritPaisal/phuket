// MOCK TikTok review-video player (v3 reviewVideo / .rvid).
// DEMO ONLY: the provider photo with a Ken-Burns motion + fake TikTok chrome to
// simulate an auto-playing review clip. Tap toggles a paused state.
// PRODUCTION: replace .poster with a real <video>/TikTok embed sourced from the
// shop's pinned review-clip URL (pick.reviewClips[0] || top clips of pick.tiktok_place).
import { useState } from "react";
import { TikTokIcon } from "./SocialIcons";
import "./social.css";

interface ReviewVideoPick {
  name: string;
  sum?: string;
  rating?: number;
  img?: string;
}

export default function ReviewVideo({ pick }: { pick: ReviewVideoPick }) {
  const [paused, setPaused] = useState(false);
  const handle =
    "@" + ((pick.name || "").toLowerCase().replace(/[^a-z0-9]+/g, "").slice(0, 18) || "phuketreview");
  const cap = pick.sum ? pick.sum.split(". ")[0] : "Real tourists reviewing " + (pick.name || "this place");

  return (
    <div
      className={"rvid" + (paused ? " paused" : "")}
      onClick={() => setPaused((p) => !p)}
      title="Tap to play / pause (mock)"
    >
      <div className="poster" style={pick.img ? { backgroundImage: `url(${pick.img})` } : undefined} />
      <div className="scrim" />
      <div className="rv-tt">
        <TikTokIcon /> TikTok review
      </div>
      <div className="rv-live">
        <span className="dot" />
        LIVE
      </div>
      <div className="rv-play">
        <svg viewBox="0 0 24 24" width="26" height="26" fill="#fff">
          <path d="M8 5v14l11-7z" />
        </svg>
      </div>
      <div className="rv-rail">
        <div className="a">
          <span>♥</span>1.2k
        </div>
        <div className="a">
          <span>💬</span>86
        </div>
        <div className="a">
          <span>↗</span>share
        </div>
      </div>
      <div className="rv-cap">
        <div className="h">{handle}</div>
        <div className="t">
          {cap} · ★ {pick.rating ?? "—"}
        </div>
      </div>
      <div className="rv-bar">
        <i />
      </div>
    </div>
  );
}
