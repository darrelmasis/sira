import { Skeleton } from "quickit-ui";

function alignClass(align) {
  if (align === "right") return "text-right";
  if (align === "center") return "text-center";
  return "text-left";
}

export default function TableSkeleton({ columns = [], rows = 5 }) {
  return (
    <div className="overflow-hidden rounded-2xl border border-zinc-200 dark:border-zinc-800">
      <table className="min-w-full divide-y text-sm">
        <thead className="sticky top-0 z-[1] border-b border-zinc-200/75 bg-zinc-50/70 text-zinc-600 dark:border-zinc-800/75 dark:bg-zinc-900/70 dark:text-zinc-400">
          <tr>
            {columns.map((col) => (
              <th
                key={col.key}
                scope="col"
                className={`px-4 py-3 text-xs font-semibold uppercase tracking-wide ${alignClass(col.align)}`}
              >
                {col.header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y bg-white dark:bg-zinc-950">
          {Array.from({ length: rows }).map((_, rowIndex) => (
            <tr key={`sk-${rowIndex}`} className="group">
              {columns.map((col, colIndex) => (
                <td
                  key={col.key}
                  className={`whitespace-nowrap px-4 py-3 align-middle ${alignClass(col.align)}`}
                >
                  <Skeleton variant="line" className={colIndex === 0 ? "h-4 w-32" : "h-4 w-20"} />
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
