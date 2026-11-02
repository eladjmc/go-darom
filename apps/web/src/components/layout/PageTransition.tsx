import { useLocation } from "react-router-dom";
import type { ReactNode } from "react";
import { isChatFocusPath, pageTransitionKey } from "../../routing/chatRoutes";

/** Lightweight enter animation for routed page content. Header stays outside. */
export function PageTransition({ children }: { children: ReactNode }) {
  const location = useLocation();
  const key = pageTransitionKey(location.pathname);
  const chatFocus = isChatFocusPath(location.pathname);
  return (
    <div key={key} className={`page-frame${chatFocus ? " is-chat-focus" : ""}`}>
      {children}
    </div>
  );
}
