import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button, cn } from "quickit-ui";
import { Egg, Layers, Plus, Skull, X } from "lucide-react";
import { usePermissions } from "@/features/auth/permissions";

const ITEMS = [
  { to: "/mortalidad", label: "Mortalidad", icon: Skull, color: "text-amber-600 dark:text-amber-400", bg: "bg-amber-100 dark:bg-amber-900", angle: 180 },
  { to: "/produccion", label: "Producción", icon: Egg, color: "text-emerald-600 dark:text-emerald-400", bg: "bg-emerald-100 dark:bg-emerald-900", angle: 225 },
  { to: "/capitalizacion", label: "Capitalización", icon: Layers, color: "text-sky-600 dark:text-sky-400", bg: "bg-sky-100 dark:bg-sky-900", angle: 270, permission: "transfers.create" },
];

export default function FloatingQuickAccess() {
  const [open, setOpen] = useState(false);
  const navigate = useNavigate();
  const { can } = usePermissions();

  const visible = ITEMS.filter((i) => !i.permission || can(i.permission));
  if (visible.length === 0) return null;

  return (
    <div className="fixed bottom-6 right-6 z-50">
      <div className="relative size-14">
        {visible.map((item, i) => {
          const Icon = item.icon;
          return (
            <Button
              key={item.to}
              type="button"
              variant="ghost"
              onClick={() => { setOpen(false); navigate(item.to); }}
              className={cn(
                "absolute left-1/2 top-1/2 z-10 flex size-12 items-center justify-center rounded-full p-0 shadow-md",
                item.bg,
                item.color,
              )}
              title={item.label}
              style={{
                transform: open
                  ? `translate(-50%, -50%) rotate(${item.angle}deg) translateX(-76px) rotate(-${item.angle}deg)`
                  : "translate(-50%, -50%) rotate(0deg) translateX(0px) rotate(0deg)",
                transition: `transform 0.4s cubic-bezier(.34,1.56,.64,1) ${i * 70}ms, opacity 0.3s ease ${i * 70}ms`,
                opacity: open ? 1 : 0,
              }}
            >
              <Icon size={20} />
            </Button>
          );
        })}

        <Button
          type="button"
          variant="solid"
          color="brand"
          shape="square"
          onClick={() => setOpen((v) => !v)}
          className="absolute left-0 top-0 z-20 size-14 rounded-full shadow-lg transition-transform duration-200 active:scale-90"
        >
          <span className="relative flex size-full items-center justify-center">
            <X
              size={24}
              className={cn(
                "absolute transition-all duration-300",
                open
                  ? "rotate-0 scale-100 opacity-100"
                  : "rotate-90 scale-0 opacity-0",
              )}
            />
            <Plus
              size={24}
              className={cn(
                "absolute transition-all duration-300",
                open
                  ? "rotate-90 scale-0 opacity-0"
                  : "rotate-0 scale-100 opacity-100",
              )}
            />
          </span>
        </Button>
      </div>
    </div>
  );
}