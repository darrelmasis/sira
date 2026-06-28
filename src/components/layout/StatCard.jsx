import { FormDescription, Label, cn } from "quickit-ui";

export default function StatCard({ label, value, hint, className }) {
  return (
    <div
      className={cn(
        "rounded-lg border border-zinc-200/80 p-4 dark:border-zinc-800",
        className,
      )}
    >
      <Label className="text-sm font-normal text-zinc-500 dark:text-zinc-400">{label}</Label>
      <div className="mt-2 text-2xl font-semibold text-zinc-950 dark:text-zinc-50">{value}</div>
      {hint && <FormDescription className="mt-1">{hint}</FormDescription>}
    </div>
  );
}
