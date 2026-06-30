import { NavLink } from "react-router-dom";
import { cn } from "quickit-ui";
import { Egg, FileSpreadsheet, Layers, LayoutGrid, Skull } from "lucide-react";

export const primaryNav = [
  { to: "/", label: "Inicio", icon: LayoutGrid, end: true },
  { to: "/reportes", label: "Reportes", icon: FileSpreadsheet },
];

export const captureNav = [
  { to: "/mortalidad", label: "Mortalidad", icon: Skull },
  { to: "/produccion", label: "Producción", icon: Egg },
  { to: "/capitalizacion", label: "Capitalización", icon: Layers, permission: "transfers.create" },
];

export const queriesNav = [];

export const adminNav = [];

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

export function NavSection({ title, items, can }) {
  const visible = items.filter((item) => isNavItemVisible(item, can));
  if (visible.length === 0) return null;

  return (
    <div className="space-y-1">
      {title && (
        <div className="px-3 pb-1 pt-3 text-[11px] font-semibold uppercase tracking-wider text-zinc-400">
          {title}
        </div>
      )}
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
  );
}

export function SidebarNav({ can, onNavigate }) {
  const sections = [
    { title: "Principal", items: primaryNav },
    { title: "Captura de datos", items: captureNav },
    { title: "Consultas", items: queriesNav },
    { title: "Administración", items: adminNav },
  ].filter((s) => s.items.some((item) => isNavItemVisible(item, can)));

  if (sections.length === 0) return null;

  return (
    <nav className="space-y-1" onClick={onNavigate}>
      {sections.map((s) => (
        <NavSection key={s.title} title={s.title} items={s.items} can={can} />
      ))}
    </nav>
  );
}
