import { Navigate, Route, Routes, useLocation } from "react-router-dom";
import { useAuth } from "./auth/AuthContext";
import { rememberReturnIntent } from "./auth/return-intent";
import { AppShell } from "./components/layout/AppShell";
import { AdminPage } from "./pages/AdminPage";
import { HomePage } from "./pages/HomePage";
import { MePage } from "./pages/MePage";
import { CommunityPage } from "./pages/CommunityPage";
import { DmInboxPage, DmThreadPage } from "./pages/DmPages";
import { NotificationsPage } from "./pages/NotificationsPage";
import { OnboardingPage } from "./pages/OnboardingPage";
import { LearnPage } from "./pages/LearnPage";
import { PlaceholderPage } from "./pages/PlaceholderPage";
import { ShopPage } from "./pages/ShopPage";
import { SignInPage } from "./pages/SignInPage";
import { SsoCallbackPage } from "./pages/SsoCallbackPage";
import { AppErrorPage } from "./pages/errors/AppErrorPage";
import "./pages/members.css";

function AuthLoading() {
  return (
    <section className="auth-page">
      <p className="auth-status">טוענים…</p>
    </section>
  );
}

function RequireOnboarded({ children }: { children: React.ReactNode }) {
  const { me, loading } = useAuth();
  const location = useLocation();
  if (loading && !me) return <AuthLoading />;
  if (!me) {
    rememberReturnIntent(`${location.pathname}${location.search}`);
    return <Navigate to="/sign-in" replace state={{ from: location }} />;
  }
  if (!me.onboardingCompleted) return <Navigate to="/onboarding" replace />;
  return children;
}

export function App() {
  return (
    <AppShell>
      <Routes>
        <Route path="/" element={<HomePage />} />
        <Route path="/shop" element={<ShopPage />} />
        <Route path="/sign-in/*" element={<SignInPage />} />
        <Route path="/sso-callback" element={<SsoCallbackPage />} />
        <Route path="/onboarding" element={<OnboardingPage />} />
        <Route
          path="/me"
          element={
            <RequireOnboarded>
              <MePage />
            </RequireOnboarded>
          }
        />
        <Route path="/members" element={<Navigate to="/community" replace />} />
        <Route
          path="/admin/*"
          element={
            <RequireOnboarded>
              <AdminPage />
            </RequireOnboarded>
          }
        />
        <Route path="/community" element={<CommunityPage />} />
        <Route
          path="/dms"
          element={
            <RequireOnboarded>
              <DmInboxPage />
            </RequireOnboarded>
          }
        />
        <Route
          path="/dms/:threadId"
          element={
            <RequireOnboarded>
              <DmThreadPage />
            </RequireOnboarded>
          }
        />
        <Route
          path="/notifications"
          element={
            <RequireOnboarded>
              <NotificationsPage />
            </RequireOnboarded>
          }
        />
        <Route
          path="/play"
          element={
            <PlaceholderPage
              title="משחקים"
              description="משחקים ידידותיים בלי דירוגים וטורנירים. המגרש נפתח בקרוב — בינתיים מוזמנים למפגשים."
              emptySrc="/empty-states/no-games.svg"
            />
          }
        />
        <Route path="/learn" element={<LearnPage />} />
        <Route
          path="/puzzles"
          element={
            <PlaceholderPage
              title="חידות"
              description="חידת השבוע וספריית החידות פתוחות למבקרים. החידות יופיעו כאן בקרוב."
              emptySrc="/empty-states/no-puzzles.svg"
            />
          }
        />
        <Route
          path="/events"
          element={
            <PlaceholderPage
              title="מפגשים"
              description="מפגשי הקהילה פתוחים לכולם. כשיתפרסם מפגש — תוכלו לראות אותו ולהירשם כאן."
              emptySrc="/empty-states/no-events.svg"
            />
          }
        />
        <Route path="/error/forbidden" element={<AppErrorPage kind="forbidden" />} />
        <Route path="/error/server" element={<AppErrorPage kind="server" />} />
        <Route path="/error/network" element={<AppErrorPage kind="network" />} />
        <Route path="*" element={<AppErrorPage kind="not-found" />} />
      </Routes>
    </AppShell>
  );
}
