import { useCallback, useEffect, useId, useRef, useState, type MouseEvent } from "react";
import { createPortal } from "react-dom";
import { Link, NavLink, useLocation, useNavigate } from "react-router-dom";
import { AppIcon } from "../icons/AppIcon";
import type { AppIconName } from "../icons/productIcons";
import { useAuth } from "../../auth/AuthContext";
import { rememberReturnIntent } from "../../auth/return-intent";
import { useRealtime } from "../../realtime/RealtimeProvider";
import { BrandMark } from "./BrandMark";

const NAV: Array<{
  to: string;
  label: string;
  end?: boolean;
  icon: AppIconName;
}> = [
  { to: "/", label: "בית", end: true, icon: "home" },
  { to: "/community", label: "הקהילה", icon: "community" },
  { to: "/play", label: "משחקים", icon: "play" },
  { to: "/learn", label: "לומדים גו", icon: "learn" },
  { to: "/puzzles", label: "חידות", icon: "puzzles" },
  { to: "/shop", label: "חנות", icon: "shop" },
];

const DRAWER_MS = 200;

function prefersReducedMotion() {
  return typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

type DrawerPhase = "closed" | "opening" | "open" | "closing";

export function Header() {
  const { me, mode, setDevStubUser, signOut } = useAuth();
  const { unreadNotifications, unreadDmTotal } = useRealtime();
  const location = useLocation();
  const navigate = useNavigate();
  const [phase, setPhase] = useState<DrawerPhase>("closed");
  const drawerId = useId();
  const titleId = useId();
  const toggleRef = useRef<HTMLButtonElement>(null);
  const closeRef = useRef<HTMLButtonElement>(null);
  const drawerRef = useRef<HTMLDivElement>(null);
  const previouslyFocused = useRef<HTMLElement | null>(null);
  const closeTimer = useRef<number | null>(null);
  const openRaf = useRef<number | null>(null);
  const navLock = useRef(false);
  const afterClose = useRef<(() => void) | null>(null);

  const clearCloseTimer = () => {
    if (closeTimer.current != null) {
      window.clearTimeout(closeTimer.current);
      closeTimer.current = null;
    }
  };

  const finishClose = useCallback(() => {
    clearCloseTimer();
    setPhase("closed");
    document.body.style.overflow = "";
    const cb = afterClose.current;
    afterClose.current = null;
    const focusTarget = previouslyFocused.current ?? toggleRef.current;
    previouslyFocused.current = null;
    focusTarget?.focus?.();
    cb?.();
    navLock.current = false;
  }, []);

  const beginClose = useCallback((then?: () => void) => {
    if (then) afterClose.current = then;
    if (openRaf.current != null) {
      cancelAnimationFrame(openRaf.current);
      openRaf.current = null;
    }
    setPhase((current) => {
      if (current === "closed") {
        window.setTimeout(() => {
          const cb = afterClose.current;
          afterClose.current = null;
          cb?.();
          navLock.current = false;
        }, 0);
        return "closed";
      }
      if (current === "closing") return "closing";
      return "closing";
    });
  }, []);

  useEffect(() => {
    if (phase !== "closing") return;
    const ms = prefersReducedMotion() ? 0 : DRAWER_MS;
    clearCloseTimer();
    closeTimer.current = window.setTimeout(finishClose, ms);
    return clearCloseTimer;
  }, [phase, finishClose]);

  const openDrawer = () => {
    if (phase !== "closed") return;
    previouslyFocused.current = document.activeElement as HTMLElement | null;
    document.body.style.overflow = "hidden";
    setPhase("opening");
    if (prefersReducedMotion()) {
      setPhase("open");
      return;
    }
    openRaf.current = requestAnimationFrame(() => {
      openRaf.current = requestAnimationFrame(() => {
        openRaf.current = null;
        setPhase("open");
      });
    });
  };

  useEffect(() => {
    if (phase !== "open" && phase !== "opening") return;
    if (phase === "open") closeRef.current?.focus();

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        event.preventDefault();
        beginClose();
        return;
      }
      if (event.key !== "Tab") return;

      const drawer = drawerRef.current;
      if (!drawer) return;
      const focusable = [
        ...drawer.querySelectorAll<HTMLElement>(
          'a[href], button:not([disabled]), textarea, input, select, [tabindex]:not([tabindex="-1"])',
        ),
      ].filter((el) => !el.hasAttribute("disabled") && el.tabIndex !== -1);
      if (focusable.length === 0) return;

      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    };

    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [phase, beginClose]);

  const goSignIn = () => {
    rememberReturnIntent(`${location.pathname}${location.search}`);
    beginClose(() => {
      if (mode === "dev-stub") {
        setDevStubUser(`local_${Date.now()}`);
        return;
      }
      window.location.assign("/sign-in");
    });
  };

  const navigateFromDrawer = (to: string) => (event: MouseEvent) => {
    event.preventDefault();
    if (navLock.current) return;
    if (to === location.pathname) {
      beginClose();
      return;
    }
    navLock.current = true;
    beginClose(() => navigate(to));
  };

  const drawerMounted = phase !== "closed";
  const drawerOpenClass =
    phase === "open" ? "is-open" : phase === "closing" ? "is-closing" : phase === "opening" ? "is-opening" : "";

  const badgeLabel = (n: number) => (n > 99 ? "99+" : String(n));

  const authDesktop = me ? (
    <>
      <Link
        className="header-icon-btn"
        to="/dms"
        aria-label={unreadDmTotal > 0 ? `הודעות פרטיות, ${unreadDmTotal} לא נקראו` : "הודעות פרטיות"}
      >
        <AppIcon name="messages" size={20} />
        {unreadDmTotal > 0 && <span className="notif-badge">{badgeLabel(unreadDmTotal)}</span>}
      </Link>
      <Link
        className="header-icon-btn"
        to="/notifications"
        aria-label={
          unreadNotifications > 0 ? `התראות מערכת, ${unreadNotifications} לא נקראו` : "התראות מערכת"
        }
      >
        <AppIcon name="bell" size={20} />
        {unreadNotifications > 0 && <span className="notif-badge">{badgeLabel(unreadNotifications)}</span>}
      </Link>
      <Link className="btn btn-primary" to="/me">
        {me.nickname ?? "האזור שלי"}
      </Link>
      <button type="button" className="btn btn-secondary" onClick={() => void signOut()}>
        התנתקות
      </button>
    </>
  ) : (
    <button type="button" className="btn btn-primary" onClick={goSignIn}>
      התחברות עם Google
    </button>
  );

  const authDrawer = me ? (
    <>
      <a className="btn btn-secondary" href="/dms" onClick={navigateFromDrawer("/dms")}>
        הודעות{unreadDmTotal > 0 ? ` (${badgeLabel(unreadDmTotal)})` : ""}
      </a>
      <a className="btn btn-secondary" href="/notifications" onClick={navigateFromDrawer("/notifications")}>
        התראות{unreadNotifications > 0 ? ` (${badgeLabel(unreadNotifications)})` : ""}
      </a>
      <a className="btn btn-primary" href="/me" onClick={navigateFromDrawer("/me")}>
        {me.nickname ?? "האזור שלי"}
      </a>
      <button type="button" className="btn btn-secondary" onClick={() => beginClose(() => void signOut())}>
        התנתקות
      </button>
    </>
  ) : (
    <button type="button" className="btn btn-primary drawer-auth-btn" onClick={goSignIn}>
      התחברות עם Google
    </button>
  );

  const drawer =
    drawerMounted &&
    createPortal(
      <>
        <button
          type="button"
          className={`nav-backdrop ${drawerOpenClass}`}
          aria-label="סגירת תפריט"
          onClick={() => beginClose()}
        />
        <div
          ref={drawerRef}
          id={drawerId}
          className={`nav-drawer ${drawerOpenClass}`}
          role="dialog"
          aria-modal="true"
          aria-labelledby={titleId}
        >
          <div className="nav-drawer-header">
            <BrandMark compact />
            <p id={titleId} className="visually-hidden">
              ניווט ראשי
            </p>
            <button
              ref={closeRef}
              type="button"
              className="nav-drawer-close"
              onClick={() => beginClose()}
            >
              <AppIcon name="close" size={22} />
              <span className="visually-hidden">סגירת תפריט</span>
            </button>
          </div>

          <nav className="nav-drawer-nav" aria-label="תפריט נייד">
            <ul>
              {NAV.map(({ to, label, end, icon }) => (
                <li key={to}>
                  <NavLink to={to} end={end} onClick={navigateFromDrawer(to)}>
                    <AppIcon name={icon} size={20} className="nav-item-icon" />
                    <span>{label}</span>
                  </NavLink>
                </li>
              ))}
            </ul>
          </nav>

          <div className="nav-drawer-footer">{authDrawer}</div>
        </div>
      </>,
      document.body,
    );

  return (
    <header className="site-header">
      <div className="header-bar">
        <BrandMark />
        <nav className="primary-nav" aria-label="ראשי">
          <ul>
            {NAV.map(({ to, label, end, icon }) => (
              <li key={to}>
                <NavLink to={to} end={end}>
                  <AppIcon name={icon} size={16} className="nav-item-icon nav-icon-desktop" />
                  {label}
                </NavLink>
              </li>
            ))}
          </ul>
        </nav>
        <div className="header-actions header-actions-desktop">{authDesktop}</div>
        <button
          ref={toggleRef}
          type="button"
          className="nav-toggle"
          aria-expanded={phase === "open" || phase === "opening"}
          aria-controls={drawerId}
          aria-haspopup="dialog"
          onClick={openDrawer}
        >
          <AppIcon name="menu" size={22} />
          <span className="visually-hidden">פתיחת תפריט</span>
        </button>
      </div>
      {drawer}
    </header>
  );
}
