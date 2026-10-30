import { Link } from "react-router-dom";

/** Provisional raster lockup + accessible text brand — not a final vector master. */
export function BrandMark({ compact = false }: { compact?: boolean }) {
  return (
    <Link to="/" className={`brand-mark ${compact ? "compact" : ""}`} aria-label="גו דרום — דף הבית">
      <img
        src="/brand/logo-selected-symbol-reference.png"
        alt=""
        width={compact ? 40 : 48}
        height={compact ? 40 : 48}
        className="brand-mark-symbol"
      />
      <span className="brand-mark-text">
        <strong>גו דרום</strong>
        {!compact && <small>קהילת גו בדרום</small>}
      </span>
    </Link>
  );
}
