import { staffLeaderboard, fmtBk, pct } from "./helpers";

export default function StaffTable({ limit = 30 }: { limit?: number }) {
  const rows = staffLeaderboard().slice(0, limit);
  return (
    <table className="t">
      <thead>
        <tr>
          <th>Staff</th>
          <th>Role</th>
          <th>Venue</th>
          <th>Area</th>
          <th>Recs</th>
          <th>Visits</th>
          <th>Conversion</th>
          <th>Commission</th>
        </tr>
      </thead>
      <tbody>
        {rows.map((s) => (
          <tr key={s.id}>
            <td>
              <div className="tcell">
                <b>{s.name}</b>
                {!s.active && (
                  <span className="tinybadge under" style={{ marginLeft: 6 }}>
                    inactive
                  </span>
                )}
              </div>
            </td>
            <td>{s.role}</td>
            <td>{s.venue}</td>
            <td>{s.area}</td>
            <td>{s.recs}</td>
            <td>{s.visits}</td>
            <td>
              <span
                className={
                  "tinybadge " + (s.conversionRate > 0.25 ? "hot" : "under")
                }
              >
                {pct(s.conversionRate)}
              </span>
            </td>
            <td>{fmtBk(s.commissionTHB)}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}
