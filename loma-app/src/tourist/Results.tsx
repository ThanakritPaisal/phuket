import ProviderCard from "../components/ProviderCard";
import { filterCatalog, type Filter } from "../data";

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
          results.map((p) => <ProviderCard key={p.id} p={p} onOpen={onOpen} />)
        )}
      </div>
    </>
  );
}
