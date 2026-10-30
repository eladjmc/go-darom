import { useLocation } from "react-router-dom";
import type { ReactNode } from "react";

/** Lightweight enter animation for routed page content. Header stays outside. */
export function PageTransition({ children }: { children: ReactNode }) {
  const location = useLocation();
  return (
    <div key={location.pathname} className="page-frame">
      {children}
    </div>
  );
}
