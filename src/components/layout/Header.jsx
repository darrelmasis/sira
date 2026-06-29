import { useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  Badge,
  Button,
  Drawer,
  Dropdown,
  Link,
  useBreakpoint,
  Show,
} from "quickit-ui";
import { LogOut, Menu, RefreshCcw, Settings, User } from "lucide-react";
import ConnectionBadge from "@/components/feedback/ConnectionBadge";
import UserAvatar from "@/components/UserAvatar";
import { SidebarNav } from "@/components/layout/navigation";
import { SiraLogo } from "@/assets/SiraLogo";

export default function Header({ user, can, roleLabel, logout, summary }) {
  const navigate = useNavigate();
  const { isMobile } = useBreakpoint();
  const [drawerOpen, setDrawerOpen] = useState(false);

  function closeDrawer() {
    setDrawerOpen(false);
  }

  async function handleLogout() {
    await logout();
    navigate("/login", { replace: true });
  }

  return (
    <header className="sticky top-0 z-40 border-b border-zinc-200/80 bg-white/90 backdrop-blur dark:border-zinc-800 dark:bg-zinc-950/90">
      <div className="mx-auto flex h-14 max-w-7xl items-center gap-3 px-4">
        <div className="flex items-center gap-2 lg:w-56">
          {isMobile && (
            <Drawer
              placement="left"
              open={drawerOpen}
              onOpenChange={setDrawerOpen}
            >
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
          <Dropdown closeOnScroll>
            <Dropdown.Trigger asChild>
              <Button
                type="button"
                variant="ghost"
                color="neutral"
                shape={isMobile ? "square" : "rounded"}
              >
                <UserAvatar user={user} size="sm" />
                <Show when={!isMobile}>
                  <span className="hidden max-w-28 truncate text-sm sm:inline">
                    {user?.nombre || user?.username}
                  </span>
                </Show>
              </Button>
            </Dropdown.Trigger>
            <Dropdown.Content align="end" className="min-w-56">
              <div className="border-b border-zinc-200 px-3 py-3 dark:border-zinc-800">
                <div className="flex items-center gap-3">
                  <UserAvatar user={user} size="lg" />
                  <div className="min-w-0">
                    <div className="truncate text-sm font-semibold">
                      {user?.nombre || user?.username}
                    </div>
                    <div className="truncate text-xs text-zinc-500">
                      @{user?.username}
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
              </div>
              <Dropdown.Item onClick={() => navigate("/cuenta")}>
                <User aria-hidden="true" className="size-4" />
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
  );
}
