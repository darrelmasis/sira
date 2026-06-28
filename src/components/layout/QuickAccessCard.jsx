import { useNavigate } from "react-router-dom";
import { cn } from "quickit-ui";

export default function QuickAccessCard({ to, icon: Icon, label, description, accent = "brand" }) {
  const navigate = useNavigate();

  const accentClass =
    accent === "warning"
      ? "hover:border-warning-500/50"
      : accent === "info"
        ? "hover:border-info-500/50"
        : "hover:border-brand-500/50";

  return (
    <button
      type="button"
      onClick={() => navigate(to)}
      className={cn(
        "group flex aspect-square w-full cursor-pointer flex-col items-center justify-center gap-2 rounded-lg border border-zinc-200/80 text-center transition-colors dark:border-zinc-800",
        accentClass,
        "hover:bg-zinc-50/80 dark:hover:bg-zinc-900/40",
      )}
    >
      <div className="flex size-10 items-center justify-center rounded-lg bg-zinc-200/60 text-zinc-700 transition-colors group-hover:bg-brand-500/15 group-hover:text-brand-600 dark:bg-zinc-800 dark:text-zinc-200 dark:group-hover:text-brand-400">
        <Icon aria-hidden="true" className="size-5" />
      </div>
      <div>
        <div className="text-xs font-semibold">{label}</div>
        {description && <div className="mt-0.5 text-[11px] text-zinc-500 dark:text-zinc-400">{description}</div>}
      </div>
    </button>
  );
}
