import { ClipboardList, Database, History, Settings, Skull, User, Users } from "lucide-react";
import { Alert, Badge, FormDescription } from "quickit-ui";
import QuickAccessCard from "@/components/layout/QuickAccessCard";
import PageSection from "@/components/layout/PageSection";
import StatCard from "@/components/layout/StatCard";
import { usePermissions } from "@/features/auth/permissions";
import { useFarmAccess } from "@/features/auth/farmAccess";
import { useSync } from "@/features/sync/SyncProvider";

const statusLabels = {
  pending: { label: "Pendiente", color: "warning" },
  syncing: { label: "Sincronizando", color: "info" },
  synced: { label: "Sincronizado", color: "success" },
  failed: { label: "Fallido", color: "danger" },
};

export default function DashboardPage() {
  const { can } = usePermissions();
  const { summary, isOnline } = useSync();
  const { hasGlobalFarmAccess, assignedFarmIds } = useFarmAccess();

  return (
    <div className="space-y-6">
      <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {Object.entries(statusLabels).map(([key, meta]) => (
          <StatCard key={key} label={meta.label} value={summary[key] ?? 0} />
        ))}
      </section>

      {!isOnline && (
        <Alert
          color="warning"
          title="Sin conexión"
          description="Los registros se guardan localmente y se sincronizarán automáticamente al reconectar."
        />
      )}

      {!hasGlobalFarmAccess && assignedFarmIds.length > 0 && (
        <PageSection>
          <div className="flex items-center gap-2">
            <Badge color="brand" variant="soft">
              {assignedFarmIds.length} granja{assignedFarmIds.length !== 1 ? "s" : ""} asignada
              {assignedFarmIds.length !== 1 ? "s" : ""}
            </Badge>
            <FormDescription>Solo verás y registrarás datos de tus granjas autorizadas.</FormDescription>
          </div>
        </PageSection>
      )}

      <PageSection
        title="Accesos rápidos"
        description="Captura y consulta de actividades de campo"
      >
        <div className="mb-4 flex justify-end">
          <ClipboardList aria-hidden="true" className="size-5 text-zinc-400" />
        </div>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          <QuickAccessCard to="/mortalidad" icon={Skull} label="Mortalidad" description="Registrar aves muertas" />
          <QuickAccessCard to="/historial" icon={History} label="Historial" description="Ver registros capturados" accent="info" />
          {(can("users.manage") || can("roles.manage")) && (
            <QuickAccessCard to="/usuarios" icon={Users} label="Usuarios" description="Cuentas y permisos por rol" accent="warning" />
          )}
          {can("catalogs.manage") && (
            <QuickAccessCard to="/catalogos" icon={Database} label="Catálogos" description="Granjas, galpones y lotes" accent="warning" />
          )}
          <QuickAccessCard to="/cuenta" icon={User} label="Mi cuenta" description="Perfil y contraseña" />
          {can("settings.view") && (
            <QuickAccessCard to="/sistema" icon={Settings} label="Sistema" description="Tema, sync y catálogos" />
          )}
        </div>
      </PageSection>

      {summary.pending + summary.failed > 0 && (
        <PageSection>
          <div className="flex items-center gap-3">
            <Badge color="warning" variant="soft">
              {summary.pending + summary.failed} en cola
            </Badge>
            <FormDescription>
              {isOnline ? "Se sincronizarán automáticamente con el servidor." : "Esperando conexión para sincronizar."}
            </FormDescription>
          </div>
        </PageSection>
      )}
    </div>
  );
}
