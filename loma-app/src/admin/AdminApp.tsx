import { useState } from "react";
import "./admin.css";
import {
  OverviewView,
  FunnelView,
  ProvidersView,
  PartnersView,
  StaffView,
  CategoryView,
  RevenueView,
  MapView,
  VerifyView,
  PartnerAppsView,
  IntegrityView,
  FeedbackView,
} from "./views";
import {
  CurationProvider,
  CandidatesView,
  ShortlistView,
  QueueView,
  ApprovedView,
  CommunitiesView,
  ImpactView,
  EconView,
} from "./curation";

type ViewKey =
  | "overview"
  | "funnel"
  | "providers"
  | "partners"
  | "staff"
  | "category"
  | "revenue"
  | "map"
  | "verify"
  | "partnerapps"
  | "integrity"
  | "feedback"
  | "candidates"
  | "shortlist"
  | "queue"
  | "approved"
  | "communities"
  | "impact"
  | "econ";

interface NavItem {
  key: ViewKey;
  label: string;
  title: string;
  sub: string;
  divider?: boolean;
}

const NAV: NavItem[] = [
  { key: "overview", label: "📈 Overview", title: "Destination overview", sub: "Is LOMA creating real local impact?" },
  { key: "funnel", label: "🔻 Recommendation funnel", title: "Recommendation funnel", sub: "From recommendation to confirmed local spend" },
  { key: "providers", label: "🏪 Local provider performance", title: "Local provider performance", sub: "Who gets leads — and who needs visibility" },
  { key: "partners", label: "🏨 Demand partner usage", title: "Demand partner usage", sub: "Which hotels & rentals drive recommendations" },
  { key: "staff", label: "🧑‍💼 Frontline staff", title: "Frontline staff performance", sub: "Who is turning local knowledge into visits" },
  { key: "category", label: "🗂 Category performance", title: "Category performance", sub: "MVP focus: food, wellness, community" },
  { key: "revenue", label: "💵 Revenue & transactions", title: "Revenue & transactions", sub: "Reported spend, commission & local impact" },
  { key: "map", label: "🗺 Map of recommendations", title: "Map of recommendations", sub: "Where tourists are being sent" },
  { key: "verify", label: "✅ Provider verification", title: "Provider verification", sub: "Approve trusted local providers", divider: true },
  { key: "partnerapps", label: "🛡 Partner approvals", title: "Demand partner approvals", sub: "Verify business identity & ownership before activation" },
  { key: "integrity", label: "🚨 Integrity & fraud", title: "Integrity & fraud", sub: "Catch self-dealing and gamed recommendations" },
  { key: "feedback", label: "💬 Feedback & complaints", title: "Feedback & complaints", sub: "Tourist satisfaction & quality signals" },
  { key: "candidates", label: "🛰 Provider candidates", title: "Provider candidates", sub: "Four discovery channels — AI, hotels, communities, self-registration", divider: true },
  { key: "shortlist", label: "💎 AI shortlist · Hidden Gems", title: "AI shortlist · Hidden Gems", sub: "Quality under-discovered — not just popular" },
  { key: "queue", label: "🔄 Review queue & refresh", title: "Review queue & refresh", sub: "Risk, stale data & incomplete readiness — the freshness loop" },
  { key: "approved", label: "✨ Approved providers", title: "Approved providers", sub: "Live in LOMA and recommendable today" },
  { key: "communities", label: "🛶 Community experiences", title: "Community experiences", sub: "Planned experiences — contact before visiting" },
  { key: "impact", label: "⭐ Impact & hotel credits", title: "Impact & hotel credits", sub: "Scans, leads, confirmed visits & transparent hotel credits" },
  { key: "econ", label: "💰 Economic impact · method", title: "Economic impact · method", sub: "How we value impact without trusting a shop to type a number" },
];

const RANGES = ["7d", "30d", "90d", "Pilot"] as const;

function renderView(key: ViewKey) {
  switch (key) {
    case "overview": return <OverviewView />;
    case "funnel": return <FunnelView />;
    case "providers": return <ProvidersView />;
    case "partners": return <PartnersView />;
    case "staff": return <StaffView />;
    case "category": return <CategoryView />;
    case "revenue": return <RevenueView />;
    case "map": return <MapView />;
    case "verify": return <VerifyView />;
    case "partnerapps": return <PartnerAppsView />;
    case "integrity": return <IntegrityView />;
    case "feedback": return <FeedbackView />;
    case "candidates": return <CandidatesView />;
    case "shortlist": return <ShortlistView />;
    case "queue": return <QueueView />;
    case "approved": return <ApprovedView />;
    case "communities": return <CommunitiesView />;
    case "impact": return <ImpactView />;
    case "econ": return <EconView />;
  }
}

export default function AdminApp() {
  const [view, setView] = useState<ViewKey>("overview");
  const [range, setRange] = useState<(typeof RANGES)[number]>("Pilot");
  const active = NAV.find((n) => n.key === view)!;

  return (
    <div className="admin-shell">
      <div className="adash">
        <aside className="aside">
          <div className="lg">
            <img src="/loma-white.png" alt="LOMA" className="wordmark" />
          </div>
          <div className="role">Destination Impact Console · Phuket</div>
          <nav>
            {NAV.map((n) => (
              <div key={n.key}>
                {n.divider && <div className="div" />}
                <button
                  className={n.key === view ? "on" : ""}
                  onClick={() => setView(n.key)}
                >
                  {n.label}
                </button>
              </div>
            ))}
          </nav>
        </aside>
        <main className="amain">
          <div className="amain-head">
            <div>
              <h1>{active.title}</h1>
              <div className="sb">{active.sub}</div>
              <div className="console-tag">
                🔒 Internal console · volume &amp; impact figures are never shown to
                businesses or tourists
              </div>
            </div>
            <div className="daterange">
              {RANGES.map((r) => (
                <button
                  key={r}
                  className={range === r ? "on" : ""}
                  onClick={() => setRange(r)}
                >
                  {r}
                </button>
              ))}
            </div>
          </div>
          <div className="apanel on">
            <CurationProvider>{renderView(view)}</CurationProvider>
          </div>
        </main>
      </div>
    </div>
  );
}
