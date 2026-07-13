import type { CatalogProvider } from "../types";
import { provStats, PROV_LEADS, inits, fmtBk } from "./lib";
import type { ProvScreen } from "./Chrome";

export default function ProviderLeads({
  p,
  onGo,
}: {
  p: CatalogProvider;
  onGo: (s: ProvScreen) => void;
}) {
  const s = provStats(p);
  return (
    <div className="pad">
      <h2 style={{ fontSize: 17 }}>Tourist leads</h2>
      <div style={{ fontSize: 12.5, color: "var(--muted)", margin: "3px 0 12px" }}>
        Guests recommended to you, and who sent them.
      </div>
      <div className="kv">
        <div>
          <div className="k">Leads · 30d</div>
          <div className="v">{s.leads}</div>
        </div>
        <div>
          <div className="k">Confirmed</div>
          <div className="v">{s.visits}</div>
        </div>
        <div>
          <div className="k">Reported spend</div>
          <div className="v">{fmtBk(s.revenue)}</div>
        </div>
        <div>
          <div className="k">Conversion</div>
          <div className="v">{s.conv}%</div>
        </div>
      </div>
      <div className="h-sec">Recent leads</div>
      {PROV_LEADS.map((l, i) => (
        <div className="lead-row" key={i}>
          <div className="ds">{inits(l.by)}</div>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 13.5, fontWeight: 600 }}>{l.by}</div>
            <div style={{ fontSize: 11.5, color: "var(--muted)" }}>
              {l.ctx} · {l.when}
            </div>
          </div>
          <div style={{ textAlign: "right" }}>
            {l.status === "New" ? (
              <button className="btn btn-primary btn-sm" onClick={() => onGo("confirm")}>
                Confirm
              </button>
            ) : (
              <>
                <span className={`tinybadge ${l.status === "Confirmed" ? "hot" : "under"}`}>
                  {l.status}
                </span>
                <div style={{ fontSize: 12, fontWeight: 700, marginTop: 3 }}>{l.spend}</div>
              </>
            )}
          </div>
        </div>
      ))}
    </div>
  );
}
