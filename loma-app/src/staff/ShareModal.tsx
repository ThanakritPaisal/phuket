import { useState } from "react";
import Icon from "../components/Icon";
import type { IconName } from "../types";
import { trackEvent } from "../impact";
import { buildShareUrlFromIds, channelHref, channelHasQR, openShareChannel, copyLink } from "../qr";
import QRCode from "../components/QRCode";
import {
  attribution,
  bg,
  filterCatalog,
  prov,
  refFor,
  routeStops,
  useStaff,
} from "./helpers";

type Channel = { label: string; bg: string; emoji?: string; icon?: IconName };
const CHANNELS: Channel[] = [
  { label: "QR", bg: "#0C1F1D", icon: "qr" },
  { label: "WhatsApp", bg: "#25D366", emoji: "💬" },
  { label: "LINE", bg: "#06C755", emoji: "💚" },
  { label: "Copy link", bg: "var(--primary)", icon: "copy" },
  { label: "SMS", bg: "#2563B0", emoji: "✉️" },
  { label: "Email", bg: "#5C6B6B", emoji: "@" },
];

function ShareGrid({ onPick, selected }: { onPick: (c: string) => void; selected: string | null }) {
  return (
    <div className="share-grid">
      {CHANNELS.map((c) => (
        <button
          key={c.label}
          className={`share-opt ${selected === c.label ? "sel" : ""}`}
          onClick={() => onPick(c.label)}
        >
          <span className="si" style={{ background: c.bg }}>
            {c.icon ? <Icon name={c.icon} size={18} /> : c.emoji}
          </span>
          {c.label === "QR" ? "Show QR" : c.label === "Copy link" ? "Copy Link" : c.label}
        </button>
      ))}
    </div>
  );
}

function Sheet({ children, onClose }: { children: React.ReactNode; onClose: () => void }) {
  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <div className="sheet-handle" />
        <div className="pad" style={{ paddingTop: 6 }}>
          {children}
        </div>
      </div>
    </div>
  );
}

function ShareOne({ id }: { id: string }) {
  const { partner, closeModal, markRecommended, toast } = useStaff();
  const p = prov(id);
  const [ch, setCh] = useState<string | null>(null);
  const shareUrl = buildShareUrlFromIds([id], "assisted", partner);
  const msg = `${p.name} — ${attribution(partner)}`;
  const pick = async (c: string) => {
    setCh(c);
    trackEvent("link_shared", { provider_id: id, metadata: { channel: c } });
    if (c === "Copy link") {
      toast((await copyLink(shareUrl)) ? "✓ Link copied" : "Copy: " + shareUrl);
    } else if (channelHasQR(c)) {
      toast("Tourist scans this QR");
    } else if (openShareChannel(c, shareUrl, msg)) {
      toast("Opening " + c + "…");
    }
  };
  // The QR to display for the selected channel: WhatsApp/LINE encode their app deep link
  // (scan → opens that app); "QR" encodes the plain link (scan → opens in browser).
  const qrValue = ch === "QR" ? shareUrl : channelHasQR(ch || "") ? channelHref(ch!, shareUrl, msg) : null;
  return (
    <Sheet onClose={closeModal}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <h3 style={{ fontSize: 17 }}>Share with tourist</h3>
        <button style={{ fontSize: 22, color: "var(--muted)" }} onClick={closeModal}>
          ×
        </button>
      </div>
      <div style={{ fontSize: 12.5, color: "var(--muted)", marginTop: 2 }}>
        Preview of the card the tourist will open
      </div>

      <div className="pcard" style={{ marginTop: 12 }}>
        <div className="ph" style={{ height: 96, ...bg(p.img) }}>
          <div className="ph-badges">
            <span className="badge b-local">🌿 Local</span>
            {p.verified && (
              <span className="badge b-verified">
                <Icon name="verified" size={12} /> Verified
              </span>
            )}
          </div>
        </div>
        <div className="body" style={{ padding: "11px 13px" }}>
          <div className="ttl">
            <div>
              <h3 style={{ fontSize: 14 }}>{p.name}</h3>
              <div className="meta">
                {p.cat} · {p.dist}
              </div>
            </div>
          </div>
          <div style={{ fontSize: 11.5, color: "var(--accent)", background: "var(--accent-l)", borderRadius: 8, padding: "6px 9px", marginTop: 8 }}>
            {attribution(partner)}
          </div>
        </div>
      </div>

      <div className="refcode" style={{ marginTop: 14 }}>
        <div className="lab">Referral code</div>
        <div className="code">{refFor(id)}</div>
        <div style={{ fontSize: 11, color: "var(--muted)" }}>Used to confirm the visit &amp; measure impact</div>
      </div>

      <div className="h-sec">Share via</div>
      <ShareGrid onPick={pick} selected={ch} />

      {qrValue && (
        <div style={{ textAlign: "center", marginTop: 12 }}>
          <div style={{ display: "inline-block", padding: 12, background: "#fff", borderRadius: 14, border: "1px solid var(--line)" }}>
            <QRCode value={qrValue} size={168} />
          </div>
          <div style={{ fontSize: 11.5, color: "var(--muted)", marginTop: 6 }}>
            {ch === "WhatsApp"
              ? "Tourist scans → opens in WhatsApp"
              : ch === "LINE"
              ? "Tourist scans → opens in LINE"
              : `Tourist scans with their camera — opens ${p.name} instantly`}
          </div>
        </div>
      )}

      <div className="h-sec">Optional</div>
      <input className="pp-input sm" placeholder="Tourist name or room number (optional)" style={{ marginBottom: 8 }} />
      <input className="pp-input sm" placeholder="Note for tourist (optional)" defaultValue={attribution(partner)} />

      <div style={{ fontSize: 11.5, color: "var(--muted)", background: "var(--surface-2)", borderRadius: 9, padding: "9px 11px", marginTop: 12 }}>
        🔒 No tourist personal data required. This recommendation is tracked anonymously for impact reporting.
      </div>

      <div style={{ marginTop: 14 }}>
        <button className="btn btn-primary" onClick={markRecommended}>
          <Icon name="check" size={16} /> Mark as Recommended
        </button>
      </div>
      <div style={{ height: 8 }} />
    </Sheet>
  );
}

function ShareSet() {
  const { filter, routeDest, routeCats, hd, planKind, saved, shareDeselect, partner, closeModal, markRecommended, toast } =
    useStaff();
  const [ch, setCh] = useState<string | null>(null);

  let stops;
  if (planKind === "custom") {
    stops = [...saved].filter((id) => !shareDeselect.has(id)).map(prov).slice(0, 6);
  } else if (filter.mode === "halfday") {
    stops = filterCatalog(filter, {
      halfday: true,
      cat: null,
      cats: null,
      family: false,
      rainy: false,
      openNow: false,
      budget: hd.budget,
    }).slice(0, 4);
  } else {
    stops = routeStops(filter, routeCats).slice(0, 4);
  }
  const route = planKind !== "custom" && filter.mode === "route";
  const title =
    planKind === "custom"
      ? partner.name + "'s picks"
      : filter.mode === "halfday"
      ? "Half-day plan"
      : "Route toward " + routeDest;
  const word = planKind === "custom" ? "picks" : filter.mode === "halfday" ? "plan" : "route";
  const code = "LOMA-PLAN-" + (1000 + ((title.length * 611) % 9000));
  const shareUrl = buildShareUrlFromIds(stops.map((s) => s.id), "assisted", partner);
  const msg = `${title} — ${attribution(partner)}`;
  const qrValue = ch === "QR" ? shareUrl : channelHasQR(ch || "") ? channelHref(ch!, shareUrl, msg) : null;

  return (
    <Sheet onClose={closeModal}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <h3 style={{ fontSize: 17 }}>Share {word} with tourist</h3>
        <button style={{ fontSize: 22, color: "var(--muted)" }} onClick={closeModal}>
          ×
        </button>
      </div>
      <div style={{ fontSize: 12.5, color: "var(--muted)", marginTop: 2 }}>
        {title} · {stops.length} {route ? "stops" : "places"} · one link, opens as a mini card
      </div>
      {stops.map((p, i) => (
        <div className="prow" key={p.id} style={{ marginTop: 10 }}>
          <div className="thumb" style={bg(p.img)} />
          <div className="info">
            <h3 style={{ fontSize: 13.5 }}>
              {route ? `Stop ${i + 1} · ` : ""}
              {p.name}
            </h3>
            <div className="m">
              {p.emo} {p.cat} · {p.dist}
            </div>
          </div>
        </div>
      ))}
      <div className="refcode" style={{ marginTop: 14 }}>
        <div className="lab">Plan referral code</div>
        <div className="code" style={{ fontSize: 22 }}>
          {code}
        </div>
        <div style={{ fontSize: 11, color: "var(--muted)" }}>Each stop is tracked back to this plan</div>
      </div>
      <div className="h-sec">Share via</div>
      <ShareGrid
        onPick={async (c) => {
          setCh(c);
          trackEvent("link_shared", {
            recommendation_list_id: code,
            metadata: { channel: c, plan: title },
          });
          if (c === "Copy link") {
            toast((await copyLink(shareUrl)) ? "✓ Link copied" : "Copy: " + shareUrl);
          } else if (channelHasQR(c)) {
            toast("Tourist scans this QR");
          } else if (openShareChannel(c, shareUrl, msg)) {
            toast("Opening " + c + "…");
          }
        }}
        selected={ch}
      />
      {qrValue && (
        <div style={{ textAlign: "center", marginTop: 12 }}>
          <div style={{ display: "inline-block", padding: 12, background: "#fff", borderRadius: 14, border: "1px solid var(--line)" }}>
            <QRCode value={qrValue} size={168} />
          </div>
          <div style={{ fontSize: 11.5, color: "var(--muted)", marginTop: 6 }}>
            {ch === "WhatsApp"
              ? "Tourist scans → opens in WhatsApp"
              : ch === "LINE"
              ? "Tourist scans → opens in LINE"
              : `Tourist scans with their camera — opens all ${stops.length} places`}
          </div>
        </div>
      )}
      <div style={{ fontSize: 11.5, color: "var(--muted)", background: "var(--surface-2)", borderRadius: 9, padding: "9px 11px", marginTop: 12 }}>
        🔒 No tourist data required. The tourist sees an itinerary card · “{attribution(partner)}”.
      </div>
      <div style={{ marginTop: 14 }}>
        <button className="btn btn-primary" onClick={markRecommended}>
          <Icon name="check" size={16} /> Mark as Recommended
        </button>
      </div>
      <div style={{ height: 8 }} />
    </Sheet>
  );
}

function CounterQR() {
  const { partner, saved, ssMode, setSsMode, closeModal, toast } = useStaff();
  const curated = (partner.housePicks || []).length + saved.size;
  // Standee QR encodes the hotel's curated picks (house picks + saved) as a passive link.
  const standeeIds = [...(partner.housePicks || []), ...saved];
  const standeeUrl = buildShareUrlFromIds(standeeIds, "passive", partner);
  return (
    <Sheet onClose={closeModal}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <h3 style={{ fontSize: 17 }}>Counter QR / standee</h3>
        <button style={{ fontSize: 22, color: "var(--muted)" }} onClick={closeModal}>
          ×
        </button>
      </div>
      <div style={{ fontSize: 12.5, color: "var(--muted)", marginTop: 2 }}>
        For when no one's at the counter. Place it on the desk, in rooms, or on a key card — guests scan and
        self-serve.
      </div>
      <div style={{ border: "1px solid var(--line)", borderRadius: 16, padding: "20px 18px", textAlign: "center", marginTop: 14, background: "#fff" }}>
        <div style={{ fontSize: 11, fontWeight: 800, letterSpacing: ".6px", color: "var(--primary-d)" }}>
          LOCAL RECOMMENDATIONS
        </div>
        <div style={{ fontSize: 18, fontWeight: 800, margin: "5px 0 2px" }}>{partner.name}</div>
        <div style={{ fontSize: 12, color: "var(--muted)" }}>Trusted local food, cafés &amp; experiences near you</div>
        <div className="qr" style={{ width: 152, height: 152, margin: "14px auto" }}>
          <QRCode value={standeeUrl} size={152} />
        </div>
        <div style={{ fontSize: 12.5, fontWeight: 700, color: "var(--primary-d)" }}>
          Scan with your camera · no app needed
        </div>
        <div style={{ fontSize: 11, color: "var(--accent)", background: "var(--accent-l)", borderRadius: 8, padding: "6px 10px", marginTop: 10, display: "inline-block" }}>
          {attribution(partner)}
        </div>
      </div>
      <div className="h-sec">What the QR shows</div>
      <div className="segmented">
        <button className={ssMode !== "house" ? "on" : ""} onClick={() => setSsMode("auto")}>
          <span className="em">⭐➕</span>House picks + auto-fill
        </button>
        <button className={ssMode === "house" ? "on" : ""} onClick={() => setSsMode("house")}>
          <span className="em">⭐</span>House picks only
        </button>
      </div>
      <div style={{ fontSize: 11.5, color: "var(--muted)", marginTop: 7 }}>
        Guests first see your <b>Saved / house picks</b> ({curated} curated)
        {ssMode !== "house"
          ? ", then we auto-fill with verified, open places nearby so the list is never empty."
          : " — and nothing else."}
      </div>
      <div style={{ marginTop: 14 }}>
        <button className="btn btn-primary" onClick={() => toast("Standee PDF would download")}>
          <Icon name="check" size={16} /> Print standee (A5)
        </button>
      </div>
      <div style={{ fontSize: 11.5, color: "var(--muted)", background: "var(--surface-2)", borderRadius: 9, padding: "9px 11px", marginTop: 10 }}>
        Scans are tracked to your account — self-serve recommendations count toward your impact, same as staff
        shares.
      </div>
      <div style={{ height: 8 }} />
    </Sheet>
  );
}

export { CounterQR, ShareOne, ShareSet };
