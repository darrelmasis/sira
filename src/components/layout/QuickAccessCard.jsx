import { useNavigate } from "react-router-dom";
import { cn } from "quickit-ui";

export default function QuickAccessCard({ to, icon: Icon, label, accent = "brand" }) {
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
        "group flex aspect-square w-full cursor-pointer flex-col items-center justify-center gap-1.5 rounded-lg border border-zinc-200/80 text-center transition-colors dark:border-zinc-800",
        accentClass,
        "hover:bg-zinc-50/80 dark:hover:bg-zinc-900/40",
      )}
    >
      <div className="flex size-8 items-center justify-center rounded-lg bg-zinc-200/60 text-zinc-700 transition-colors group-hover:bg-brand-500/15 group-hover:text-brand-600 dark:bg-zinc-800 dark:text-zinc-200 dark:group-hover:text-brand-400">
        <Icon aria-hidden="true" className="size-4" />
      </div>
      <div className="text-[11px] font-semibold leading-tight">{label}</div>
    </button>
  );
}
