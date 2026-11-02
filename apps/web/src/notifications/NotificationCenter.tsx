import { useEffect, useId, useLayoutEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { AppIcon } from "../components/icons/AppIcon";
import { NotificationCenterList } from "./NotificationCenterList";
import "./notification-center.css";

const EXIT_MS = 200;

function prefersReducedMotion() {
  return typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

type Props = {
  open: boolean;
  onClose: () => void;
  token: string;
  unreadCount: number;
  focusInviteId?: string | null;
  /** Anchor for desktop popover (bell button) */
  anchorEl: HTMLElement | null;
  /** true ≈ mobile / narrow */
  drawerMode: boolean;
};

type PopoverPos = { top: number; left: number; width: number };

export function NotificationCenter({
  open,
  onClose,
  token,
  unreadCount,
  focusInviteId,
  anchorEl,
  drawerMode,
}: Props) {
  const titleId = useId();
  const panelRef = useRef<HTMLDivElement>(null);
  const closeRef = useRef<HTMLButtonElement>(null);
  const [pos, setPos] = useState<PopoverPos | null>(null);
  /** Keep DOM mounted through exit transition */
  const [mounted, setMounted] = useState(open);
  const [entered, setEntered] = useState(false);

  useEffect(() => {
    if (open) {
      setMounted(true);
      if (prefersReducedMotion()) {
        setEntered(true);
        return;
      }
      const id = requestAnimationFrame(() => {
        requestAnimationFrame(() => setEntered(true));
      });
      return () => cancelAnimationFrame(id);
    }
    // Start exit: drop is-open, then unmount after CSS transition.
    setEntered(false);
    if (!mounted) return;
    const ms = prefersReducedMotion() ? 0 : EXIT_MS;
    const t = window.setTimeout(() => setMounted(false), ms);
    return () => window.clearTimeout(t);
  }, [open, mounted]);

  useLayoutEffect(() => {
    if (!mounted || drawerMode || !anchorEl) {
      if (!mounted) setPos(null);
      return;
    }
    const place = () => {
      const rect = anchorEl.getBoundingClientRect();
      const width = Math.min(400, Math.max(280, window.innerWidth - 16));
      let left = rect.right - width;
      left = Math.max(8, Math.min(left, window.innerWidth - width - 8));
      let top = rect.bottom + 8;
      const maxH = Math.min(520, window.innerHeight - 24);
      if (top + Math.min(360, maxH) > window.innerHeight - 8) {
        top = Math.max(8, rect.top - 8 - Math.min(360, maxH));
      }
      setPos({ top, left, width });
    };
    place();
    window.addEventListener("resize", place);
    window.addEventListener("scroll", place, true);
    return () => {
      window.removeEventListener("resize", place);
      window.removeEventListener("scroll", place, true);
    };
  }, [mounted, drawerMode, anchorEl]);

  useEffect(() => {
    if (!open || !mounted) return;
    const prevOverflow = document.body.style.overflow;
    if (drawerMode) document.body.style.overflow = "hidden";
    closeRef.current?.focus();

    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        event.preventDefault();
        onClose();
        return;
      }
      if (event.key !== "Tab" || !panelRef.current) return;
      const focusable = [
        ...panelRef.current.querySelectorAll<HTMLElement>(
          'a[href], button:not([disabled]), textarea, input, select, [tabindex]:not([tabindex="-1"])',
        ),
      ].filter((el) => !el.hasAttribute("disabled") && el.tabIndex !== -1);
      if (focusable.length === 0) return;
      const first = focusable[0]!;
      const last = focusable[focusable.length - 1]!;
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    };

    const onPointer = (event: MouseEvent) => {
      if (drawerMode) return;
      const t = event.target as Node;
      if (panelRef.current?.contains(t)) return;
      if (anchorEl?.contains(t)) return;
      onClose();
    };

    document.addEventListener("keydown", onKey);
    document.addEventListener("mousedown", onPointer);
    return () => {
      document.removeEventListener("keydown", onKey);
      document.removeEventListener("mousedown", onPointer);
      if (drawerMode) document.body.style.overflow = prevOverflow;
    };
  }, [open, mounted, onClose, drawerMode, anchorEl]);

  if (!mounted) return null;

  const unreadLabel =
    unreadCount > 0 ? (unreadCount > 99 ? "99+" : String(unreadCount)) : null;

  const panel = (
    <div
      ref={panelRef}
      className={
        drawerMode
          ? `notif-drawer${entered ? " is-open" : ""}`
          : `notif-popover${entered ? " is-open" : ""}`
      }
      style={
        drawerMode
          ? undefined
          : pos
            ? { top: pos.top, left: pos.left, width: pos.width }
            : { visibility: "hidden" }
      }
      role="dialog"
      aria-modal="true"
      aria-labelledby={titleId}
      id="go-darom-notification-center"
      data-testid="notification-center"
    >
      <header className="notif-center-header">
        <div className="notif-center-heading">
          <h2 id={titleId}>התראות</h2>
          {unreadLabel ? (
            <span className="notif-center-count" aria-label={`${unreadLabel} לא נקראו`}>
              {unreadLabel}
            </span>
          ) : null}
        </div>
        <button
          ref={closeRef}
          type="button"
          className="notif-center-close"
          onClick={onClose}
          aria-label="סגירת התראות"
        >
          <AppIcon name="close" size={20} />
        </button>
      </header>
      <div className="notif-center-body">
        <NotificationCenterList
          token={token}
          focusInviteId={focusInviteId}
          compact
          onNavigate={onClose}
        />
      </div>
    </div>
  );

  return createPortal(
    drawerMode ? (
      <>
        <button
          type="button"
          className={`notif-drawer-backdrop${entered ? " is-open" : ""}`}
          aria-label="סגירת התראות"
          onClick={onClose}
        />
        {panel}
      </>
    ) : (
      panel
    ),
    document.body,
  );
}
