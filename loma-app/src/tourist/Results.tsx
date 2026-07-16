import { useEffect, useRef, useState } from "react";
import BigCard from "./BigCard";
import { filterCatalog, type Filter } from "../data";
import { activePick } from "../activeAccount";

// Image-forward cards are photo-heavy, so we don't mount the whole result set at once
// (the catalogue is heading toward ~1,200 places). Render an initial page and grow it
// as a sentinel scrolls into view — keeps first paint light without a virtualization dep.
const PAGE = 30;

export default function Results({
  filter,
  onBack,
  onOpen,
}: {
  filter: Filter;
  onBack: () => void;
  onOpen: (id: string) => void;
}) {
  const results = filterCatalog(filter);
  const summary =
    [filter.category, filter.area].filter(Boolean).join(" · ") ||
    "All local places";

  const [count, setCount] = useState(PAGE);
  const sentinel = useRef<HTMLDivElement | null>(null);

  // Reset to the first page whenever the filtered set changes.
  useEffect(() => {
    setCount(PAGE);
  }, [filter, results.length]);

  // Grow the visible window as the sentinel nears the viewport.
  useEffect(() => {
    const el = sentinel.current;
    if (!el || count >= results.length) return;
    const io = new IntersectionObserver(
      (entries) => {
        if (entries.some((e) => e.isIntersecting)) {
          setCount((c) => Math.min(c + PAGE, results.length));
        }
      },
      { rootMargin: "600px" }
    );
    io.observe(el);
    return () => io.disconnect();
  }, [count, results.length]);

  const visible = results.slice(0, count);

  return (
    <>
      <div className="appbar">
        <button className="back" onClick={onBack}>
          ←
        </button>
        <div>
          <h1>Local matches</h1>
          <div className="sub">{summary}</div>
        </div>
      </div>
      <div className="scroll pad">
        <div className="count">
          {results.length} {results.length === 1 ? "place" : "places"} · sorted
          by rating
        </div>
        {results.length === 0 ? (
          <div className="empty">
            No matches for this combination.
            <br />
            Try clearing a filter.
          </div>
        ) : (
          <>
            {visible.map((p) => {
              const pk = activePick(p.id);
              return (
                <BigCard
                  key={p.id}
                  id={p.id}
                  name={p.name}
                  cat={p.category}
                  sub={p.summary}
                  img={p.photo}
                  emo={p.emo}
                  rating={p.rating}
                  reviews={p.reviews}
                  dist={p.area}
                  gem={pk?.ai.is_hidden_gem}
                  house={pk?.pick}
                  onOpen={onOpen}
                />
              );
            })}
            {count < results.length && (
              <div ref={sentinel} className="count" style={{ textAlign: "center" }}>
                Loading more places…
              </div>
            )}
          </>
        )}
      </div>
    </>
  );
}
