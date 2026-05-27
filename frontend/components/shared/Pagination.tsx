"use client"

import { Button } from "@/components/ui/button"
import { ChevronLeft, ChevronRight } from "lucide-react"

interface PaginationProps {
  page: number
  totalPages: number
  totalElements?: number
  pageSize?: number
  onPageChange: (page: number) => void
}

export function Pagination({
  page,
  totalPages,
  totalElements,
  pageSize,
  onPageChange,
}: PaginationProps) {
  const start = page * (pageSize ?? 0) + 1
  const end = Math.min(start + (pageSize ?? 0) - 1, totalElements ?? 0)

  return (
    <div className="flex items-center justify-between gap-4 px-4 py-3">
      <p className="text-xs text-muted-foreground">
        {totalElements && totalElements > 0 ? (
          <>
            <span className="font-medium text-foreground">
              {start.toLocaleString()}–{end.toLocaleString()}
            </span>{" "}
            of{" "}
            <span className="font-medium text-foreground">
              {totalElements.toLocaleString()}
            </span>
          </>
        ) : (
          "No results"
        )}
      </p>
      <div className="flex items-center gap-1">
        <Button
          size="sm"
          variant="outline"
          disabled={page === 0}
          onClick={() => onPageChange(page - 1)}
        >
          <ChevronLeft className="h-4 w-4" />
          Prev
        </Button>
        <span className="px-2 text-xs text-muted-foreground tabular-nums">
          Page {page + 1} / {Math.max(totalPages, 1)}
        </span>
        <Button
          size="sm"
          variant="outline"
          disabled={page + 1 >= totalPages}
          onClick={() => onPageChange(page + 1)}
        >
          Next
          <ChevronRight className="h-4 w-4" />
        </Button>
      </div>
    </div>
  )
}
