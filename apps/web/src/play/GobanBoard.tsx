import { useEffect, useRef } from "react";
import type { BoardSnapshot } from "@go-darom/go-engine";
import "goban/build/Goban.css";

type Props = {
  snapshot: BoardSnapshot;
  interactive: boolean;
  onPlay?: (x: number, y: number) => void;
  onMountError?: (err: unknown) => void;
};

type GobanInstance = {
  destroy?: () => void;
  on?: (ev: string, cb: (...args: unknown[]) => void) => void;
  engine?: { board?: number[][] };
  redraw?: (force?: boolean) => void;
  setSquareSizeBasedOnDisplayWidth?: (w: number, suppress?: boolean) => void;
  setMode?: (mode: string) => void;
};

function applySnapshot(board: GobanInstance, snapshot: BoardSnapshot) {
  if (!board.engine?.board || !snapshot.grid) return;
  for (let y = 0; y < snapshot.size; y += 1) {
    for (let x = 0; x < snapshot.size; x += 1) {
      board.engine.board[y]![x] = snapshot.grid[y]![x] ?? 0;
    }
  }
  board.redraw?.(true);
}

/**
 * Single Goban instance for the game room.
 * Syncs authoritative snapshots without remounting on every Socket update.
 */
export function GobanBoard({ snapshot, interactive, onPlay, onMountError }: Props) {
  const hostRef = useRef<HTMLDivElement | null>(null);
  const boardRef = useRef<GobanInstance | null>(null);
  const interactiveRef = useRef(interactive);
  const onPlayRef = useRef(onPlay);
  const onMountErrorRef = useRef(onMountError);
  interactiveRef.current = interactive;
  onPlayRef.current = onPlay;
  onMountErrorRef.current = onMountError;

  // Mount once per board size
  useEffect(() => {
    let cancelled = false;
    const host = hostRef.current;
    if (!host) return;

    void (async () => {
      try {
        const mod = await import("goban");
        if (typeof mod.setGobanRenderer === "function") {
          mod.setGobanRenderer("canvas");
        }
        if (cancelled || !hostRef.current) return;
        host.innerHTML = "";
        const displayWidth = Math.max(host.clientWidth || 320, 240);
        const board = mod.createGoban({
          board_div: host,
          interactive: true,
          mode: "play",
          width: snapshot.size,
          height: snapshot.size,
          player_id: 0,
          display_width: displayWidth,
          draw_top_labels: true,
          draw_bottom_labels: false,
          draw_left_labels: true,
          draw_right_labels: false,
        }) as GobanInstance;
        if (cancelled) {
          board.destroy?.();
          return;
        }
        boardRef.current = board;
        applySnapshot(board, snapshot);
        const handle = (...args: unknown[]) => {
          if (!interactiveRef.current) return;
          const x = Number(args[0]);
          const y = Number(args[1]);
          if (Number.isInteger(x) && Number.isInteger(y) && x >= 0 && y >= 0) {
            onPlayRef.current?.(x, y);
          }
        };
        board.on?.("click", handle);
        board.on?.("stone-position", handle);
      } catch (err) {
        if (!cancelled) onMountErrorRef.current?.(err);
      }
    })();

    return () => {
      cancelled = true;
      boardRef.current?.destroy?.();
      boardRef.current = null;
      if (hostRef.current) hostRef.current.innerHTML = "";
    };
  }, [snapshot.size]);

  // Sync stones without remount
  useEffect(() => {
    const board = boardRef.current;
    if (!board) return;
    applySnapshot(board, snapshot);
  }, [snapshot]);

  // Resize with container
  useEffect(() => {
    const host = hostRef.current;
    if (!host) return;
    const ro = new ResizeObserver(() => {
      const board = boardRef.current;
      const w = host.clientWidth;
      if (!board || w < 40) return;
      board.setSquareSizeBasedOnDisplayWidth?.(w, false);
    });
    ro.observe(host);
    return () => ro.disconnect();
  }, [snapshot.size]);

  return (
    <div className="goban-host" data-testid="goban-host" ref={hostRef} aria-label="לוח גו" />
  );
}
