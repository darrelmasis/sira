import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button, cn } from "quickit-ui";
import { Egg, Layers, Plus, Skull, X } from "lucide-react";
import { usePermissions } from "@/features/auth/permissions";

const RADIUS = 80;

const items = [
  { to: "/mortalidad", label: "Mortalidad", icon: Skull, color: "text-amber-600 dark:text-amber-400", bg: "bg-amber-100 dark:bg-amber-900", angle: 180 },
  { to: "/produccion", label: "Producción", icon: Egg, color: "text-emerald-600 dark:text-emerald-400", bg: "bg-emerald-100 dark:bg-emerald-900", angle: 225 },
  { to: "/capitalizacion", label: "Capitalización", icon: Layers, color: "text-sky-600 dark:text-sky-400", bg: "bg-sky-100 dark:bg-sky-900", angle: 270, permission: "transfers.create" },
];

export default function FloatingQuickAccess() {
  const [open, setOpen] = useState(false);
  const navigate = useNavigate();
  const { can } = usePermissions();

  const visible = items.filter((i) => !i.permission || can(i.permission));
  if (visible.length === 0) return null;

  return (
    <div className="fixed bottom-6 right-6 z-50">
      <div className="relative size-14">
        {visible.map((item, i) => {
          const rad = (item.angle * Math.PI) / 180;
          const x = Math.cos(rad) * RADIUS;
          const y = Math.sin(rad) * RADIUS;
          const Icon = item.icon;
          return (
            <Button
              key={item.to}
              type="button"
              variant="ghost"
              onClick={() => { setOpen(false); navigate(item.to); }}
              className={cn(
                "absolute left-1/2 top-1/2 z-10 flex size-11 items-center justify-center rounded-full p-0 shadow-md transition-all duration-300",
                item.bg,
                item.color,
                open
                  ? "pointer-events-auto"
                  : "pointer-events-none opacity-0",
              )}
              style={{
                transform: open
                  ? `translate(calc(-50% + ${x}px), calc(-50% + ${y}px)) scale(1)`
                  : "translate(-50%, -50%) scale(0)",
                opacity: open ? 1 : 0,
                transitionDelay: open ? `${i * 60}ms` : `${(visible.length - i) * 40}ms`,
              }}
              title={item.label}
            >
              <Icon size={18} />
            </Button>
          );
        })}

        <Button
          type="button"
          variant="solid"
          color="brand"
          shape="square"
          onClick={() => setOpen((v) => !v)}
          className="absolute left-0 top-0 z-20 size-14 rounded-full shadow-lg transition-transform duration-300 active:scale-95"
        >
          <X
            size={22}
            className={cn(
              "absolute transition-transform duration-300",
              open ? "rotate-0 scale-100" : "rotate-90 scale-0",
            )}
          />
          <Plus
            size={22}
            className={cn(
              "absolute transition-transform duration-300",
              open ? "rotate-90 scale-0" : "rotate-0 scale-100",
            )}
          />
        </Button>
      </div>
    </div>
  );
}