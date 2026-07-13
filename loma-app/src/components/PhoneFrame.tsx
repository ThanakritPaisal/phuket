import type { ReactNode } from "react";

export default function PhoneFrame({ children }: { children: ReactNode }) {
  return <div className="phone">{children}</div>;
}
