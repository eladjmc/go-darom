import { useMemo, useState } from "react";
import type { BoardSnapshot } from "@go-darom/go-engine";
import { goColumnLetter, goRowNumber } from "./boardCoordinates";

type Props = {
  snapshot: BoardSnapshot;
  interactive: boolean;
  lastMove?: { x: number; y: number } | null;
  preview?: { x: number; y: number } | null;
  deadMarks?: Set<string>;
  /** Engine ownership: 0 neutral, 1 black territory, 2 white — empty points only */
  ownership?: number[][] | null;
  hoverColor?: "black" | "white" | null;
  onPlay?: (x: number, y: number) => void;
};

/** Production SVG board — single visible renderer with correct square mapping. */
export function SnapshotBoard({
  snapshot,
  interactive,
  lastMove,
  preview,
  deadMarks,
  ownership,
  hoverColor,
  onPlay,
}: Props) {
  const size = snapshot.size;
  const [hover, setHover] = useState<{ x: number; y: number } | null>(null);
  const { pad, cell, boardPx, fontSize, labelCenter } = useMemo(() => {
    // Wide wood gutter on all four sides. Scale with board size so 19×19 keeps a
    // similar visual margin to 9×9 after the SVG is fit into the viewport.
    const cellInner = 24;
    const padInner = Math.round(cellInner * (1.35 + (size - 9) * 0.05));
    const labelCenterInner = Math.max(10, Math.round(padInner * 0.36));
    const board = padInner * 2 + cellInner * (size - 1);
    return {
      pad: padInner,
      cell: cellInner,
      boardPx: board,
      labelCenter: labelCenterInner,
      fontSize: Math.max(8, Math.min(11.5, cellInner * 0.4)),
    };
  }, [size]);

  const stroke = Math.max(0.9, cell * 0.045);
  const markR = Math.max(1.6, cell * 0.16);
  const labelColor = "rgba(42, 28, 12, 0.78)";

  return (
    <svg
      className="snapshot-board"
      viewBox={`0 0 ${boardPx} ${boardPx}`}
      role="img"
      aria-label={`לוח גו ${size} על ${size}`}
      data-testid="snapshot-board"
      onMouseLeave={() => setHover(null)}
    >
      <defs>
        <radialGradient id="woodGrad" cx="35%" cy="30%" r="75%">
          <stop offset="0%" stopColor="#f0d19a" />
          <stop offset="55%" stopColor="#dbb06a" />
          <stop offset="100%" stopColor="#c9964a" />
        </radialGradient>
        <radialGradient id="blackStone" cx="32%" cy="28%" r="70%">
          <stop offset="0%" stopColor="#555" />
          <stop offset="55%" stopColor="#1a1a1a" />
          <stop offset="100%" stopColor="#000" />
        </radialGradient>
        <radialGradient id="whiteStone" cx="32%" cy="28%" r="70%">
          <stop offset="0%" stopColor="#fff" />
          <stop offset="70%" stopColor="#ececec" />
          <stop offset="100%" stopColor="#c8c8c8" />
        </radialGradient>
      </defs>
      <rect width={boardPx} height={boardPx} rx="6" fill="url(#woodGrad)" />

      {/* Coordinates in the wooden margins (outside the grid) */}
      <g className="board-coords" data-testid="board-coords" aria-hidden="true">
        {Array.from({ length: size }, (_, i) => {
          const letter = goColumnLetter(i);
          const number = goRowNumber(i, size);
          const cx = pad + i * cell;
          const cy = pad + i * cell;
          const topY = labelCenter;
          const bottomY = boardPx - labelCenter;
          const leftX = labelCenter;
          const rightX = boardPx - labelCenter;
          return (
            <g key={`coord-${i}`}>
              <text
                x={cx}
                y={topY}
                textAnchor="middle"
                dominantBaseline="middle"
                fontSize={fontSize}
                fontFamily="ui-sans-serif, system-ui, sans-serif"
                fontWeight={600}
                fill={labelColor}
                data-coord-gutter={pad - labelCenter}
                data-testid={`coord-col-top-${letter}`}
              >
                {letter}
              </text>
              <text
                x={cx}
                y={bottomY}
                textAnchor="middle"
                dominantBaseline="middle"
                fontSize={fontSize}
                fontFamily="ui-sans-serif, system-ui, sans-serif"
                fontWeight={600}
                fill={labelColor}
                data-testid={`coord-col-bottom-${letter}`}
              >
                {letter}
              </text>
              <text
                x={leftX}
                y={cy}
                textAnchor="middle"
                dominantBaseline="middle"
                fontSize={fontSize}
                fontFamily="ui-sans-serif, system-ui, sans-serif"
                fontWeight={600}
                fill={labelColor}
                data-testid={`coord-row-left-${number}`}
              >
                {number}
              </text>
              <text
                x={rightX}
                y={cy}
                textAnchor="middle"
                dominantBaseline="middle"
                fontSize={fontSize}
                fontFamily="ui-sans-serif, system-ui, sans-serif"
                fontWeight={600}
                fill={labelColor}
                data-testid={`coord-row-right-${number}`}
              >
                {number}
              </text>
            </g>
          );
        })}
      </g>

      {Array.from({ length: size }, (_, i) => (
        <g key={`line-${i}`}>
          <line
            x1={pad}
            y1={pad + i * cell}
            x2={pad + (size - 1) * cell}
            y2={pad + i * cell}
            stroke="#2a1c0c"
            strokeWidth={stroke}
          />
          <line
            x1={pad + i * cell}
            y1={pad}
            x2={pad + i * cell}
            y2={pad + (size - 1) * cell}
            stroke="#2a1c0c"
            strokeWidth={stroke}
          />
        </g>
      ))}
      {(size === 9
        ? [
            [2, 2],
            [2, 6],
            [6, 2],
            [6, 6],
            [4, 4],
          ]
        : size === 13
          ? [
              [3, 3],
              [3, 9],
              [9, 3],
              [9, 9],
              [6, 6],
            ]
          : [
              [3, 3],
              [3, 9],
              [3, 15],
              [9, 3],
              [9, 9],
              [9, 15],
              [15, 3],
              [15, 9],
              [15, 15],
            ]
      ).map(([x, y]) => (
        <circle
          key={`star-${x}-${y}`}
          cx={pad + x * cell}
          cy={pad + y * cell}
          r={Math.max(1.2, cell * 0.09)}
          fill="#2a1c0c"
        />
      ))}
      {/* Territory markers from authoritative engine ownership — under stones */}
      {ownership
        ? ownership.map((row, y) =>
            row.map((own, x) => {
              if (own !== 1 && own !== 2) return null;
              if (snapshot.grid[y]?.[x]) return null;
              const cx = pad + x * cell;
              const cy = pad + y * cell;
              return (
                <rect
                  key={`terr-${x}-${y}`}
                  x={cx - markR}
                  y={cy - markR}
                  width={markR * 2}
                  height={markR * 2}
                  rx={0.7}
                  fill={own === 1 ? "rgba(18,18,18,0.62)" : "rgba(255,255,255,0.82)"}
                  stroke={own === 1 ? "rgba(0,0,0,0.4)" : "rgba(70,70,70,0.5)"}
                  strokeWidth={0.45}
                  pointerEvents="none"
                  data-testid={`territory-${x}-${y}`}
                  data-owner={own === 1 ? "black" : "white"}
                />
              );
            }),
          )
        : null}
      {snapshot.grid.map((row, y) =>
        row.map((v, x) => {
          const cx = pad + x * cell;
          const cy = pad + y * cell;
          const r = cell * 0.46;
          const key = `${x},${y}`;
          const isPreview = preview && preview.x === x && preview.y === y;
          if (!v) {
            const showHover =
              !isPreview &&
              hover &&
              hover.x === x &&
              hover.y === y &&
              hoverColor &&
              snapshot.grid[y]![x] === 0;
            if (!interactive && !isPreview && !showHover) return null;
            return (
              <g key={key}>
                {showHover || isPreview ? (
                  <circle
                    cx={cx}
                    cy={cy}
                    r={r}
                    fill={hoverColor === "white" ? "url(#whiteStone)" : "url(#blackStone)"}
                    opacity={isPreview ? 0.55 : 0.32}
                    stroke={isPreview ? "#1b4332" : "none"}
                    strokeWidth={isPreview ? 1.4 : 0}
                    pointerEvents="none"
                  />
                ) : null}
                {interactive ? (
                  <circle
                    cx={cx}
                    cy={cy}
                    r={r}
                    fill="transparent"
                    className="snapshot-hotspot"
                    data-testid={`intersection-${x}-${y}`}
                    data-coord={`${goColumnLetter(x)}${goRowNumber(y, size)}`}
                    onMouseEnter={() => setHover({ x, y })}
                    onClick={() => onPlay?.(x, y)}
                  />
                ) : null}
              </g>
            );
          }
          const dead = deadMarks?.has(key);
          return (
            <g key={key} opacity={dead ? 0.38 : 1} data-coord={`${goColumnLetter(x)}${goRowNumber(y, size)}`}>
              <circle cx={cx + cell * 0.04} cy={cy + cell * 0.05} r={r} fill="rgba(0,0,0,0.18)" pointerEvents="none" />
              <circle
                cx={cx}
                cy={cy}
                r={r}
                fill={v === 1 ? "url(#blackStone)" : "url(#whiteStone)"}
                stroke={dead ? "#c0392b" : v === 1 ? "#111" : "#888"}
                strokeWidth={dead ? 1.4 : 0.6}
                strokeDasharray={dead ? "2 1.5" : undefined}
                className={interactive ? "snapshot-hotspot" : undefined}
                data-testid={`stone-${x}-${y}`}
                onClick={interactive ? () => onPlay?.(x, y) : undefined}
              />
              {dead ? (
                <>
                  <line
                    x1={cx - r * 0.45}
                    y1={cy - r * 0.45}
                    x2={cx + r * 0.45}
                    y2={cy + r * 0.45}
                    stroke="#c0392b"
                    strokeWidth={1.2}
                    pointerEvents="none"
                  />
                  <line
                    x1={cx + r * 0.45}
                    y1={cy - r * 0.45}
                    x2={cx - r * 0.45}
                    y2={cy + r * 0.45}
                    stroke="#c0392b"
                    strokeWidth={1.2}
                    pointerEvents="none"
                  />
                </>
              ) : null}
              {lastMove && lastMove.x === x && lastMove.y === y && !dead ? (
                <circle cx={cx} cy={cy} r={r * 0.28} fill={v === 1 ? "#f5f5f5" : "#222"} pointerEvents="none" />
              ) : null}
            </g>
          );
        }),
      )}
    </svg>
  );
}
