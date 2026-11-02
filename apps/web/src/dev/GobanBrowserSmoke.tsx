import { useEffect, useMemo, useState } from "react";
import { createGobanEngineAdapter, type BoardSnapshot, type BoardSize } from "@go-darom/go-engine";
import { GobanBoard } from "../play/GobanBoard";
import { SnapshotBoard } from "../play/SnapshotBoard";
import "../play/play.css";

/**
 * Dev-only page for Playwright / manual Goban browser verification (D5).
 * Route: /dev/goban-browser-smoke
 */
export function GobanBrowserSmoke() {
  const [size, setSize] = useState<BoardSize>(9);
  const [useGoban, setUseGoban] = useState(true);
  const [mountError, setMountError] = useState<string | null>(null);
  const session = useMemo(() => {
    const adapter = createGobanEngineAdapter();
    const game = adapter.createGame({ size, komi: 6.5 });
    return { adapter, game };
  }, [size]);
  const [snapshot, setSnapshot] = useState<BoardSnapshot>(() => session.adapter.snapshot(session.game));

  useEffect(() => {
    setSnapshot(session.adapter.snapshot(session.game));
    setMountError(null);
  }, [session]);

  const onPlay = (x: number, y: number) => {
    const result = session.adapter.play(session.game, { x, y });
    if (result.ok) setSnapshot(session.adapter.snapshot(session.game));
  };

  return (
    <section className="play-page" data-testid="goban-smoke-page">
      <h1>Goban browser smoke</h1>
      <div className="play-choice-row" style={{ marginBottom: "1rem" }}>
        {([9, 13, 19] as BoardSize[]).map((s) => (
          <button
            key={s}
            type="button"
            className={`btn ${size === s ? "btn-primary" : "btn-secondary"} btn-compact`}
            data-testid={`size-${s}`}
            onClick={() => setSize(s)}
          >
            {s}×{s}
          </button>
        ))}
        <button type="button" className="btn btn-secondary btn-compact" onClick={() => setUseGoban((v) => !v)}>
          {useGoban ? "Snapshot" : "Goban"}
        </button>
      </div>
      {mountError ? (
        <p className="play-error" data-testid="goban-mount-error">
          {mountError}
        </p>
      ) : null}
      <div data-testid="board-stage">
        {useGoban ? (
          <GobanBoard
            snapshot={snapshot}
            interactive
            onPlay={onPlay}
            onMountError={(err) => setMountError(err instanceof Error ? err.message : String(err))}
          />
        ) : (
          <SnapshotBoard snapshot={snapshot} interactive onPlay={onPlay} />
        )}
      </div>
      <p data-testid="to-move">toMove={snapshot.toMove}</p>
    </section>
  );
}
