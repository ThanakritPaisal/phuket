import { AREAS, CATEGORIES, filterCatalog, type Filter } from "../data";

export default function Home({
  filter,
  setFilter,
  onSeeResults,
}: {
  filter: Filter;
  setFilter: (f: Filter) => void;
  onSeeResults: () => void;
}) {
  const count = filterCatalog(filter).length;
  const toggle = <K extends keyof Filter>(key: K, val: Filter[K]) =>
    setFilter({ ...filter, [key]: filter[key] === val ? null : val });

  return (
    <>
      <div className="appbar">
        <div>
          <h1>Discover local Phuket</h1>
          <div className="sub">Community-run places, verified on the ground</div>
        </div>
      </div>
      <div className="scroll pad">
        <div className="why" style={{ marginTop: 0 }}>
          <div className="lab">Find your match</div>
          <p>
            Pick an area and what you're after — we'll match you with locally
            owned spots, not the tourist traps.
          </p>
        </div>

        <div className="sec-h">Area</div>
        <div className="chips" style={{ marginTop: 8 }}>
          {AREAS.map((a) => (
            <button
              key={a}
              className={`chip ${filter.area === a ? "on" : ""}`}
              onClick={() => toggle("area", a)}
            >
              {a}
            </button>
          ))}
        </div>

        <div className="sec-h">What are you after?</div>
        <div className="chips" style={{ marginTop: 8 }}>
          {CATEGORIES.map((c) => (
            <button
              key={c}
              className={`chip ${filter.category === c ? "on" : ""}`}
              onClick={() => toggle("category", c)}
            >
              {c}
            </button>
          ))}
        </div>

        <div className="sec-h">Availability</div>
        <div className="chips" style={{ marginTop: 8 }}>
          <button
            className={`chip ${filter.openNow ? "on" : ""}`}
            onClick={() => setFilter({ ...filter, openNow: !filter.openNow })}
          >
            ● Open now
          </button>
        </div>
      </div>
      <div className="stick-cta">
        <button className="btn btn-primary" onClick={onSeeResults}>
          See {count} local {count === 1 ? "place" : "places"}
        </button>
      </div>
    </>
  );
}
