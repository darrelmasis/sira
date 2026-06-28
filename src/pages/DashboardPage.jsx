import { Database, Egg, History, Settings, Skull, User, Users, ClipboardList, ArrowRightLeft } from "lucide-react";
import QuickAccessCard from "@/components/layout/QuickAccessCard";
import { usePermissions } from "@/features/auth/permissions";

export default function DashboardPage() {
  const { can } = usePermissions();

  const showAdmin = can("users.manage") || can("roles.manage") || can("catalogs.manage") || can("settings.view");

  const showTraslados = can("transfers.create");
  const showInventario = can("inventory.view");

  return (
    <div className="mx-auto max-w-4xl space-y-8">
      <div className="space-y-3">
        <h2 className="flex items-center gap-2 text-xs font-semibold uppercase tracking-widest text-brand-600 dark:text-brand-400">
          <span className="h-px flex-1 bg-brand-200 dark:bg-brand-900" />
          Registro
          <span className="h-px flex-1 bg-brand-200 dark:bg-brand-900" />
        </h2>
        <div className={`grid gap-3 sm:grid-cols-${showTraslados ? "3" : "2"}`}>
          <QuickAccessCard
            to="/mortalidad"
            icon={Skull}
            label="Mortalidad"
            description="Registra la baja de aves y especifica las causas."
          />
          <QuickAccessCard
            to="/produccion"
            icon={Egg}
            label="Producción"
            description="Ingresa el volumen de huevo recolectado por clasificación."
          />
          {showTraslados && (
            <QuickAccessCard
              to="/traslados"
              icon={ArrowRightLeft}
              label="Traslados"
              description="Registra movimientos de aves y capitalizaciones."
            />
          )}
        </div>
      </div>

      <div className="space-y-3">
        <h2 className="flex items-center gap-2 text-xs font-semibold uppercase tracking-widest text-zinc-400">
          <span className="h-px flex-1 bg-zinc-200 dark:bg-zinc-800" />
          Consulta
          <span className="h-px flex-1 bg-zinc-200 dark:bg-zinc-800" />
        </h2>
        <div className={`grid gap-3 sm:grid-cols-${showInventario ? "3" : "2"}`}>
          <QuickAccessCard
            to="/historial"
            icon={History}
            label="Historial"
            description="Revisa registros anteriores, edítalos o expórtalos."
            section="consulta"
          />
          {showInventario && (
            <QuickAccessCard
              to="/inventario"
              icon={ClipboardList}
              label="Inventario"
              description="Visualiza existencias estimadas y edades de lotes en tiempo real."
              section="consulta"
            />
          )}
          <QuickAccessCard
            to="/cuenta"
            icon={User}
            label="Mi cuenta"
            description="Administra tu perfil, avatar y preferencias."
            section="consulta"
          />
        </div>
      </div>

      {showAdmin && (
        <div className="space-y-3">
          <h2 className="flex items-center gap-2 text-xs font-semibold uppercase tracking-widest text-zinc-400">
            <span className="h-px flex-1 bg-zinc-200 dark:bg-zinc-800" />
            Administración
            <span className="h-px flex-1 bg-zinc-200 dark:bg-zinc-800" />
          </h2>
          <div className="grid gap-3 sm:grid-cols-3">
            {(can("users.manage") || can("roles.manage")) && (
              <QuickAccessCard
                to="/usuarios"
                icon={Users}
                label="Usuarios"
                description="Gestiona accesos, roles y permisos del personal."
                section="admin"
              />
            )}
            {can("catalogs.manage") && (
              <QuickAccessCard
                to="/catalogos"
                icon={Database}
                label="Catálogos"
                description="Configura granjas, galpones, lotes y razas."
                section="admin"
              />
            )}
            {can("settings.view") && (
              <QuickAccessCard
                to="/sistema"
                icon={Settings}
                label="Sistema"
                description="Ajusta tema, sincronización y datos locales."
                section="admin"
              />
            )}
          </div>
        </div>
      )}
    </div>
  );
}
