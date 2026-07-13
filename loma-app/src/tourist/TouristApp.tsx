import { useState } from "react";
import Recommended from "./Recommended";
import Explore from "./Explore";
import Community from "./Community";
import HotelInfo from "./HotelInfo";
import TabBar, { type TouristTab } from "./TabBar";
import "./tourist.css";
import "./v2.css";

// TOURIST v2 — no login. QR opens on "Recommended" (the staff-selected picks),
// then four bottom tabs: Recommended · Explore Nearby · Community · Hotel Info.
export default function TouristApp() {
  const [tab, setTab] = useState<TouristTab>("recommended");

  return (
    <>
      {tab === "recommended" && <Recommended onGoTab={setTab} />}
      {tab === "explore" && <Explore />}
      {tab === "community" && <Community />}
      {tab === "hotel" && <HotelInfo />}
      <TabBar tab={tab} onTab={setTab} />
    </>
  );
}
