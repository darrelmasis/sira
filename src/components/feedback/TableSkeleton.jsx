import { Skeleton } from "quickit-ui";

export default function TableSkeleton({
  columns = 5,
  rows = 5,
  showActionsColumn = false,
}) {
  const gridColumns = showActionsColumn
    ? `repeat(${columns}, minmax(0, 1fr)) auto`
    : `repeat(${columns}, minmax(0, 1fr))`;

  return (
    <div className="overflow-hidden rounded-2xl border border-zinc-200 dark:border-zinc-800">
      {Array.from({ length: rows }).map((_, rowIndex) => (
        <div
          key={`row-${rowIndex}`}
          className="grid gap-4 border-b border-zinc-200 px-4 py-3.5 last:border-b-0 dark:border-zinc-800"
          style={{ gridTemplateColumns: gridColumns }}
        >
          {Array.from({ length: columns }).map((_, colIndex) => (
            <Skeleton
              key={`cell-${rowIndex}-${colIndex}`}
              variant="line"
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
  );
}
