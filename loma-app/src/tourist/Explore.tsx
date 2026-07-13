import { useState } from "react";
import type { Filter } from "../data";
import Home from "./Home";
import Results from "./Results";
import Detail from "./Detail";

// "Explore Nearby" — the existing live-data discovery flow over REAL Google
// providers (Home → Results → Detail), unchanged, now hosted under a tab.
type Screen = { name: "home" } | { name: "results" } | { name: "detail"; id: string };

export default function Explore() {
  const [screen, setScreen] = useState<Screen>({ name: "home" });
  const [filter, setFilter] = useState<Filter>({ area: null, category: null, openNow: false });

  if (screen.name === "detail")
    return <Detail id={screen.id} onBack={() => setScreen({ name: "results" })} />;
  if (screen.name === "results")
    return (
      <Results
        filter={filter}
        onBack={() => setScreen({ name: "home" })}
        onOpen={(id) => setScreen({ name: "detail", id })}
      />
    );
  return (
    <Home
      filter={filter}
      setFilter={setFilter}
      onSeeResults={() => setScreen({ name: "results" })}
    />
  );
}
