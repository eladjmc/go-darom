import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type PointerEvent as ReactPointerEvent,
  type ReactNode,
  type WheelEvent as ReactWheelEvent,
} from "react";

const MIN_ZOOM = 1;
const MAX_ZOOM = 3;

type Props = {
  children: ReactNode;
  /** Called when a multi-touch / pan / pinch gesture is active (suppress move commit). */
  onGestureChange?: (gesturing: boolean) => void;
  /** Clear pending stone preview when view changes */
  onViewChange?: () => void;
};

function prefersReducedMotion() {
  return typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

/**
 * Isolated zoom/pan layer for the Go board. Does not touch game state.
 * Pinch + wheel zoom (1×–3×), drag-to-pan when zoomed, reset control.
 * At 1× single-pointer taps pass through to the board for placement.
 */
export function BoardViewport({ children, onGestureChange, onViewChange }: Props) {
  const stageRef = useRef<HTMLDivElement | null>(null);
  const [zoom, setZoom] = useState(1);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const zoomRef = useRef(1);
  const panRef = useRef({ x: 0, y: 0 });
  const pointers = useRef(new Map<number, { x: number; y: number }>());
  const pinchStart = useRef<{ dist: number; zoom: number } | null>(null);
  const dragStart = useRef<{ x: number; y: number; panX: number; panY: number } | null>(null);
  const moved = useRef(false);
  const gesturing = useRef(false);
  const clearGestureTimer = useRef<number | null>(null);

  const setGesturing = useCallback(
    (v: boolean) => {
      if (gesturing.current === v) return;
      gesturing.current = v;
      onGestureChange?.(v);
    },
    [onGestureChange],
  );

  const clampPan = useCallback((nextZoom: number, nextPan: { x: number; y: number }) => {
    const el = stageRef.current;
    if (!el) return nextPan;
    const w = el.clientWidth;
    const h = el.clientHeight;
    const maxX = ((nextZoom - 1) * w) / 2 + 8;
    const maxY = ((nextZoom - 1) * h) / 2 + 8;
    return {
      x: Math.max(-maxX, Math.min(maxX, nextPan.x)),
      y: Math.max(-maxY, Math.min(maxY, nextPan.y)),
    };
  }, []);

  const applyZoom = useCallback(
    (next: number, originPan?: { x: number; y: number }) => {
      const z = Math.min(MAX_ZOOM, Math.max(MIN_ZOOM, next));
      zoomRef.current = z;
      setZoom(z);
      const p = clampPan(z, originPan ?? panRef.current);
      panRef.current = p;
      setPan(p);
      onViewChange?.();
    },
    [clampPan, onViewChange],
  );

  const resetView = () => {
    zoomRef.current = 1;
    panRef.current = { x: 0, y: 0 };
    setZoom(1);
    setPan({ x: 0, y: 0 });
    onViewChange?.();
  };

  const onPointerDown = (e: ReactPointerEvent) => {
    if (clearGestureTimer.current != null) {
      window.clearTimeout(clearGestureTimer.current);
      clearGestureTimer.current = null;
    }
    pointers.current.set(e.pointerId, { x: e.clientX, y: e.clientY });
    moved.current = false;

    if (pointers.current.size === 2) {
      // Pinch: capture so we own the gesture; block accidental plays
      setGesturing(true);
      stageRef.current?.setPointerCapture?.(e.pointerId);
      const pts = [...pointers.current.values()];
      const dx = pts[0]!.x - pts[1]!.x;
      const dy = pts[0]!.y - pts[1]!.y;
      pinchStart.current = { dist: Math.hypot(dx, dy) || 1, zoom: zoomRef.current };
      dragStart.current = null;
      return;
    }

    // Single pointer at zoom>1 may become a pan; do not capture yet so taps still click
    if (pointers.current.size === 1 && zoomRef.current > 1.02) {
      dragStart.current = {
        x: e.clientX,
        y: e.clientY,
        panX: panRef.current.x,
        panY: panRef.current.y,
      };
    }
  };

  const onPointerMove = (e: ReactPointerEvent) => {
    if (!pointers.current.has(e.pointerId)) return;
    pointers.current.set(e.pointerId, { x: e.clientX, y: e.clientY });

    if (pointers.current.size === 2 && pinchStart.current) {
      setGesturing(true);
      moved.current = true;
      const pts = [...pointers.current.values()];
      const dx = pts[0]!.x - pts[1]!.x;
      const dy = pts[0]!.y - pts[1]!.y;
      const dist = Math.hypot(dx, dy) || 1;
      const ratio = dist / pinchStart.current.dist;
      applyZoom(pinchStart.current.zoom * ratio);
      return;
    }

    if (dragStart.current && pointers.current.size === 1 && zoomRef.current > 1.02) {
      const dx = e.clientX - dragStart.current.x;
      const dy = e.clientY - dragStart.current.y;
      if (Math.hypot(dx, dy) < 6 && !moved.current) return;
      moved.current = true;
      setGesturing(true);
      stageRef.current?.setPointerCapture?.(e.pointerId);
      const next = clampPan(zoomRef.current, {
        x: dragStart.current.panX + dx,
        y: dragStart.current.panY + dy,
      });
      panRef.current = next;
      setPan(next);
      onViewChange?.();
    }
  };

  const onPointerUp = (e: ReactPointerEvent) => {
    pointers.current.delete(e.pointerId);
    if (pointers.current.size < 2) pinchStart.current = null;
    if (pointers.current.size === 0) {
      dragStart.current = null;
      // Keep gesturing true briefly so click after pinch/pan is ignored
      if (moved.current || gesturing.current) {
        clearGestureTimer.current = window.setTimeout(() => {
          setGesturing(false);
          clearGestureTimer.current = null;
        }, 120);
      }
      moved.current = false;
    }
  };

  const onWheel = (e: ReactWheelEvent) => {
    if (prefersReducedMotion()) return;
    e.preventDefault();
    applyZoom(zoomRef.current + (e.deltaY > 0 ? -0.12 : 0.12));
  };

  useEffect(() => {
    const el = stageRef.current;
    if (!el) return;
    const prevent = (ev: TouchEvent) => {
      if (ev.touches.length > 1) ev.preventDefault();
    };
    el.addEventListener("touchmove", prevent, { passive: false });
    return () => el.removeEventListener("touchmove", prevent);
  }, []);

  return (
    <div className="board-viewport">
      <div
        ref={stageRef}
        className="board-viewport-stage"
        data-testid="board-viewport"
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerCancel={onPointerUp}
        onWheel={onWheel}
      >
        <div
          className="board-viewport-transform"
          style={{
            transform: `translate(${pan.x}px, ${pan.y}px) scale(${zoom})`,
            transition: prefersReducedMotion() || gesturing.current ? "none" : "transform 120ms ease-out",
          }}
        >
          {children}
        </div>
        {zoom > 1.02 ? (
          <button type="button" className="board-viewport-reset" onClick={resetView}>
            איפוס תצוגה ({zoom.toFixed(1)}×)
          </button>
        ) : (
          <p className="board-viewport-hint">צביטה להגדלה · גרירה להזזה</p>
        )}
      </div>
    </div>
  );
}
