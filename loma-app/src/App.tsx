import { useState } from "react";
import PhoneFrame from "./components/PhoneFrame";
import TouristApp from "./tourist/TouristApp";
import StaffApp from "./staff/StaffApp";
import ProviderApp from "./provider/ProviderApp";
import CommunityApp from "./community/CommunityApp";
import AdminApp from "./admin/AdminApp";
import type { Persona } from "./types";

const TABS: { id: Persona; label: string }[] = [
  { id: "staff", label: "Staff" },
  { id: "tourist", label: "Tourist" },
  { id: "provider", label: "Provider" },
  { id: "community", label: "Community" },
  { id: "admin", label: "Admin" },
];

export default function App() {
  const [persona, setPersona] = useState<Persona>("tourist");

  return (
    <>
      <div className="demobar">
        <div className="demobar-in">
          <div className="brand">
            <img src="/loma-white.png" alt="LOMA" className="wordmark" />
            <span className="tag">AI-powered local tourism distribution</span>
          </div>
          <div className="persona-tabs">
            {TABS.map((t) => (
              <button
                key={t.id}
                className={persona === t.id ? "on" : ""}
                onClick={() => setPersona(t.id)}
              >
                {t.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {persona === "admin" ? (
        <div className="stage admin-stage">
          <AdminApp />
        </div>
      ) : (
        <div className="stage">
          <PhoneFrame>
            {persona === "staff" && <StaffApp />}
            {persona === "tourist" && <TouristApp />}
            {persona === "provider" && <ProviderApp />}
            {persona === "community" && <CommunityApp />}
          </PhoneFrame>
        </div>
      )}
    </>
  );
}
