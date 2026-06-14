import { useCallback, useRef, useState } from "react";
import type { MouseEvent as ReactMouseEvent } from "react";

export function useColumnResize(initialWidths: number[]) {
  const [widths, setWidths] = useState(initialWidths);
  const dragging = useRef<{ col: number; startX: number; startW: number } | null>(null);

  const onMouseDown = useCallback(
    (col: number, e: ReactMouseEvent) => {
      e.preventDefault();
      dragging.current = { col, startX: e.clientX, startW: widths[col] };
      document.body.style.cursor = "col-resize";
      document.body.style.userSelect = "none";

      const onMove = (e: MouseEvent) => {
        if (!dragging.current) return;
        const { col, startX, startW } = dragging.current;
        setWidths((prev) =>
          prev.map((w, i) => (i === col ? Math.max(60, startW + (e.clientX - startX)) : w))
        );
      };
      const onUp = () => {
        dragging.current = null;
        document.body.style.cursor = "";
        document.body.style.userSelect = "";
        window.removeEventListener("mousemove", onMove);
        window.removeEventListener("mouseup", onUp);
      };
      window.addEventListener("mousemove", onMove);
      window.addEventListener("mouseup", onUp);
    },
    [widths]
  );

  return { widths, onMouseDown };
}
