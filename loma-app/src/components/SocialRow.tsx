// "SEE THEIR SOCIALS" — FB / IG / TikTok links on the tourist AND staff provider-detail.
// Ported from v3 socialRow(p). Shared by both personas so the two detail pages stay identical.
import { SOC_BG, type SocialKey, type SocialLinks } from "../social";
import { SOC_ICON } from "./SocialIcons";
import "./social.css";

const ORDER: SocialKey[] = ["facebook", "instagram", "tiktok"];

export default function SocialRow({ social }: { social?: SocialLinks | null }) {
  if (!social) return null;
  const keys = ORDER.filter((k) => social[k]);
  if (!keys.length) return null;
  return (
    <div style={{ marginTop: 16 }}>
      <div className="soc-h">See their socials</div>
      <div style={{ display: "flex", gap: 11 }}>
        {keys.map((k) => {
          const Icon = SOC_ICON[k];
          return (
            <a
              key={k}
              href={social[k]}
              target="_blank"
              rel="noopener noreferrer"
              title={k[0].toUpperCase() + k.slice(1)}
              className="soc-btn"
              style={{ background: SOC_BG[k] }}
            >
              <Icon />
            </a>
          );
        })}
      </div>
    </div>
  );
}
