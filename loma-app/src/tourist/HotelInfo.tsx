import { useEffect, useRef, useState } from "react";
import { HOTEL_INFO, HOTEL_FIELDS } from "../v2data";
import { getActiveAccount } from "../activeAccount";
import Icon from "../components/Icon";

// EN + Thai keyword synonyms per hotel-info field. Loose matching (substring +
// small edit distance) tolerates typos and mixed EN/Thai queries — bilingual-ish.
const SYN: Record<string, string[]> = {
  breakfast: ["breakfast", "morning meal", "brekkie", "อาหารเช้า", "เช้า", "กินเช้า"],
  checkin: ["check in", "checkin", "arrival", "arrive", "เช็คอิน", "เข้าพัก", "เข้าห้อง"],
  checkout: ["check out", "checkout", "leave", "departure", "late checkout", "เช็คเอาท์", "ออกห้อง", "คืนห้อง"],
  wifiNet: ["wifi", "wi-fi", "wifi name", "internet", "network", "online", "ไวไฟ", "เน็ต", "อินเทอร์เน็ต", "สัญญาณ"],
  wifiPass: ["wifi password", "password", "wifi pass", "passcode", "รหัสไวไฟ", "รหัสผ่าน", "รหัสเน็ต", "พาสเวิร์ด"],
  pool: ["pool", "swim", "swimming", "สระ", "สระว่ายน้ำ", "ว่ายน้ำ"],
  phone: ["phone", "call", "front desk", "reception", "contact", "number", "โทร", "เบอร์", "แผนกต้อนรับ", "ติดต่อ"],
  address: ["address", "location", "where", "map", "directions", "ที่อยู่", "แผนที่", "สถานที่", "ตำแหน่ง"],
  rules: ["rules", "policy", "smoking", "smoke", "pets", "pet", "quiet", "noise", "กฎ", "ข้อห้าม", "สูบบุหรี่", "สัตว์เลี้ยง", "เสียง"],
  gym: ["gym", "fitness", "workout", "exercise", "ฟิตเนส", "ยิม", "ออกกำลังกาย"],
};

const LABELS: Record<string, string> = Object.fromEntries(HOTEL_FIELDS);

// Levenshtein distance — small, for loose typo tolerance on EN tokens.
function lev(a: string, b: string): number {
  const m = a.length;
  const n = b.length;
  const d: number[] = Array.from({ length: n + 1 }, (_, j) => j);
  for (let i = 1; i <= m; i++) {
    let prev = d[0];
    d[0] = i;
    for (let j = 1; j <= n; j++) {
      const tmp = d[j];
      d[j] = Math.min(
        d[j] + 1,
        d[j - 1] + 1,
        prev + (a[i - 1] === b[j - 1] ? 0 : 1)
      );
      prev = tmp;
    }
  }
  return d[n];
}

function matchKeys(query: string): string[] {
  const q = query.toLowerCase().trim();
  if (!q) return [];
  const toks = q.split(/[^a-z0-9]+/i).filter(Boolean);
  const out: string[] = [];
  for (const [key, label] of HOTEL_FIELDS) {
    const terms = [label.toLowerCase(), ...(SYN[key] || [])];
    let hit = false;
    for (const term of terms) {
      if (q.includes(term)) {
        hit = true;
        break;
      }
      // fuzzy match single-word EN terms against query tokens
      if (!term.includes(" ") && /^[a-z]+$/.test(term)) {
        for (const tok of toks) {
          if (tok === term || (tok.length >= 4 && term.length >= 4 && lev(tok, term) <= 2)) {
            hit = true;
            break;
          }
        }
      }
      if (hit) break;
    }
    if (hit) out.push(key);
  }
  return out;
}

interface Msg {
  r: "bot" | "user";
  t: string;
}

// "Hotel Info" — a simple keyword concierge over HOTEL_INFO / HOTEL_FIELDS. One
// tab, secondary; it answers stay questions, it isn't the product.
export default function HotelInfo() {
  const hotel = getActiveAccount();
  const fill = (v: string) =>
    v.replace(/\{NAME\}/g, hotel.name).replace(/\{AREA\}/g, hotel.area);

  const [msgs, setMsgs] = useState<Msg[]>([
    {
      r: "bot",
      t: `Hi! I'm the ${hotel.name} front desk. Ask me about breakfast, Wi-Fi, check-in / check-out, the pool, the gym or house rules — in English or Thai.`,
    },
  ]);
  const [input, setInput] = useState("");
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = scrollRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [msgs]);

  const ask = (textRaw: string) => {
    const text = textRaw.trim();
    if (!text) return;
    const keys = matchKeys(text);
    const reply = keys.length
      ? keys.map((k) => `${LABELS[k]}: ${fill(HOTEL_INFO[k])}`).join("\n")
      : "Sorry, I can only help with breakfast, check-in / check-out, Wi-Fi, the pool, the gym, our address, the front-desk number and house rules.";
    setMsgs((m) => [...m, { r: "user", t: text }, { r: "bot", t: reply }]);
    setInput("");
  };

  return (
    <div className="t-chat">
      <div className="appbar">
        <div>
          <h1>Hotel Info</h1>
          <div className="sub">{hotel.name} · front-desk concierge</div>
        </div>
      </div>
      <div className="t-chatscroll" ref={scrollRef}>
        {msgs.map((m, i) => (
          <div key={i} className={`t-bubble ${m.r}`}>
            <div className="txt">{m.t}</div>
          </div>
        ))}
      </div>
      <div className="t-chatbar">
        <div className="t-chips">
          {HOTEL_FIELDS.map(([key, label]) => (
            <button
              key={key}
              className="chip"
              style={{ whiteSpace: "nowrap" }}
              onClick={() => ask(label)}
            >
              {label}
            </button>
          ))}
        </div>
        <div className="t-chatrow">
          <input
            className="t-chatin"
            value={input}
            placeholder={`Ask ${hotel.name} anything…`}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                ask(input);
              }
            }}
          />
          <button
            className="btn btn-primary"
            style={{ width: "auto", padding: "12px 16px" }}
            onClick={() => ask(input)}
          >
            <Icon name="search" size={16} />
          </button>
        </div>
      </div>
    </div>
  );
}
