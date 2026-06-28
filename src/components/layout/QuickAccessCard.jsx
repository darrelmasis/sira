import { useNavigate } from "react-router-dom";
import { cn } from "quickit-ui";
import { ChevronRight } from "lucide-react";

const sectionAccents = {
  registro: {
    iconBg: "bg-brand-100 dark:bg-brand-900/30",
    iconText: "text-brand-600 dark:text-brand-400",
    hoverBorder: "hover:border-brand-200 dark:hover:border-brand-800",
    accentBar: "bg-brand-500",
  },
  consulta: {
    iconBg: "bg-zinc-100 dark:bg-zinc-800",
    iconText: "text-zinc-600 dark:text-zinc-400",
    hoverBorder: "hover:border-zinc-300 dark:hover:border-zinc-700",
    accentBar: "bg-zinc-400 dark:bg-zinc-500",
  },
  admin: {
    iconBg: "bg-zinc-100 dark:bg-zinc-800",
    iconText: "text-zinc-600 dark:text-zinc-400",
    hoverBorder: "hover:border-zinc-300 dark:hover:border-zinc-700",
    accentBar: "bg-zinc-400 dark:bg-zinc-500",
  },
};

export default function QuickAccessCard({ to, icon: Icon, label, description, section = "registro", className }) {
  const navigate = useNavigate();
  const styles = sectionAccents[section] || sectionAccents.registro;

  return (
    <button
      type="button"
      onClick={() => navigate(to)}
      className={cn(
        "group relative flex w-full cursor-pointer items-center gap-4 overflow-hidden rounded-xl border border-zinc-200/80 bg-[var(--sira-surface)] px-5 py-4 text-left shadow-xs transition-all duration-200 dark:border-zinc-800",
        styles.hoverBorder,
        "hover:shadow-sm",
        className,
      )}
    >
      <div className={cn("flex size-11 shrink-0 items-center justify-center rounded-lg", styles.iconBg, styles.iconText)}>
        <Icon aria-hidden="true" className="size-5" />
      </div>
      <div className="min-w-0 flex-1">
        <div className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">{label}</div>
        <p className="mt-0.5 text-xs text-zinc-500 dark:text-zinc-400">{description}</p>
      </div>
      <ChevronRight aria-hidden="true" className="size-4 shrink-0 text-zinc-300 transition-all group-hover:translate-x-0.5 group-hover:text-zinc-500 dark:text-zinc-600 dark:group-hover:text-zinc-400" />
    </button>
  );
}
