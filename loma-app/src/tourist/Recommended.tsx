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
import { BigCommCard } from "./BigCard";
import Detail from "./Detail";
import CommunityDetail from "./CommunityDetail";
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

// "Recommended" — the QR landing. Shows the staff-selected picks first, each with
// LOMA badges + a plain-English "Why we picked this", then routes out to the
// Explore and Community tabs.
export default function Recommended({ onGoTab }: { onGoTab: (t: TouristTab) => void }) {
  useVersion(); // re-read RECOMMENDATION_LISTS / impact after mutations
  const [view, setView] = useState<View>({ k: "list" });
  const hotel = getActiveAccount();
  const { provs, comms, assisted } = resolvePicks();

  // When the QR/link landing opens: the tourist opened the link. If it resolves to a
  // staff-shared recommendation list, the link was also successfully received.
  useEffect(() => {
    const rl = RECOMMENDATION_LISTS.length
      ? RECOMMENDATION_LISTS[RECOMMENDATION_LISTS.length - 1]
      : null;
    if (rl) trackEvent("link_received", { recommendation_list_id: rl.id });
    trackEvent("link_opened", { recommendation_list_id: rl?.id ?? null });
    provs.forEach((p) =>
      trackEvent("provider_card_viewed", { provider_id: p.id, metadata: { source: "recommended" } })
    );
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
              <BigCommCard key={c.id} c={c} onOpen={(id) => setView({ k: "comm", id })} />
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

        {/* <button
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
        </button> */}
        <div style={{ textAlign: "center", fontSize: 11, color: "var(--muted)", marginTop: 12 }}>
          Shared with you via LOMA · no app, no login
        </div>
        <div style={{ height: 10 }} />
      </div>
    </div>
  );
}
