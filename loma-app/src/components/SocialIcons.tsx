// Brand glyphs for the social row + TikTok video chrome (ported 1:1 from v3 SOC_SVG).
import type { SocialKey } from "../social";

export const FacebookIcon = () => (
  <svg viewBox="0 0 24 24" width="19" height="19" fill="#fff">
    <path d="M13.5 22v-8h2.7l.4-3.1h-3.1V9c0-.9.3-1.5 1.6-1.5h1.6V4.7C16.4 4.6 15.4 4.5 14.3 4.5c-2.3 0-3.9 1.4-3.9 4V11H7.7v3.1h2.7V22h3.1z" />
  </svg>
);

export const InstagramIcon = () => (
  <svg viewBox="0 0 24 24" width="19" height="19" fill="none" stroke="#fff" strokeWidth="2">
    <rect x="3.5" y="3.5" width="17" height="17" rx="5" />
    <circle cx="12" cy="12" r="3.7" />
    <circle cx="17.3" cy="6.7" r="1.1" fill="#fff" stroke="none" />
  </svg>
);

export const TikTokIcon = () => (
  <svg viewBox="0 0 24 24" width="19" height="19" fill="#fff">
    <path d="M16.5 3c.3 2.1 1.7 3.7 3.7 3.9v2.5c-1.4 0-2.6-.4-3.7-1.1v6.3c0 3-2.5 5.4-5.4 5.4S5.7 17.6 5.7 14.7c0-2.8 2.2-5.1 5-5.3V12c-1.3.2-2.4 1.4-2.4 2.8 0 1.5 1.3 2.8 2.8 2.8s2.8-1.3 2.8-2.8V3h2.6z" />
  </svg>
);

export const SOC_ICON: Record<SocialKey, () => React.JSX.Element> = {
  facebook: FacebookIcon,
  instagram: InstagramIcon,
  tiktok: TikTokIcon,
};
