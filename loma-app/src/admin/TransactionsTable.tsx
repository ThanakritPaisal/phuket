import { recentTransactions, opById, staffById, fmtB } from "./helpers";

export default function TransactionsTable({ limit = 30 }: { limit?: number }) {
  const rows = recentTransactions(limit);
  return (
    <table className="t">
      <thead>
        <tr>
          <th>Provider</th>
          <th>Staff</th>
          <th>Spend</th>
          <th>Commission</th>
          <th>Local impact</th>
          <th>Method</th>
          <th>Confirmed</th>
        </tr>
      </thead>
      <tbody>
        {rows.map((t) => (
          <tr key={t.id}>
            <td>
              <b>{opById[t.operatorId]?.name ?? t.operatorId}</b>
            </td>
            <td>{staffById[t.staffId]?.name ?? t.staffId}</td>
            <td>{fmtB(t.spendTHB)}</td>
            <td>{fmtB(t.commissionTHB)}</td>
            <td>{fmtB(t.localEconomicImpactTHB)}</td>
            <td>
              <span className="tinybadge under">{t.paymentMethod}</span>
            </td>
            <td>{t.confirmedAt.slice(0, 10)}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}
