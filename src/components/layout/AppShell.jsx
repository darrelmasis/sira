import { Outlet, useLocation } from "react-router-dom";
import { useBreakpoint } from "quickit-ui";
import Header from "@/components/layout/Header";
import Sidebar from "@/components/layout/Sidebar";
import { getPageMeta } from "@/components/layout/navigation";
import { useAuth } from "@/features/auth/AuthContext";
import { usePermissions } from "@/features/auth/permissions";
import { useSync } from "@/features/sync/SyncProvider";

export default function AppShell() {
  const { user, logout } = useAuth();
  const { can, roleLabel } = usePermissions();
  const { summary } = useSync();
  const { isMobile } = useBreakpoint();
  const location = useLocation();
  const { title, subtitle } = getPageMeta(location.pathname);

  return (
    <div className="min-h-screen bg-zinc-100 text-zinc-950 dark:bg-zinc-950 dark:text-zinc-50">
      <Header user={user} can={can} roleLabel={roleLabel} logout={logout} summary={summary} />

      <div className="mx-auto flex min-h-[calc(100vh-3.5rem)] max-w-7xl">
        {!isMobile && <Sidebar can={can} />}

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
