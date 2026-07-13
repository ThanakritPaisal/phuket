import { Screen, bg, prov, useStaff } from "./helpers";

const ROWS: [string, string, string, string][] = [
  ["OTH", "2h ago", "Opened ✓", "—"],
  ["BRT", "Yesterday", "Visit confirmed ✓", "฿620 logged"],
  ["RFE", "2 days ago", "Directions clicked", "—"],
  ["KLD", "3 days ago", "Shared", "Not opened"],
  ["PCH", "4 days ago", "Visit confirmed ✓", "฿340 logged"],
];

export default function StaffRecent() {
  const { openProv } = useStaff();
  return (
    <Screen active="recent">
      <h2 style={{ fontSize: 17 }}>Recent recommendations</h2>
      <div style={{ fontSize: 12.5, color: "var(--muted)", margin: "3px 0 14px" }}>
        Every share is tracked anonymously with a referral code.
      </div>
      {ROWS.map(([id, t, st, sp]) => {
        const p = prov(id);
        const good = st.includes("✓");
        return (
          <div className="prow" key={id} onClick={() => openProv(id)}>
            <div className="thumb" style={bg(p.img)} />
            <div className="info">
              <h3>{p.name}</h3>
              <div className="m">
                {t} · {p.area}
              </div>
              <div className="bd">
                <span className={`tinybadge ${good ? "hot" : "under"}`}>{st}</span>
                {sp !== "—" && (
                  <span className="tinybadge" style={{ background: "var(--accent-l)", color: "var(--accent)" }}>
                    {sp}
                  </span>
                )}
              </div>
            </div>
          </div>
        );
      })}
    </Screen>
  );
}
