import type { ReactNode } from "react";
import { useLocation } from "react-router-dom";
import { RealtimeProvider } from "../../realtime/RealtimeProvider";
import { isChatFocusPath } from "../../routing/chatRoutes";
import { ReturnToGameChip } from "../../play/ReturnToGameChip";
import { Footer } from "./Footer";
import { Header } from "./Header";
import { PageTransition } from "./PageTransition";
import "./shell.css";
import "../../pages/community.css";
import "../../pages/messaging.css";
import "../../play/play.css";

export function AppShell({ children }: { children: ReactNode }) {
  const { pathname } = useLocation();
  const chatFocus = isChatFocusPath(pathname);
  const adminArea = pathname === "/admin" || pathname.startsWith("/admin/");

  return (
    <RealtimeProvider>
      {adminArea ? (
        <div className="app-shell app-shell-admin">{children}</div>
      ) : (
        <div className={`app-shell${chatFocus ? " is-chat-focus" : ""}`}>
          <a className="skip-link" href="#main">
            דלגו לתוכן
          </a>
          <Header />
          <ReturnToGameChip />
          <main id="main">
            <PageTransition>{children}</PageTransition>
          </main>
          {!chatFocus && <Footer />}
        </div>
      )}
    </RealtimeProvider>
  );
}
