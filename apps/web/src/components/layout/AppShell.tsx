import type { ReactNode } from "react";
import { RealtimeProvider } from "../../realtime/RealtimeProvider";
import { Footer } from "./Footer";
import { Header } from "./Header";
import { PageTransition } from "./PageTransition";
import "./shell.css";
import "../../pages/community.css";
import "../../pages/messaging.css";

export function AppShell({ children }: { children: ReactNode }) {
  return (
    <RealtimeProvider>
      <div className="app-shell">
        <a className="skip-link" href="#main">
          דלגו לתוכן
        </a>
        <Header />
        <main id="main">
          <PageTransition>{children}</PageTransition>
        </main>
        <Footer />
      </div>
    </RealtimeProvider>
  );
}
