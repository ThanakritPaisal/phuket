import { useEffect, useState } from "react";
import { useVersion } from "../store";
import { RECOMMENDATION_LISTS } from "../recommendations";
import { activePick, activePicks, getActiveAccount } from "../activeAccount";
import { community } from "../v2data";
import type { Community } from "../v2data";
import type { Pick } from "../picks";
import { trackEvent } from "../impact";
import Icon from "../components/Icon";
import TourCard from "./TourCard";
import Detail from "./Detail";
import CommunityDetail, { ReadinessBadge } from "./CommunityDetail";
import type { TouristTab } from "./TabBar";

type View = { k: "list" } | { k: "prov"; id: string } | { k: "comm"; id: string };

// Resolve the picks to show: the most recent staff-selected recommendation list
// if there is one, otherwise the signed-in property's nearest verified picks.
function resolvePicks(): { provs: Pick[]; comms: Community[]; assisted: boolean } {
  const rl = RECOMMENDATION_LISTS.length
    ? RECOMMENDATION_LISTS[RECOMMENDATION_LISTS.length - 1]
    : null;
  if (rl) {
    const provs: Pick[] = [];
    const comms: Community[] = [];
    for (const id of rl.items) {
      const pk = activePick(id);
      if (pk) provs.push(pk);
      else {
        const c = community(id);
        if (c) comms.push(c);
      }
    }
    return { provs, comms, assisted: rl.kind === "assisted" };
  }
  return {
    provs: activePicks()
      .filter((p) => p.ai.is_verified)
      .slice(0, 6),
    comms: [],
    assisted: false,
  };
}

function CommRecCard({
  c,
  onOpen,
}: {
  c: Community;
  onOpen: (id: string) => void;
}) {
  const tel = c.phone.replace(/[^0-9]/g, "");
  return (
    <div className="pcard" style={{ marginBottom: 12 }}>
      <div
        className="ph"
        style={c.img ? { backgroundImage: `url(${c.img})` } : undefined}
        onClick={() => onOpen(c.id)}
      >
        {!c.img && <div className="ph-emo">{c.emo}</div>}
        <div className="ph-badges">
          <span className="badge b-pick">🛶 Community Experience</span>
          <ReadinessBadge c={c} />
        </div>
      </div>
      <div className="body">
        <div className="ttl">
          <h3 onClick={() => onOpen(c.id)}>{c.name}</h3>
        </div>
        <div className="meta">
          📍 {c.area} · {c.duration} · from {c.priceFrom.split("/")[0].split("·")[0].trim()}
        </div>
        <div className="aibox">
          <div className="lab">
            <Icon name="spark" size={12} /> Why your hosts picked this
          </div>
          <p>
            {c.about.split(". ")[0]}. Run by the community itself — the money stays
            in the village.
          </p>
        </div>
        <div className="t-plan">📞 Planned experience — contact the community to confirm availability</div>
        <div className="cta2">
          <a
            className="btn btn-primary btn-sm"
            href={`tel:${tel}`}
            onClick={() => trackEvent("community_inquiry_clicked", { community_id: c.id })}
          >
            <Icon name="phone" size={16} /> Contact Community
          </a>
          <button className="btn btn-line btn-sm" onClick={() => onOpen(c.id)}>
            <Icon name="list" size={16} /> See programme
          </button>
        </div>
      </div>
    </div>
  );
}

// "Recommended" — the QR landing. Shows the staff-selected picks first, each with
// LOMA badges + a plain-English "Why we picked this", then routes out to the
// Explore and Community tabs.
export default function Recommended({ onGoTab }: { onGoTab: (t: TouristTab) => void }) {
  useVersion(); // re-read RECOMMENDATION_LISTS / impact after mutations
  const [view, setView] = useState<View>({ k: "list" });
  const hotel = getActiveAccount();
  const { provs, comms, assisted } = resolvePicks();

  // Fire provider_card_viewed for each provider pick when the landing opens.
  useEffect(() => {
    provs.forEach((p) => trackEvent("provider_card_viewed", { provider_id: p.id }));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (view.k === "prov")
    return <Detail id={view.id} onBack={() => setView({ k: "list" })} />;
  if (view.k === "comm")
    return <CommunityDetail id={view.id} onBack={() => setView({ k: "list" })} />;

  const total = provs.length + comms.length;

  return (
    <div className="scroll">
      <div className="t-rechero">
        <div>
          <div className="kick">
            {assisted ? "Picked for you by the front desk" : "Recommended by this hotel"}
          </div>
          <div className="ttl">Local picks recommended for you</div>
          <div className="sub">{hotel.name} · No app required</div>
        </div>
      </div>
      <div className="pad">
        <div className="tc-by">
          <div className="h">🏨</div>
          <div>
            <b>Recommended by {hotel.name}</b>
            <br />
            <span style={{ fontSize: 11.5 }}>
              {assisted
                ? `Chosen for you just now — ${total} place${total === 1 ? "" : "s"}`
                : "Our standing local favourites — browse freely"}
            </span>
          </div>
        </div>
        <div className="t-nocomm">🛡 No hidden commission — nobody paid to appear here.</div>

        {comms.length > 0 && (
          <>
            <div className="t-secrow">
              <b>🛶 Community experiences</b>
              <i>· plan ahead — contact before visiting</i>
            </div>
            {comms.map((c) => (
              <CommRecCard key={c.id} c={c} onOpen={(id) => setView({ k: "comm", id })} />
            ))}
          </>
        )}

        {provs.length > 0 && (
          <>
            <div className="t-secrow">
              <b>🏪 Places you can visit today</b>
              <i>· walk in — no booking needed</i>
            </div>
            {provs.map((p) => (
              <TourCard key={p.id} p={p} onOpen={(id) => setView({ k: "prov", id })} />
            ))}
          </>
        )}

        {total === 0 && (
          <div style={{ textAlign: "center", color: "var(--muted)", padding: 34 }}>
            <div style={{ fontSize: 30 }}>💎</div>
            <div style={{ marginTop: 8, fontSize: 13 }}>
              Nothing shared yet — tap <b>Explore Nearby</b> to browse local places.
            </div>
          </div>
        )}

        <button
          className="btn btn-line"
          style={{ marginTop: 6 }}
          onClick={() => onGoTab("explore")}
        >
          <Icon name="map" size={16} /> Explore more local places around {hotel.name} ›
        </button>
        <button
          className="btn btn-line"
          style={{ marginTop: 8 }}
          onClick={() => onGoTab("community")}
        >
          🛶 See community experiences across Phuket ›
        </button>
        <div style={{ textAlign: "center", fontSize: 11, color: "var(--muted)", marginTop: 12 }}>
          Shared with you via LOMA · no app, no login
        </div>
        <div style={{ height: 10 }} />
      </div>
    </div>
  );
}
