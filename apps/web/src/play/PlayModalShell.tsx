import {
  useEffect,
  useId,
  useRef,
  type KeyboardEvent as ReactKeyboardEvent,
  type ReactNode,
  type RefObject,
} from "react";
import { createPortal } from "react-dom";

type Props = {
  title: string;
  titleId?: string;
  onClose: () => void;
  children: ReactNode;
  footer?: ReactNode;
  /** Wider card for settings step */
  wide?: boolean;
  /** Optional class on the dialog card */
  cardClassName?: string;
  /** Element to restore focus to on unmount */
  returnFocusRef?: RefObject<HTMLElement | null>;
  testId?: string;
  /** Block Escape / backdrop / header close (e.g. while a submit is in flight). */
  closeDisabled?: boolean;
};

const FOCUSABLE =
  'a[href], button:not([disabled]), textarea:not([disabled]), input:not([disabled]), select:not([disabled]), [tabindex]:not([tabindex="-1"])';

export function PlayModalShell({
  title,
  titleId: titleIdProp,
  onClose,
  children,
  footer,
  wide,
  cardClassName,
  returnFocusRef,
  testId,
  closeDisabled = false,
}: Props) {
  const autoId = useId();
  const titleId = titleIdProp ?? autoId;
  const cardRef = useRef<HTMLDivElement>(null);
  const closeBtnRef = useRef<HTMLButtonElement>(null);
  const closeDisabledRef = useRef(closeDisabled);
  closeDisabledRef.current = closeDisabled;

  useEffect(() => {
    const prevOverflow = document.documentElement.style.overflow;
    document.documentElement.style.overflow = "hidden";
    const t = window.setTimeout(() => {
      const preferred =
        cardRef.current?.querySelector<HTMLElement>("input[autofocus], [data-autofocus]") ??
        cardRef.current?.querySelector<HTMLElement>(FOCUSABLE);
      (preferred ?? closeBtnRef.current)?.focus();
    }, 0);

    const readZoom = () => {
      const raw = String(
        (document.documentElement as HTMLElement).style.zoom ||
          getComputedStyle(document.documentElement).zoom ||
          "1",
      );
      if (raw.endsWith("%")) return Math.max(0.5, Number.parseFloat(raw) / 100 || 1);
      const n = Number.parseFloat(raw);
      return Number.isFinite(n) && n > 0 ? n : 1;
    };

    const syncMaxHeight = () => {
      const el = cardRef.current;
      if (!el) return;
      const vv = window.visualViewport;
      const layoutVh = window.innerHeight;
      const visualVh = vv?.height ?? layoutVh;
      const zoom = readZoom();
      // Budget in CSS pixels so after page zoom the painted card still fits the visible window.
      const budget = Math.min(layoutVh, visualVh) / zoom - 32;
      el.style.maxHeight = `${Math.max(200, Math.floor(budget))}px`;
    };
    syncMaxHeight();
    window.visualViewport?.addEventListener("resize", syncMaxHeight);
    window.visualViewport?.addEventListener("scroll", syncMaxHeight);
    window.addEventListener("resize", syncMaxHeight);

    return () => {
      window.clearTimeout(t);
      window.visualViewport?.removeEventListener("resize", syncMaxHeight);
      window.visualViewport?.removeEventListener("scroll", syncMaxHeight);
      window.removeEventListener("resize", syncMaxHeight);
      document.documentElement.style.overflow = prevOverflow;
      returnFocusRef?.current?.focus?.();
    };
  }, [returnFocusRef]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== "Escape") return;
      e.preventDefault();
      if (closeDisabledRef.current) return;
      onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  const requestClose = () => {
    if (closeDisabledRef.current) return;
    onClose();
  };

  const onCardKeyDown = (e: ReactKeyboardEvent<HTMLDivElement>) => {
    if (e.key !== "Tab" || !cardRef.current) return;
    const nodes = Array.from(cardRef.current.querySelectorAll<HTMLElement>(FOCUSABLE)).filter(
      (el) => !el.hasAttribute("disabled") && el.tabIndex !== -1 && el.offsetParent !== null,
    );
    if (nodes.length === 0) return;
    const first = nodes[0]!;
    const last = nodes[nodes.length - 1]!;
    if (e.shiftKey && document.activeElement === first) {
      e.preventDefault();
      last.focus();
    } else if (!e.shiftKey && document.activeElement === last) {
      e.preventDefault();
      first.focus();
    }
  };

  return createPortal(
    <div className="play-modal-root" data-testid={testId}>
      <button
        type="button"
        className="play-modal-backdrop"
        aria-label="סגירה"
        disabled={closeDisabled}
        onClick={requestClose}
      />
      <div
        ref={cardRef}
        className={`play-modal-card${wide ? " is-wide" : ""}${cardClassName ? ` ${cardClassName}` : ""}`}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        tabIndex={-1}
        onKeyDown={onCardKeyDown}
      >
        <header className="play-modal-header">
          <h2 id={titleId}>{title}</h2>
          <button
            ref={closeBtnRef}
            type="button"
            className="play-modal-close"
            onClick={requestClose}
            aria-label="סגירה"
            disabled={closeDisabled}
          >
            ×
          </button>
        </header>
        <div className="play-modal-body">{children}</div>
        {footer ? <footer className="play-modal-footer">{footer}</footer> : null}
      </div>
    </div>,
    document.body,
  );
}
