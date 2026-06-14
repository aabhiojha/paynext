"use client";

function actionColor(action: string): string {
  if (action.includes("CREAT") || action.includes("ADD") || action.includes("ASSIGN")) return "#24A37D";
  if (action.includes("DELET") || action.includes("REMOV") || action.includes("CANCEL") || action.includes("ARCHIV")) return "#dc2626";
  if (action.includes("SUSPEND") || action.includes("PAUS") || action.includes("DISABL")) return "#f59e0b";
  if (action.includes("LOGIN") || action.includes("LOGOUT")) return "#6366f1";
  return "#6b7280";
}

/** Colored circular badge for an audit action: green plus (create), red X
    (delete/cancel), amber pause (pause/suspend/disable), gray pencil (rest). */
export default function ActivityIcon({ action, size = "md" }: { action: string; size?: "sm" | "md" }) {
  const color = actionColor(action);
  const box = size === "sm" ? "w-5 h-5" : "w-7 h-7";
  const svg = size === "sm" ? 11 : 13;
  const badge = (bg: string, path: React.ReactNode) => (
    <div className={`flex-shrink-0 ${box} rounded-full flex items-center justify-center`} style={{ backgroundColor: bg }}>
      <svg width={svg} height={svg} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
        {path}
      </svg>
    </div>
  );
  if (action.includes("CREAT") || action.includes("ADD") || action.includes("ASSIGN")) {
    return badge("#dcfce7", <path d="M12 5v14M5 12h14" />);
  }
  if (action.includes("DELET") || action.includes("CANCEL") || action.includes("ARCHIV")) {
    return badge("#fee2e2", <path d="M18 6 6 18M6 6l12 12" />);
  }
  if (action.includes("SUSPEND") || action.includes("PAUS") || action.includes("DISABL")) {
    return badge("#fef3c7", <path d="M10 5v14M14 5v14" />);
  }
  return badge(
    "#f3f4f6",
    <>
      <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
      <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4Z" />
    </>
  );
}
