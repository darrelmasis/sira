import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button, Show, cn, useBreakpoint } from "quickit-ui";
import { Egg, Layers, Plus, Skull, X } from "lucide-react";
import { usePermissions } from "@/features/auth/permissions";

const RADIUS = 84;

const items = [
  { to: "/mortalidad", label: "Mortalidad", icon: Skull, color: "bg-amber-500 hover:bg-amber-400 active:bg-amber-600", angle: 180 },
  { to: "/produccion", label: "Producción", icon: Egg, color: "bg-emerald-500 hover:bg-emerald-400 active:bg-emerald-600", angle: 225 },
  { to: "/capitalizacion", label: "Capitalización", icon: Layers, color: "bg-sky-500 hover:bg-sky-400 active:bg-sky-600", angle: 270, permission: "transfers.create" },
];

export default function FloatingQuickAccess() {
  const [open, setOpen] = useState(false);
  const navigate = useNavigate();
  const { can } = usePermissions();
  const { isMobile } = useBreakpoint();

  const visible = items.filter((i) => !i.permission || can(i.permission));
  if (visible.length === 0) return null;

  function go(item) {
    setOpen(false);
    navigate(item.to);
  }

  return (
    <>
      <Show when={isMobile}>
        <div className="fixed bottom-6 right-6 z-50">
          <div className="relative size-14">
            {visible.map((item, i) => {
              const rad = (item.angle * Math.PI) / 180;
              const x = Math.cos(rad) * RADIUS;
              const y = Math.sin(rad) * RADIUS;
              const Icon = item.icon;
              const openDelay = (visible.length - i) * 60;
              const closeDelay = (i + 1) * 40;
              return (
                <button
                  key={item.to}
                  type="button"
                  onClick={() => go(item)}
                  className={cn(
                    "absolute left-1/2 top-1/2 z-10 flex h-12 w-12 items-center justify-center rounded-full text-white shadow-lg",
                    item.color,
                  )}
                  style={{
                    transform: open
                      ? `translate(calc(-50% + ${x}px), calc(-50% + ${y}px)) scale(1)`
                      : "translate(-50%, -50%) scale(0)",
                    transition: `transform 0.35s cubic-bezier(.34,1.56,.64,1) ${open ? openDelay : closeDelay}ms, opacity 0.25s ease ${open ? openDelay : closeDelay}ms`,
                    opacity: open ? 1 : 0,
                    pointerEvents: open ? "auto" : "none",
                  }}
                  title={item.label}
                >
                  <Icon size={20} strokeWidth={2.5} />
                </button>
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
                <X size={24} className={cn("absolute transition-all duration-300", open ? "scale-100 opacity-100 rotate-0" : "scale-0 opacity-0 rotate-90")} />
                <Plus size={24} className={cn("absolute transition-all duration-300", open ? "scale-0 opacity-0 rotate-90" : "scale-100 opacity-100 rotate-0")} />
              </span>
            </Button>
          </div>
        </div>
      </Show>

      <Show when={!isMobile}>
        <div className="fixed bottom-6 left-1/2 z-50 -translate-x-1/2">
          <div className="flex items-center gap-1.5 rounded-full border border-zinc-200/80 bg-white/90 px-2 py-1.5 shadow-lg backdrop-blur">
            {visible.map((item) => {
              const Icon = item.icon;
              return (
                <button
                  key={item.to}
                  type="button"
                  onClick={() => go(item)}
                  className={cn(
                    "flex items-center gap-2 rounded-full px-3.5 py-2 text-sm font-medium text-white shadow-xs transition-all duration-200 active:scale-95",
                    item.color,
                  )}
                >
                  <Icon size={16} strokeWidth={2.5} />
                  <span className="text-xs">{item.label}</span>
                </button>
              );
            })}
          </div>
        </div>
      </Show>
    </>
  );
}