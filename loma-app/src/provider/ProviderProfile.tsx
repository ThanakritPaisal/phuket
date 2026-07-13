import { useState } from "react";
import Icon from "../components/Icon";
import type { CatalogProvider } from "../types";
import { provMenu, provScore, revKw } from "./lib";
import Photo from "./Photo";
import "./edit.css";

const WEATHER: [string, string][] = [
  ["indoor", "Indoor"],
  ["mixed", "Some cover"],
  ["outdoor", "Outdoor"],
];
const DURATION: [string, string][] = [
  ["quick", "< 1h"],
  ["short", "1–2h"],
  ["half_day", "Half-day"],
  ["full_day", "Full-day"],
];

export default function ProviderProfile({
  p,
  status,
  onSignOut,
  toast,
  onEdit,
}: {
  p: CatalogProvider;
  status: string;
  onSignOut: () => void;
  toast: (m: string) => void;
  onEdit: () => void;
}) {
  const menu = provMenu(p);
  const kw = revKw(p.cat);
  const photos = [p.img, `https://loremflickr.com/300/300/${kw}?lock=21`, `https://loremflickr.com/300/300/${kw}?lock=42`];
  const [weather, setWeather] = useState("mixed");
  const [duration, setDuration] = useState("half_day");
  const verified = status === "verified";

  return (
    <div className="pad">
      <h2 style={{ fontSize: 17 }}>Business profile</h2>
      <div style={{ fontSize: 12.5, color: "var(--muted)", margin: "3px 0 12px" }}>
        This is what staff and tourists see. Keep it fresh — readiness is scored, not bought.
      </div>

      <button className="btn btn-coral pe-open" onClick={onEdit}>
        <Icon name="spark" size={16} /> Edit my profile &amp; readiness
      </button>

      <div className="h-sec">Photos</div>
      <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
        {photos.map((u, i) => (
          <Photo key={i} img={u} emo={p.emo} size={84} radius={11} />
        ))}
        <button
          onClick={() => toast("Add a photo")}
          style={{
            width: 84,
            height: 84,
            borderRadius: 11,
            border: "2px dashed var(--line)",
            background: "var(--surface-2)",
            display: "grid",
            placeItems: "center",
            color: "var(--muted)",
            fontSize: 22,
          }}
        >
          ＋
        </button>
      </div>

      <div className="h-sec">Business name</div>
      <input className="pp-input sm" defaultValue={p.name} />
      <div className="h-sec">Category</div>
      <input className="pp-input sm" defaultValue={p.cat} />
      <div className="h-sec">Opening hours</div>
      <input className="pp-input sm" defaultValue={p.hours} />
      <div className="h-sec">Price range</div>
      <div className="segmented">
        {["฿", "฿฿", "฿฿฿"].map((x) => (
          <button key={x} className={p.price === x ? "on" : ""}>
            {x}
          </button>
        ))}
      </div>
      <div className="h-sec">Languages</div>
      <input className="pp-input sm" defaultValue={p.lang} />
      <div className="h-sec">Contact for tourists</div>
      <input className="pp-input sm" defaultValue={p.contact} />

      <div className="h-sec">Good in rainy weather?</div>
      <div className="segmented">
        {WEATHER.map(([k, l]) => (
          <button key={k} className={weather === k ? "on" : ""} onClick={() => setWeather(k)}>
            {l}
          </button>
        ))}
      </div>
      <div style={{ fontSize: 11, color: "var(--muted)", marginTop: 6 }}>
        Indoor / some-cover appear under the “Rainy Day” filter.
      </div>

      <div className="h-sec">Typical visit length</div>
      <div className="segmented">
        {DURATION.map(([k, l]) => (
          <button key={k} className={duration === k ? "on" : ""} onClick={() => setDuration(k)}>
            {l}
          </button>
        ))}
      </div>
      <div style={{ fontSize: 11, color: "var(--muted)", marginTop: 6 }}>
        “Half-day” makes you eligible for the half-day experience planner.
      </div>

      <div className="h-sec">Menu / services</div>
      <div style={{ border: "1px solid var(--line)", borderRadius: 12, overflow: "hidden" }}>
        {menu.map((m, i) => (
          <div
            key={i}
            style={{
              display: "flex",
              justifyContent: "space-between",
              padding: "10px 12px",
              borderTop: i ? "1px solid var(--line-2)" : undefined,
            }}
          >
            <span style={{ fontSize: 13 }}>{m[0]}</span>
            <span style={{ fontSize: 13, fontWeight: 700, color: "var(--primary-d)" }}>{m[1]}</span>
          </div>
        ))}
      </div>
      <div style={{ marginTop: 8 }}>
        <button className="btn btn-line btn-sm" onClick={() => toast("Add menu item")}>
          ＋ Add item
        </button>
      </div>

      <div className="h-sec">Best for</div>
      <div className="chips">
        {(p.bestFor || []).map((t) => (
          <span className="tag" key={t}>
            {t}
          </span>
        ))}
      </div>

      <div className="h-sec">Verification</div>
      <div className="kv" style={{ gridTemplateColumns: "1fr 1fr" }}>
        <div>
          <div className="k">Status</div>
          <div className="v" style={{ fontSize: 13, color: verified ? "var(--ok)" : "var(--warn)" }}>
            {verified ? "✓ Verified" : "Pending"}
          </div>
        </div>
        <div>
          <div className="k">LOMA score</div>
          <div className="v">{provScore(p)}</div>
        </div>
      </div>

      <div style={{ marginTop: 16 }}>
        <button className="btn btn-primary" onClick={() => toast("Profile saved")}>
          <Icon name="check" size={16} /> Save profile
        </button>
      </div>
      <div style={{ marginTop: 10 }}>
        <button className="btn btn-ghost" onClick={onSignOut} style={{ color: "var(--danger)", borderColor: "#F3C9C1" }}>
          Sign out
        </button>
      </div>
      <div style={{ height: 12 }} />
    </div>
  );
}
