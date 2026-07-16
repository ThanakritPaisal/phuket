import type { Pick } from "../picks";
import BigCard from "./BigCard";

// A staff-selected provider pick on the Recommended landing. v3 re-skin: an
// image-forward card — big photo, category chip, name, one caption line and a
// rating/distance row. The whole card taps through to detail, where the full
// "why", specs and CTAs live.
export default function TourCard({
  p,
  onOpen,
}: {
  p: Pick;
  onOpen: (id: string) => void;
}) {
  return (
    <BigCard
      id={p.id}
      name={p.name}
      cat={p.cat}
      sub={p.sum || p.reason}
      img={p.img}
      emo={p.emo}
      rating={p.rating}
      reviews={p.reviews}
      dist={p.dist}
      gem={p.ai.is_hidden_gem}
      house={p.pick}
      onOpen={onOpen}
    />
  );
}
