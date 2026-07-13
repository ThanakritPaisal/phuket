import { recentFeedback } from "./helpers";

function stars(n: number): string {
  return "★".repeat(n) + "☆".repeat(5 - n);
}

// Recent rated recommendations — used by the Feedback view.
export default function RecommendationsTable({ limit = 10 }: { limit?: number }) {
  const rows = recentFeedback(limit);
  return (
    <table className="t">
      <thead>
        <tr>
          <th>Provider</th>
          <th>Category</th>
          <th>Area</th>
          <th>Rating</th>
          <th>When</th>
          <th>Flag</th>
        </tr>
      </thead>
      <tbody>
        {rows.map((r, i) => (
          <tr key={i}>
            <td>
              <b>{r.provider}</b>
            </td>
            <td>{r.category}</td>
            <td>{r.area}</td>
            <td style={{ color: "#E0A93C", whiteSpace: "nowrap" }}>
              {stars(r.rating)}
            </td>
            <td>{r.when}</td>
            <td>
              <span
                className={"tinybadge " + (r.flag === "Positive" ? "hot" : "under")}
              >
                {r.flag}
              </span>
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}
