import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button, cn } from "quickit-ui";
import { Egg, Layers, Plus, Skull, X } from "lucide-react";
import { usePermissions } from "@/features/auth/permissions";

const items = [
  { to: "/mortalidad", label: "Mortalidad", icon: Skull, color: "text-amber-600 dark:text-amber-400", bg: "bg-amber-100 dark:bg-amber-950" },
  { to: "/produccion", label: "Producción", icon: Egg, color: "text-emerald-600 dark:text-emerald-400", bg: "bg-emerald-100 dark:bg-emerald-950" },
  { to: "/capitalizacion", label: "Capitalización", icon: Layers, color: "text-sky-600 dark:text-sky-400", bg: "bg-sky-100 dark:bg-sky-950", permission: "transfers.create" },
];

export default function FloatingQuickAccess() {
  const [open, setOpen] = useState(false);
  const navigate = useNavigate();
  const { can } = usePermissions();

  const visible = items.filter((i) => !i.permission || can(i.permission));
  if (visible.length === 0) return null;

  return (
    <div className="fixed bottom-6 right-6 z-50 flex flex-col items-end gap-3">
      {visible.map((item) => (
        <Button
          key={item.to}
          type="button"
          variant="ghost"
          onClick={() => { setOpen(false); navigate(item.to); }}
          className={cn(
            "flex items-center gap-2 rounded-full px-4 py-2.5 text-sm font-medium shadow-lg transition-all duration-200",
            item.bg,
            item.color,
            open
              ? "scale-100 opacity-100 pointer-events-auto"
              : "scale-50 opacity-0 pointer-events-none",
          )}
          style={{ transitionDelay: open ? `${visible.indexOf(item) * 50}ms` : "0ms" }}
        >
          <item.icon size={18} />
          <span>{item.label}</span>
        </Button>
      ))}
      <Button
        type="button"
        variant="solid"
        color="brand"
        shape="square"
        onClick={() => setOpen((v) => !v)}
        className="size-14 rounded-full shadow-lg transition-all duration-300 active:scale-95"
      >
        <X size={24} className={cn("transition-transform duration-300", open ? "rotate-0 scale-100" : "rotate-90 scale-0 absolute")} />
        <Plus size={24} className={cn("transition-transform duration-300", open ? "rotate-90 scale-0 absolute" : "rotate-0 scale-100")} />
      </Button>
    </div>
  );
}