import { useSignIn, useAuth as useClerkAuth } from "@clerk/react";
import { Link, Navigate } from "react-router-dom";
import { useState } from "react";
import { useAuth } from "../auth/AuthContext";
import { consumeReturnIntent } from "../auth/return-intent";
import { BrandMark } from "../components/layout/BrandMark";
import "./auth.css";

function GoogleMark() {
  return (
    <svg className="btn-google-icon" viewBox="0 0 24 24" aria-hidden="true">
      <path
        fill="#4285F4"
        d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
      />
      <path
        fill="#34A853"
        d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
      />
      <path
        fill="#FBBC05"
        d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
      />
      <path
        fill="#EA4335"
        d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
      />
    </svg>
  );
}

function hebrewClerkError(raw: unknown): string {
  const message =
    typeof raw === "object" && raw && "errors" in raw
      ? String((raw as { errors?: Array<{ longMessage?: string; message?: string }> }).errors?.[0]?.longMessage ??
          (raw as { errors?: Array<{ message?: string }> }).errors?.[0]?.message ??
          "")
      : raw instanceof Error
        ? raw.message
        : "";
  const lower = message.toLowerCase();
  if (lower.includes("popup") || lower.includes("blocked")) {
    return "חלון ההתחברות נחסם. אפשרו חלונות קופצים ונסו שוב.";
  }
  if (lower.includes("network") || lower.includes("fetch")) {
    return "בעיית רשת. בדקו את החיבור ונסו שוב.";
  }
  if (lower.includes("cancelled") || lower.includes("canceled") || lower.includes("access_denied")) {
    return "ההתחברות בוטלה. אפשר לנסות שוב מתי שתרצו.";
  }
  return "ההתחברות עם Google נכשלה. נסו שוב בעוד רגע.";
}

function ClerkGoogleSignIn() {
  const { me, loading, error, refreshMe, token } = useAuth();
  const { isSignedIn, isLoaded, signOut } = useClerkAuth();
  const { signIn, fetchStatus } = useSignIn();
  const [busy, setBusy] = useState(false);
  const [localError, setLocalError] = useState<string | null>(null);

  if (!isLoaded || (isSignedIn && loading)) {
    return (
      <div className="auth-page">
        <p className="auth-status">טוענים…</p>
      </div>
    );
  }

  if (isSignedIn && me) {
    if (me.onboardingCompleted) {
      return <Navigate to={consumeReturnIntent("/")} replace />;
    }
    return <Navigate to="/onboarding" replace />;
  }

  if (isSignedIn && !me) {
    return (
      <div className="auth-page">
        <div className="auth-card">
          <BrandMark />
          <h1 className="auth-title">התחברות חלקית</h1>
          <p className="auth-lede">
            {error ??
              (token
                ? "לא הצלחנו לטעון את הפרופיל מהשרת."
                : "יש התחברות ב־Clerk, אבל אין אסימון תקף לשרת.")}
          </p>
          <div className="auth-actions">
            <button type="button" className="btn btn-primary" onClick={() => void refreshMe()}>
              נסו שוב
            </button>
            <button type="button" className="btn btn-secondary" onClick={() => void signOut({ redirectUrl: "/" })}>
              התנתקות
            </button>
          </div>
        </div>
      </div>
    );
  }

  const starting = busy || fetchStatus === "fetching";

  const continueWithGoogle = async () => {
    if (!signIn || starting) return;
    setBusy(true);
    setLocalError(null);
    try {
      const { error: ssoError } = await signIn.sso({
        strategy: "oauth_google",
        redirectCallbackUrl: "/sso-callback",
        redirectUrl: "/onboarding",
      });
      if (ssoError) {
        setLocalError(hebrewClerkError({ errors: [ssoError] }));
        setBusy(false);
      }
      // On success the browser navigates away to Google / callback.
    } catch (err) {
      setLocalError(hebrewClerkError(err));
      setBusy(false);
    }
  };

  return (
    <div className="auth-page">
      <div className="auth-card">
        <BrandMark />
        <h1 className="auth-title">מתחברים לגו דרום</h1>
        <p className="auth-lede">התחברו עם Google כדי לשחק ולהשתתף בקהילה.</p>

        {localError && (
          <p className="auth-error" role="alert">
            {localError}
          </p>
        )}

        <div className="auth-actions">
          <button
            type="button"
            className="btn-google"
            onClick={() => void continueWithGoogle()}
            disabled={starting || !signIn}
            aria-busy={starting}
          >
            <GoogleMark />
            {starting ? "מעבירים ל־Google…" : "המשך עם Google"}
          </button>
          <p className="auth-secondary">
            <Link to="/">חזרה לאתר</Link>
          </p>
        </div>
      </div>
    </div>
  );
}

export function SignInPage() {
  const { mode, setDevStubUser } = useAuth();

  if (mode === "dev-stub") {
    return (
      <div className="auth-page">
        <div className="auth-card">
          <BrandMark />
          <h1 className="auth-title">מתחברים לגו דרום</h1>
          <p className="auth-lede">מצב פיתוח מקומי — בלי Google.</p>
          <div className="auth-actions">
            <button type="button" className="btn btn-primary" onClick={() => setDevStubUser(`local_${Date.now()}`)}>
              המשך כחבר/ה
            </button>
            <p className="auth-secondary">
              <Link to="/">חזרה לאתר</Link>
            </p>
          </div>
        </div>
      </div>
    );
  }

  if (mode === "unconfigured") {
    return (
      <div className="auth-page">
        <div className="auth-card">
          <BrandMark />
          <h1 className="auth-title">התחברות אינה זמינה כרגע</h1>
          <p className="auth-lede">נסו שוב מאוחר יותר, או חזרו לאתר בינתיים.</p>
          <p className="auth-secondary">
            <Link to="/">חזרה לאתר</Link>
          </p>
        </div>
      </div>
    );
  }

  return <ClerkGoogleSignIn />;
}
