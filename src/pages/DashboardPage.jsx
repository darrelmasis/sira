import { Database, Egg, History, Settings, Skull, User, Users } from "lucide-react";
import QuickAccessCard from "@/components/layout/QuickAccessCard";
import { usePermissions } from "@/features/auth/permissions";

export default function DashboardPage() {
  const { can } = usePermissions();

  const showAdmin = can("users.manage") || can("roles.manage") || can("catalogs.manage") || can("settings.view");

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <section className="rounded-xl border border-zinc-200/80 bg-[var(--sira-surface)] p-4 dark:border-zinc-800 sm:p-5">
        <h2 className="mb-3 text-xs font-semibold uppercase tracking-wider text-zinc-400">Registro</h2>
        <div className="grid gap-3 sm:grid-cols-2">
          <QuickAccessCard
            to="/mortalidad"
            icon={Skull}
            label="Mortalidad"
            description="Reporte diario de bajas y causas técnicas."
            accent="danger"
            layout="card"
          />
          <QuickAccessCard
            to="/produccion"
            icon={Egg}
            label="Producción"
            description="Ingreso de rendimientos y recolección total."
            accent="success"
            layout="card"
          />
        </div>
      </section>

      <section className="rounded-xl border border-zinc-200/80 bg-[var(--sira-surface)] p-4 dark:border-zinc-800 sm:p-5">
        <h2 className="mb-3 text-xs font-semibold uppercase tracking-wider text-zinc-400">Consulta</h2>
        <div className="grid gap-2 sm:grid-cols-2">
          <QuickAccessCard
            to="/historial"
            icon={History}
            label="Historial"
            description="Consultar registros anteriores."
            accent="info"
            layout="list"
          />
          <QuickAccessCard
            to="/cuenta"
            icon={User}
            label="Mi cuenta"
            description="Perfil y preferencias personales."
            accent="brand"
            layout="list"
          />
        </div>
      </section>

      {showAdmin && (
        <section className="rounded-xl border border-zinc-200/80 bg-[var(--sira-surface)] p-4 dark:border-zinc-800 sm:p-5">
          <h2 className="mb-3 text-xs font-semibold uppercase tracking-wider text-zinc-400">Administración</h2>
          <div className="grid gap-3 sm:grid-cols-3">
            {(can("users.manage") || can("roles.manage")) && (
              <QuickAccessCard
                to="/usuarios"
                icon={Users}
                label="Usuarios"
                description="Gestionar accesos, roles y permisos."
                action="Acceder"
                accent="warning"
                layout="hero"
              />
            )}
            {can("catalogs.manage") && (
              <QuickAccessCard
                to="/catalogos"
                icon={Database}
                label="Catálogos"
                description="Configuración de bases de datos maestras."
                action="Configurar"
                accent="warning"
                layout="hero"
              />
            )}
            {can("settings.view") && (
              <QuickAccessCard
                to="/sistema"
                icon={Settings}
                label="Sistema"
                description="Parámetros globales y mantenimiento."
                action="Ajustes"
                accent="brand"
                layout="hero"
              />
            )}
          </div>
        </section>
      )}
    </div>
  );
}
