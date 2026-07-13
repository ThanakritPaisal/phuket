import { operatorRows, fmtBk } from "./helpers";

export default function OperatorsTable({ limit = 40 }: { limit?: number }) {
  const rows = operatorRows(limit);
  return (
    <table className="t">
      <thead>
        <tr>
          <th>Provider</th>
          <th>Category</th>
          <th>Area</th>
          <th>Leads</th>
          <th>Visits</th>
          <th>Spend</th>
          <th>Local</th>
          <th>Status</th>
        </tr>
      </thead>
      <tbody>
        {rows.map(({ o, leads, visits, spend }) => (
          <tr key={o.id}>
            <td>
              <div className="tcell">
                <span className="tthumb">{o.emo}</span>
                <b>{o.name}</b>
              </div>
            </td>
            <td>{o.cat}</td>
            <td>{o.area}</td>
            <td>{leads}</td>
            <td>{visits}</td>
            <td>{fmtBk(spend)}</td>
            <td>{o.locality}</td>
            <td>
              {o.verified ? (
                <span className="tinybadge hot">Verified</span>
              ) : (
                <span className="tinybadge under">{o.vettingStatus}</span>
              )}
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}
