import { useState } from "react";
import { NavLink, Outlet, useLocation, useNavigate } from "react-router-dom";
import {
  Badge,
  Button,
  Drawer,
  Dropdown,
  Link,
  cn,
  useBreakpoint,
} from "quickit-ui";
import {
  Database,
  History,
  LayoutGrid,
  LogOut,
  Menu,
  RefreshCcw,
  Settings,
  Skull,
  User,
  Users,
} from "lucide-react";
import ConnectionBadge from "@/components/feedback/ConnectionBadge";
import UserAvatar from "@/components/UserAvatar";
import { useAuth } from "@/features/auth/AuthContext";
import { usePermissions } from "@/features/auth/permissions";
import { useSync } from "@/features/sync/SyncProvider";
import { SiraLogo } from "@/assets/SiraLogo";

const mainNav = [
  { to: "/", label: "Inicio", icon: LayoutGrid, end: true },
  { to: "/mortalidad", label: "Mortalidad", icon: Skull },
  { to: "/historial", label: "Historial", icon: History },
];

const adminNav = [
  {
    to: "/catalogos",
    label: "Catálogos",
    icon: Database,
    permission: "catalogs.manage",
  },
  {
    to: "/usuarios",
    label: "Usuarios",
    icon: Users,
    anyPermission: ["users.manage", "roles.manage"],
  },
  {
    to: "/sistema",
    label: "Sistema",
    icon: Settings,
    permission: "settings.view",
  },
];

const pageMeta = {
  "/": {
    title: "Inicio",
    subtitle: "Accede rápidamente a las funcionalidades más importantes",
  },
  "/mortalidad": { title: "Mortalidad" },
  "/historial": { title: "Historial" },
  "/catalogos": { title: "Catálogos" },
  "/usuarios": { title: "Usuarios" },
  "/cuenta": { title: "Mi cuenta" },
  "/sistema": { title: "Configuración del sistema" },
};

function navLinkClass({ isActive }) {
  return cn(
    "flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors",
    isActive
      ? "bg-brand-500/15 text-brand-700 dark:text-brand-300"
      : "text-zinc-600 hover:bg-zinc-100 hover:text-zinc-950 dark:text-zinc-400 dark:hover:bg-zinc-800 dark:hover:text-zinc-50",
  );
}

function isNavItemVisible(item, can) {
  if (item.anyPermission?.length) {
    return item.anyPermission.some((permission) => can(permission));
  }
  return !item.permission || can(item.permission);
}

function getPageMeta(pathname) {
  if (pageMeta[pathname]) return pageMeta[pathname];
  const all = [...mainNav, ...adminNav];
  const current = all.find((item) =>
    item.end ? pathname === item.to : pathname.startsWith(item.to),
  );
  return { title: current?.label || "SIRA", subtitle: "" };
}

function NavSection({ title, items, can }) {
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
          <NavLink
            key={item.to}
            to={item.to}
            end={item.end}
            className={navLinkClass}
          >
            <Icon aria-hidden="true" className="size-4 shrink-0" />
            <span>{item.label}</span>
          </NavLink>
        );
      })}
    </div>
  );
}

function SidebarNav({ can, onNavigate }) {
  return (
    <nav className="space-y-1" onClick={onNavigate}>
      <NavSection title="Principal" items={mainNav} can={can} />
      <NavSection title="Administración" items={adminNav} can={can} />
    </nav>
  );
}

export default function AppShell() {
  const { user, logout } = useAuth();
  const { can, roleLabel } = usePermissions();
  const { summary, isSyncing, syncNow } = useSync();
  const location = useLocation();
  const navigate = useNavigate();
  const { isMobile } = useBreakpoint();
  const { title, subtitle } = getPageMeta(location.pathname);

  const [drawerOpen, setDrawerOpen] = useState(false);
  const pendingCount = summary.pending + summary.failed;

  function closeDrawer() {
    setDrawerOpen(false);
  }

  async function handleLogout() {
    await logout();
    navigate("/login", { replace: true });
  }

  return (
    <div className="min-h-screen bg-zinc-100 text-zinc-950 dark:bg-zinc-950 dark:text-zinc-50">
      <header className="sticky top-0 z-40 border-b border-zinc-200/80 bg-white/90 backdrop-blur dark:border-zinc-800 dark:bg-zinc-950/90">
        <div className="mx-auto flex h-14 max-w-7xl items-center gap-3 px-4">
          <div className="flex items-center gap-2 lg:w-56">
            {isMobile && (
              <Drawer placement="left" open={drawerOpen} onOpenChange={setDrawerOpen}>
                <Drawer.Trigger asChild>
                  <Button
                    type="button"
                    variant="ghost"
                    color="neutral"
                    shape="square"
                    aria-label="Abrir menú"
                  >
                    <Menu aria-hidden="true" className="size-5" />
                  </Button>
                </Drawer.Trigger>
                <Drawer.Content>
                  <Drawer.Header>
                    <Drawer.Title>Navegación</Drawer.Title>
                  </Drawer.Header>
                  <Drawer.Body>
                    <SidebarNav can={can} onNavigate={closeDrawer} />
                  </Drawer.Body>
                </Drawer.Content>
              </Drawer>
            )}
            <Link
              appearance="text"
              href="/"
              underline="none"
              className="bg-gradient-to-r from-brand-400 to-brand-600 bg-clip-text text-xl font-bold tracking-tight text-transparent"
            >
              <SiraLogo className="h-6 w-auto text-brand-500 dark:text-white" />
            </Link>
          </div>

          <div className="ml-auto flex items-center gap-2">
            <ConnectionBadge />

            {/* {can("sync.manual") && pendingCount == 0 && (
              <Button
                type="button"
                variant="outline"
                color="neutral"
                size="sm"
                loading={isSyncing}
                onClick={() => syncNow()}
              >
                <RefreshCcw aria-hidden="true" className="size-3.5" />
                <span className="hidden sm:inline">
                  {pendingCount} pendiente{pendingCount !== 1 ? "s" : ""}
                </span>
              </Button>
            )} */}

            <Dropdown closeOnScroll>
              <Dropdown.Trigger asChild>
                <Button
                  type="button"
                  variant="ghost"
                  color="neutral"
                  shape={isMobile ? "square" : "rounded"}
                  className="gap-2 pl-1.5 pr-2"
                >
                  <UserAvatar user={user} size="sm" />
                  <span className="hidden max-w-28 truncate text-sm sm:inline">
                    {user?.nombre || user?.username}
                  </span>
                </Button>
              </Dropdown.Trigger>
              <Dropdown.Content align="end" className="min-w-56">
                <div className="border-b border-zinc-200 px-3 py-3 dark:border-zinc-800">
                  <div className="flex items-center gap-3">
                    <UserAvatar user={user} size="md" />
                    <div className="min-w-0">
                      <div className="truncate text-sm font-semibold">
                        {user?.nombre || user?.username}
                      </div>
                      <div className="truncate text-xs text-zinc-500">
                        @{user?.username}
                      </div>
                    </div>
                  </div>
                  <Badge
                    color="neutral"
                    variant="soft"
                    className="mt-2 uppercase"
                  >
                    {roleLabel}
                  </Badge>
                </div>
                <Dropdown.Item onClick={() => navigate("/cuenta")}>
                  <User
                    aria-hidden="true"
                    className="size-4 pointer-events-none"
                  />
                  Mi cuenta
                </Dropdown.Item>
                {can("settings.view") && (
                  <Dropdown.Item onClick={() => navigate("/sistema")}>
                    <Settings aria-hidden="true" className="size-4" />
                    Configuración del sistema
                  </Dropdown.Item>
                )}
                <Dropdown.Separator />
                <Dropdown.Item variant="danger" onClick={handleLogout}>
                  <LogOut aria-hidden="true" className="size-4" />
                  Cerrar sesión
                </Dropdown.Item>
              </Dropdown.Content>
            </Dropdown>
          </div>
        </div>
      </header>

      <div className="mx-auto flex min-h-[calc(100vh-3.5rem)] max-w-7xl">
        <aside className="sticky top-14.5 hidden h-[calc(100vh-3.5rem)] w-56 shrink-0 overflow-y-auto border-r border-zinc-200 px-3 py-5 dark:border-zinc-800 lg:block">
          <SidebarNav can={can} />
        </aside>

        <main className="min-w-0 flex-1 px-4 py-6">
          <div className="mb-6">
            <h1 className="text-2xl font-semibold tracking-tight">{title}</h1>
            {subtitle && (
              <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">
                {subtitle}
              </p>
            )}
          </div>
          <Outlet />
        </main>
      </div>
    </div>
  );
}
