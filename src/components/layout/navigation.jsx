import { useState } from "react";
import { NavLink } from "react-router-dom";
import { cn } from "quickit-ui";
import { ChevronDown, ChevronRight, ClipboardList, Database, Egg, FileSpreadsheet, History, Layers, LayoutGrid, Settings, Skull, Users } from "lucide-react";

export const primaryNav = [
  { to: "/", label: "Inicio", icon: LayoutGrid, end: true },
  { to: "/inventario", label: "Inventario", icon: ClipboardList, permission: "inventory.view" },
];

export const captureNav = [
  { to: "/mortalidad", label: "Mortalidad", icon: Skull },
  { to: "/produccion", label: "Producción", icon: Egg },
  { to: "/capitalizacion", label: "Capitalización", icon: Layers, permission: "transfers.create" },
];

export const queriesNav = [
  { to: "/historial", label: "Historial", icon: History },
  { to: "/reportes", label: "Reportes", icon: FileSpreadsheet },
];

export const adminNav = [
  { to: "/catalogos", label: "Catálogos", icon: Database, permission: "catalogs.manage" },
  { to: "/usuarios", label: "Usuarios", icon: Users, anyPermission: ["users.manage", "roles.manage"] },
  { to: "/sistema", label: "Sistema", icon: Settings, permission: "settings.view" },
];

export const pageMeta = {
  "/": { title: "Inicio", subtitle: "Accede rápidamente a las funcionalidades más importantes" },
  "/inventario": { title: "Inventario", subtitle: "Existencias estimadas de aves en tiempo real" },
  "/mortalidad": { title: "Mortalidad" },
  "/produccion": { title: "Producción" },
  "/capitalizacion": { title: "Capitalización", subtitle: "Paso de levante a postura" },
  "/historial": { title: "Historial" },
  "/reportes": { title: "Reportes", subtitle: "Exporta datos de mortalidad y producción a CSV o Excel" },
  "/catalogos": { title: "Catálogos" },
  "/usuarios": { title: "Usuarios" },
  "/cuenta": { title: "Mi cuenta" },
  "/sistema": { title: "Configuración del sistema" },
};

export function navLinkClass({ isActive }) {
  return cn(
    "flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors",
    isActive
      ? "bg-brand-500/15 text-brand-700 dark:text-brand-300"
      : "text-zinc-600 hover:bg-zinc-100 hover:text-zinc-950 dark:text-zinc-400 dark:hover:bg-zinc-800 dark:hover:text-zinc-50",
  );
}

export function isNavItemVisible(item, can) {
  if (item.anyPermission?.length) {
    return item.anyPermission.some((permission) => can(permission));
  }
  return !item.permission || can(item.permission);
}

export function getPageMeta(pathname) {
  if (pageMeta[pathname]) return pageMeta[pathname];
  const all = [...primaryNav, ...captureNav, ...queriesNav, ...adminNav];
  const current = all.find((item) =>
    item.end ? pathname === item.to : pathname.startsWith(item.to),
  );
  return { title: current?.label || "SIRA", subtitle: "" };
}

export function NavSection({ title, items, can, defaultOpen }) {
  const visible = items.filter((item) => isNavItemVisible(item, can));
  const [open, setOpen] = useState(defaultOpen ?? false);
  if (visible.length === 0) return null;

  return (
    <div>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className={cn(
          "flex w-full items-center gap-2 rounded-lg px-3 py-2 text-xs font-semibold uppercase tracking-wider transition-colors",
          open
            ? "text-brand-600 dark:text-brand-400"
            : "text-zinc-400 hover:bg-zinc-100 hover:text-zinc-600 dark:hover:bg-zinc-800 dark:hover:text-zinc-300",
        )}
      >
        {open ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
        <span>{title}</span>
        <span className="ml-auto text-[10px] font-normal text-zinc-300 dark:text-zinc-600">{visible.length}</span>
      </button>
      {open && (
        <div className="mt-0.5 space-y-0.5 border-l-2 border-brand-200 pl-2 dark:border-brand-900">
          {visible.map((item) => {
            const Icon = item.icon;
            return (
              <NavLink key={item.to} to={item.to} end={item.end} className={navLinkClass}>
                <Icon aria-hidden="true" className="size-4 shrink-0" />
                <span>{item.label}</span>
              </NavLink>
            );
          })}
        </div>
      )}
    </div>
  );
}

export function SidebarNav({ can, onNavigate }) {
  return (
    <nav className="space-y-1" onClick={onNavigate}>
      <NavSection title="Principal" items={primaryNav} can={can} defaultOpen={true} />
      <NavSection title="Captura de datos" items={captureNav} can={can} />
      <NavSection title="Consultas" items={queriesNav} can={can} />
      <NavSection title="Administración" items={adminNav} can={can} />
    </nav>
  );
}