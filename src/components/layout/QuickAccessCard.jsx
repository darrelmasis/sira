import { useNavigate } from "react-router-dom";
import { cn } from "quickit-ui";
import { ArrowRight } from "lucide-react";

const accentStyles = {
  brand: {
    iconBg: "bg-brand-100 dark:bg-brand-900/30",
    iconText: "text-brand-600 dark:text-brand-400",
  },
  success: {
    iconBg: "bg-emerald-100 dark:bg-emerald-900/30",
    iconText: "text-emerald-600 dark:text-emerald-400",
  },
  info: {
    iconBg: "bg-sky-100 dark:bg-sky-900/30",
    iconText: "text-sky-600 dark:text-sky-400",
  },
  warning: {
    iconBg: "bg-amber-100 dark:bg-amber-900/30",
    iconText: "text-amber-600 dark:text-amber-400",
  },
  danger: {
    iconBg: "bg-rose-100 dark:bg-rose-900/30",
    iconText: "text-rose-600 dark:text-rose-400",
  },
};

function CardLayout({ to, icon: Icon, label, description, accent, className }) {
  const navigate = useNavigate();
  const styles = accentStyles[accent] || accentStyles.brand;

  return (
    <button
      type="button"
      onClick={() => navigate(to)}
      className={cn(
        "group flex w-full cursor-pointer flex-col gap-3 rounded-lg border border-zinc-200/80 bg-[var(--sira-surface)] p-4 text-left transition-colors dark:border-zinc-800",
        "hover:border-zinc-300 dark:hover:border-zinc-700",
        className,
      )}
    >
      <div className="flex items-start justify-between">
        <div className={cn("flex size-10 items-center justify-center rounded-lg", styles.iconBg, styles.iconText)}>
          <Icon aria-hidden="true" className="size-5" />
        </div>
        <ArrowRight aria-hidden="true" className="size-4 text-zinc-300 transition-transform group-hover:translate-x-0.5 dark:text-zinc-600" />
      </div>
      <div>
        <div className="text-sm font-semibold">{label}</div>
        {description && (
          <p className="mt-1 text-xs leading-relaxed text-zinc-500 dark:text-zinc-400">{description}</p>
        )}
      </div>
    </button>
  );
}

function ListLayout({ to, icon: Icon, label, description, accent, className }) {
  const navigate = useNavigate();
  const styles = accentStyles[accent] || accentStyles.brand;

  return (
    <button
      type="button"
      onClick={() => navigate(to)}
      className={cn(
        "group flex w-full cursor-pointer items-center gap-3 rounded-lg border border-zinc-200/80 bg-[var(--sira-surface)] px-4 py-3 text-left transition-colors dark:border-zinc-800",
        "hover:border-zinc-300 dark:hover:border-zinc-700",
        className,
      )}
    >
      <div className={cn("flex size-9 shrink-0 items-center justify-center rounded-lg", styles.iconBg, styles.iconText)}>
        <Icon aria-hidden="true" className="size-4" />
      </div>
      <div className="min-w-0 flex-1">
        <div className="text-sm font-semibold">{label}</div>
        {description && (
          <p className="mt-0.5 truncate text-xs text-zinc-500 dark:text-zinc-400">{description}</p>
        )}
      </div>
      <ArrowRight aria-hidden="true" className="size-4 shrink-0 text-zinc-300 transition-transform group-hover:translate-x-0.5 dark:text-zinc-600" />
    </button>
  );
}

function HeroLayout({ to, icon: Icon, label, description, action, accent, className }) {
  const navigate = useNavigate();
  const styles = accentStyles[accent] || accentStyles.brand;

  return (
    <button
      type="button"
      onClick={() => navigate(to)}
      className={cn(
        "group flex w-full cursor-pointer flex-col justify-between overflow-hidden rounded-lg border border-zinc-200/80 bg-[var(--sira-surface)] p-4 text-left transition-colors dark:border-zinc-800",
        "hover:border-zinc-300 dark:hover:border-zinc-700",
        className,
      )}
    >
      <div className={cn("flex size-9 items-center justify-center rounded-lg", styles.iconBg, styles.iconText)}>
        <Icon aria-hidden="true" className="size-4" />
      </div>
      <div className="mt-4">
        <div className="text-sm font-semibold">{label}</div>
        {description && (
          <p className="mt-1 text-xs leading-relaxed text-zinc-500 dark:text-zinc-400">{description}</p>
        )}
      </div>
      {action && (
        <div className="mt-3">
          <span className="inline-block rounded-md border border-zinc-200/80 bg-zinc-100 px-3 py-1.5 text-xs font-medium text-zinc-700 transition-colors group-hover:bg-zinc-200 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-300 dark:group-hover:bg-zinc-700">
            {action}
          </span>
        </div>
      )}
    </button>
  );
}

const layouts = { card: CardLayout, list: ListLayout, hero: HeroLayout };

export default function QuickAccessCard({ to, icon, label, description, action, accent = "brand", layout = "card", className }) {
  const Layout = layouts[layout] || layouts.card;
  return <Layout to={to} icon={icon} label={label} description={description} action={action} accent={accent} className={className} />;
}
