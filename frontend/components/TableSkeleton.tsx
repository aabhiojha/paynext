"use client";

// Deterministic, varied cell widths so skeleton rows don't look like a rigid grid.
const CELL_WIDTHS = ["62%", "84%", "48%", "70%", "40%", "56%", "30%", "66%"];

/**
 * Skeleton placeholder rows meant to live *inside* a real `<tbody>`, so the
 * actual `<thead>` (titles, sort icons, resize handles) stays constant while
 * only the data is loading — e.g. during a sort or page change.
 */
export function TableSkeletonRows({ columns, rows = 10 }: { columns: number; rows?: number }) {
  return (
    <>
      {Array.from({ length: rows }).map((_, r) => (
        <tr key={r} style={{ borderTop: "1px solid var(--border)" }} aria-hidden="true">
          {Array.from({ length: columns }).map((_, c) => (
            <td key={c} className="px-4 py-3.5">
              <div
                className="h-3.5 rounded skeleton-shimmer"
                style={{ width: CELL_WIDTHS[(r + c) % CELL_WIDTHS.length], opacity: 0.7 }}
              />
            </td>
          ))}
        </tr>
      ))}
    </>
  );
}

/**
 * Loading placeholder shaped like a real data table — a header bar plus shimmer
 * rows — so swapping it in for a spinner avoids layout jump and reads as "this
 * content is arriving" rather than "something is spinning".
 */
export default function TableSkeleton({
  columns,
  rows = 8,
  className,
  bordered = true,
}: {
  columns: number;
  rows?: number;
  /** Extra classes for the outer container (e.g. flex sizing). */
  className?: string;
  /** Set false when the parent already provides a bordered container. */
  bordered?: boolean;
}) {
  // Deterministic, varied cell widths so the rows don't look like a grid of bars.
  const cellWidths = ["62%", "84%", "48%", "70%", "40%", "56%", "30%", "66%"];

  return (
    <div
      className={`overflow-hidden ${bordered ? "rounded-xl" : ""} ${className ?? ""}`}
      style={bordered ? { border: "1px solid var(--border)" } : undefined}
      aria-hidden="true"
    >
      <table className="w-full" style={{ tableLayout: "fixed" }}>
        <thead>
          <tr style={{ backgroundColor: "var(--bg-card)" }}>
            {Array.from({ length: columns }).map((_, i) => (
              <th key={i} className="text-left px-4 py-3">
                <div className="h-3 rounded skeleton-shimmer" style={{ width: "52%" }} />
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {Array.from({ length: rows }).map((_, r) => (
            <tr key={r} style={{ borderTop: "1px solid var(--border)" }}>
              {Array.from({ length: columns }).map((_, c) => (
                <td key={c} className="px-4 py-3.5">
                  <div
                    className="h-3.5 rounded skeleton-shimmer"
                    style={{ width: cellWidths[(r + c) % cellWidths.length], opacity: 0.7 }}
                  />
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
