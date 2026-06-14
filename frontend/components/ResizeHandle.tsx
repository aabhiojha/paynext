import type { MouseEvent } from "react";

export default function ResizeHandle({ onMouseDown }: { onMouseDown: (e: MouseEvent) => void }) {
  return (
    <div onMouseDown={onMouseDown} className="absolute right-0 top-0 h-full w-1 cursor-col-resize hover:bg-md-primary/20 transition-colors" />
  );
}
