import { useState } from "react";
import { activePick, activePicks } from "../../activeAccount";
import type { Pick } from "../../picks";
import SharedCard from "./SharedCard";
import Referral from "./Referral";
import Feedback from "./Feedback";
import Thanks from "./Thanks";
import SelfServe from "./SelfServe";

type Screen = "card" | "ref" | "feedback" | "thanks" | "selfserve";

export default function MockTouristApp() {
  const [screen, setScreen] = useState<Screen>("card");
  // Default to the nearest real pick for the recommending property.
  const [curId, setCurId] = useState<string>(() => activePicks()[0].id);
  const p: Pick = activePick(curId) ?? activePicks()[0];

  switch (screen) {
    case "ref":
      return <Referral p={p} onBack={() => setScreen("card")} />;
    case "feedback":
      return <Feedback p={p} onSubmit={() => setScreen("thanks")} />;
    case "thanks":
      return (
        <Thanks p={p} onMore={() => setScreen("selfserve")} onBack={() => setScreen("card")} />
      );
    case "selfserve":
      return (
        <SelfServe
          onOpen={(id) => {
            setCurId(id);
            setScreen("card");
          }}
        />
      );
    default:
      return (
        <SharedCard
          p={p}
          onShowRef={() => setScreen("ref")}
          onFeedback={() => setScreen("feedback")}
        />
      );
  }
}
