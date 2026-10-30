import { Link } from "react-router-dom";
import { BrandMark } from "../../components/layout/BrandMark";
import { rememberReturnIntent } from "../../auth/return-intent";
import "../auth.css";

export type AppErrorKind = "forbidden" | "not-found" | "server" | "network";

const COPY: Record<
  AppErrorKind,
  { title: string; lede: string; primary: { to?: string; label: string; onClick?: () => void } }
> = {
  forbidden: {
    title: "אין הרשאה",
    lede: "אין לכם גישה לעמוד הזה. אם זה נראה כמו טעות — התחברו או חזרו לבית.",
    primary: { to: "/", label: "חזרה לבית" },
  },
  "not-found": {
    title: "העמוד לא נמצא",
    lede: "ייתכן שהכתובת השתנתה או שהקישור אינו מעודכן.",
    primary: { to: "/", label: "חזרה לבית" },
  },
  server: {
    title: "משהו השתבש אצלנו",
    lede: "אירעה שגיאה בלתי צפויה. אפשר לנסות שוב בעוד רגע או לחזור לבית.",
    primary: { label: "נסו שוב", onClick: () => window.location.reload() },
  },
  network: {
    title: "אין חיבור לשרת",
    lede: "בדקו את החיבור לרשת ונסו שוב. אם הבעיה נמשכת — חזרו מאוחר יותר.",
    primary: { label: "נסו שוב", onClick: () => window.location.reload() },
  },
};

const EMPTY: Record<AppErrorKind, string> = {
  forbidden: "/empty-states/no-results.svg",
  "not-found": "/empty-states/no-results.svg",
  server: "/empty-states/no-messages.svg",
  network: "/empty-states/no-messages.svg",
};

export function AppErrorPage({
  kind,
  detail,
  showSignIn = kind === "forbidden",
}: {
  kind: AppErrorKind;
  /** Safe, user-facing Hebrew detail only — never stack traces. */
  detail?: string;
  showSignIn?: boolean;
}) {
  const copy = COPY[kind];

  return (
    <section className="auth-page" aria-labelledby="app-error-title">
      <div className="auth-card onboard-card">
        <BrandMark />
        <img src={EMPTY[kind]} alt="" width={96} height={96} style={{ marginInline: "auto" }} />
        <h1 id="app-error-title" className="auth-title">
          {copy.title}
        </h1>
        <p className="auth-lede">{detail ?? copy.lede}</p>
        <div className="auth-actions">
          {copy.primary.to ? (
            <Link className="btn btn-primary" to={copy.primary.to}>
              {copy.primary.label}
            </Link>
          ) : (
            <button type="button" className="btn btn-primary" onClick={copy.primary.onClick}>
              {copy.primary.label}
            </button>
          )}
          {showSignIn && (
            <Link
              className="btn btn-secondary"
              to="/sign-in"
              onClick={() => rememberReturnIntent(window.location.pathname + window.location.search)}
            >
              התחברות עם Google
            </Link>
          )}
          {copy.primary.to !== "/" && (
            <p className="auth-secondary">
              <Link to="/">חזרה לבית</Link>
            </p>
          )}
        </div>
      </div>
    </section>
  );
}
