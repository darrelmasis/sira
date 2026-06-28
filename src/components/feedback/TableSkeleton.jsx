import { Skeleton } from "quickit-ui";

export default function TableSkeleton({
  columns = 5,
  rows = 5,
  showToolbar = false,
  showHeader = false,
  showActionsColumn = false,
}) {
  const gridColumns = showActionsColumn
    ? `repeat(${columns}, minmax(0, 1fr)) auto`
    : `repeat(${columns}, minmax(0, 1fr))`;

  return (
    <div className={showHeader ? "overflow-hidden rounded-2xl border border-zinc-200/80 dark:border-zinc-800" : "space-y-4"}>
      {showToolbar && (
        <div className="flex justify-end">
          <Skeleton variant="rect" className="h-9 w-36 rounded-md" />
        </div>
      )}

      {showHeader && (
        <div className="border-b border-zinc-200 px-5 py-4 dark:border-zinc-800">
          <Skeleton variant="line" className="h-5 w-48" />
          <Skeleton variant="line" className="mt-2 h-3.5 w-72" />
        </div>
      )}

      <div className={showHeader ? "" : "overflow-hidden rounded-2xl border border-zinc-200 dark:border-zinc-800"}>
        <div
          className="grid gap-4 border-b border-zinc-200 bg-zinc-50/80 px-4 py-3 dark:border-zinc-800 dark:bg-zinc-900/50"
          style={{ gridTemplateColumns: gridColumns }}
        >
          {Array.from({ length: columns }).map((_, index) => (
            <Skeleton key={`head-${index}`} variant="line" className="h-3.5 w-16" />
          ))}
          {showActionsColumn && <Skeleton variant="line" className="h-3.5 w-8 justify-self-end" />}
        </div>

        {Array.from({ length: rows }).map((_, rowIndex) => (
          <div
            key={`row-${rowIndex}`}
            className="grid gap-4 border-b border-zinc-200 px-4 py-3.5 last:border-b-0 dark:border-zinc-800"
            style={{ gridTemplateColumns: gridColumns }}
          >
            {Array.from({ length: columns }).map((_, colIndex) => (
              <Skeleton
                key={`cell-${rowIndex}-${colIndex}`}
                variant={showHeader && colIndex === 3 ? "circle" : "line"}
                className={colIndex === 0 ? "h-4 w-32" : "h-4 w-20"}
              />
            ))}
            {showActionsColumn && (
              <div className="flex justify-end gap-2">
                <Skeleton variant="rect" className="size-8 rounded-md" />
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
