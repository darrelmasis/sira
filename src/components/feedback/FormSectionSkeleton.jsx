import { Skeleton } from "quickit-ui";

function FieldSkeleton() {
  return (
    <div className="space-y-2">
      <Skeleton variant="line" className="h-3.5 w-20" />
      <Skeleton variant="rect" className="h-10 w-full rounded-md" />
    </div>
  );
}

export default function FormSectionSkeleton({ fields = 6, fullWidthLast = false }) {
  return (
    <section className="grid gap-4 rounded-xl border border-zinc-200/80 p-5 dark:border-zinc-800 md:grid-cols-2">
      {Array.from({ length: fields }).map((_, index) => {
        const isLastFull = fullWidthLast && index === fields - 1;
        return (
          <div key={index} className={isLastFull ? "md:col-span-2" : undefined}>
            <FieldSkeleton />
          </div>
        );
      })}
    </section>
  );
}
