import { useCallback, useEffect, useId, useRef, useState, type MouseEvent } from "react";
import { createPortal } from "react-dom";
import { Link, NavLink, useLocation, useNavigate } from "react-router-dom";
import { AppIcon } from "../icons/AppIcon";
import type { AppIconName } from "../icons/productIcons";
import { useAuth } from "../../auth/AuthContext";
import { rememberReturnIntent } from "../../auth/return-intent";
import { NotificationCenter } from "../../notifications/NotificationCenter";
import {
  OPEN_NOTIFICATIONS_EVENT,
  type OpenNotificationsDetail,
} from "../../notifications/openNotificationCenter";
import { useRealtime } from "../../realtime/RealtimeProvider";
import { BrandMark } from "./BrandMark";
import "../../notifications/notification-center.css";

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
const NARROW_MQ = "(max-width: 900px)";

function prefersReducedMotion() {
  return typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

function useIsNarrow() {
  const [narrow, setNarrow] = useState(() =>
    typeof window !== "undefined" ? window.matchMedia(NARROW_MQ).matches : false,
  );
  useEffect(() => {
    const mq = window.matchMedia(NARROW_MQ);
    const onChange = () => setNarrow(mq.matches);
    onChange();
    mq.addEventListener("change", onChange);
    return () => mq.removeEventListener("change", onChange);
  }, []);
  return narrow;
}

type DrawerPhase = "closed" | "opening" | "open" | "closing";

export function Header() {
  const { me, token, mode, setDevStubUser, signOut } = useAuth();
  const { unreadNotifications, unreadDmTotal } = useRealtime();
  const location = useLocation();
  const navigate = useNavigate();
  const isNarrow = useIsNarrow();
  const [phase, setPhase] = useState<DrawerPhase>("closed");
  const [notifOpen, setNotifOpen] = useState(false);
  const [focusInviteId, setFocusInviteId] = useState<string | null>(null);
  const [bellAnchor, setBellAnchor] = useState<HTMLElement | null>(null);
  const drawerId = useId();
  const titleId = useId();
  const toggleRef = useRef<HTMLButtonElement>(null);
  const closeRef = useRef<HTMLButtonElement>(null);
  const drawerRef = useRef<HTMLDivElement>(null);
  const desktopBellRef = useRef<HTMLButtonElement>(null);
  const mobileBellRef = useRef<HTMLButtonElement>(null);
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
    setNotifOpen(false);
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

  const closeNotifications = useCallback(() => {
    setNotifOpen(false);
    setFocusInviteId(null);
    (bellAnchor ?? desktopBellRef.current ?? mobileBellRef.current)?.focus?.();
  }, [bellAnchor]);

  const openNotifications = useCallback(
    (opts?: { inviteId?: string; anchor?: HTMLElement | null }) => {
      beginClose();
      if (opts?.inviteId) setFocusInviteId(opts.inviteId);
      if (opts?.anchor) setBellAnchor(opts.anchor);
      else setBellAnchor(isNarrow ? mobileBellRef.current : desktopBellRef.current);
      setNotifOpen(true);
    },
    [beginClose, isNarrow],
  );

  useEffect(() => {
    const onOpen = (event: Event) => {
      const detail = (event as CustomEvent<OpenNotificationsDetail>).detail ?? {};
      openNotifications({ inviteId: detail.inviteId });
    };
    window.addEventListener(OPEN_NOTIFICATIONS_EVENT, onOpen);
    return () => window.removeEventListener(OPEN_NOTIFICATIONS_EVENT, onOpen);
  }, [openNotifications]);

  useEffect(() => {
    const st = location.state as { notifications?: OpenNotificationsDetail } | null;
    if (!st?.notifications) return;
    const detail = st.notifications;
    navigate(`${location.pathname}${location.search}`, { replace: true, state: null });
    window.setTimeout(() => openNotifications({ inviteId: detail.inviteId }), 0);
  }, [location.state, location.pathname, location.search, navigate, openNotifications]);

  useEffect(() => {
    setNotifOpen(false);
    setFocusInviteId(null);
  }, [location.pathname]);

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

  const bellButton = (ref: typeof desktopBellRef, className: string) =>
    me ? (
      <button
        ref={ref}
        type="button"
        className={`header-icon-btn header-bell-btn ${className}`.trim()}
        aria-label={
          unreadNotifications > 0
            ? `התראות מערכת, ${unreadNotifications} לא נקראו`
            : "התראות מערכת"
        }
        aria-expanded={notifOpen}
        aria-controls={notifOpen ? "go-darom-notification-center" : undefined}
        aria-haspopup="dialog"
        onClick={(event) => {
          if (notifOpen) {
            closeNotifications();
            return;
          }
          openNotifications({ anchor: event.currentTarget });
        }}
      >
        <AppIcon name="bell" size={20} />
        {unreadNotifications > 0 && <span className="notif-badge">{badgeLabel(unreadNotifications)}</span>}
      </button>
    ) : null;

  const authDesktop = me ? (
    <>
      {me.role === "admin" && (
        <Link className="btn btn-secondary" to="/admin">
          ניהול
        </Link>
      )}
      <Link
        className="header-icon-btn"
        to="/messages"
        aria-label={unreadDmTotal > 0 ? `הודעות פרטיות, ${unreadDmTotal} לא נקראו` : "הודעות פרטיות"}
      >
        <AppIcon name="messages" size={20} />
        {unreadDmTotal > 0 && <span className="notif-badge">{badgeLabel(unreadDmTotal)}</span>}
      </Link>
      {bellButton(desktopBellRef, "")}
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
      {me.role === "admin" && (
        <a className="btn btn-secondary" href="/admin" onClick={navigateFromDrawer("/admin")}>
          ניהול
        </a>
      )}
      <a className="btn btn-secondary" href="/messages" onClick={navigateFromDrawer("/messages")}>
        הודעות{unreadDmTotal > 0 ? ` (${badgeLabel(unreadDmTotal)})` : ""}
      </a>
      <button
        type="button"
        className="btn btn-secondary"
        onClick={() => beginClose(() => openNotifications({}))}
      >
        התראות{unreadNotifications > 0 ? ` (${badgeLabel(unreadNotifications)})` : ""}
      </button>
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
        <div className="header-mobile-end">
          {me ? (
            <div className="header-mobile-tools">
              <Link
                className="header-icon-btn"
                to="/messages"
                aria-label={
                  unreadDmTotal > 0 ? `הודעות פרטיות, ${unreadDmTotal} לא נקראו` : "הודעות פרטיות"
                }
              >
                <AppIcon name="messages" size={20} />
                {unreadDmTotal > 0 && <span className="notif-badge">{badgeLabel(unreadDmTotal)}</span>}
              </Link>
              {bellButton(mobileBellRef, "")}
            </div>
          ) : null}
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
      </div>
      {drawer}
      {me && token ? (
        <NotificationCenter
          open={notifOpen}
          onClose={closeNotifications}
          token={token}
          unreadCount={unreadNotifications}
          focusInviteId={focusInviteId}
          anchorEl={bellAnchor}
          drawerMode={isNarrow}
        />
      ) : null}
    </header>
  );
}
