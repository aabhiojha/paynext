import { Skeleton } from "@/components/ui/skeleton"

export function TableSkeleton({ rows = 6, cols = 5 }: { rows?: number; cols?: number }) {
  return (
    <div className="space-y-3 p-4">
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} className="flex items-center gap-4">
          {Array.from({ length: cols }).map((_, j) => (
            <Skeleton
              key={j}
              className="h-5 flex-1"
              style={{ width: `${60 + (j % 3) * 12}%` }}
            />
          ))}
        </div>
      ))}
    </div>
  )
}
