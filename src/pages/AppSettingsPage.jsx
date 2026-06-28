import { useEffect, useState } from "react";
import { Alert, Button, FormDescription, Skeleton, toast, useQuickitThemeController } from "quickit-ui";
import { Database, Monitor, Moon, Sun, UploadCloud } from "lucide-react";
import PageSection from "@/components/layout/PageSection";
import { useConfirmDialog } from "@/components/feedback/useConfirmDialog";
import { useAuth } from "@/features/auth/AuthContext";
import { usePermissions } from "@/features/auth/permissions";
import { getCatalogSummary, refreshCatalogs } from "@/features/catalogs/catalogStore";
import { clearFailedRecords } from "@/features/sync/syncQueue";
import { useSync } from "@/features/sync/SyncProvider";
import { formatDateTime } from "@/lib/datetime";

const themeOptions = [
  { value: "system", label: "Sistema", icon: Monitor },
  { value: "light", label: "Claro", icon: Sun },
  { value: "dark", label: "Oscuro", icon: Moon },
];

export default function AppSettingsPage() {
  const { accessToken } = useAuth();
  const { can } = usePermissions();
  const { theme, setTheme } = useQuickitThemeController();
  const { summary, isSyncing, isOnline, lastSyncAt, syncNow, refreshSummary } = useSync();
  const [catalogSummary, setCatalogSummary] = useState(null);
  const [refreshingCatalogs, setRefreshingCatalogs] = useState(false);
  const [clearing, setClearing] = useState(false);
  const { confirm, ConfirmDialogHost } = useConfirmDialog();

  useEffect(() => {
    getCatalogSummary().then(setCatalogSummary);
  }, []);

  async function handleRefreshCatalogs() {
    setRefreshingCatalogs(true);
    try {
      const result = await refreshCatalogs(accessToken);
      setCatalogSummary(result);
      toast({ title: "Catálogos actualizados", kind: "success" });
    } catch (error) {
      toast({ title: error.message, kind: "error" });
    } finally {
      setRefreshingCatalogs(false);
    }
  }

  async function handleClearFailed() {
    const confirmed = await confirm({
      title: "Limpiar registros fallidos",
      description: "Se eliminarán de la cola local todos los registros marcados como fallidos.",
      confirmLabel: "Limpiar",
      confirmColor: "danger",
    });
    if (!confirmed) return;

    setClearing(true);
    try {
      await clearFailedRecords();
      await refreshSummary();
      toast({ title: "Registros fallidos eliminados", kind: "success" });
    } finally {
      setClearing(false);
    }
  }

  return (
    <div className="mx-auto max-w-2xl space-y-4">
      <PageSection title="Apariencia">
        <div className="grid grid-cols-3 gap-2">
          {themeOptions.map((option) => {
            const Icon = option.icon;
            return (
              <Button
                key={option.value}
                type="button"
                variant={theme === option.value ? "solid" : "outline"}
                color="neutral"
                onClick={() => setTheme(option.value)}
              >
                <Icon aria-hidden="true" className="size-4" />
                {option.label}
              </Button>
            );
          })}
        </div>
      </PageSection>

      <PageSection title="Sincronización">
        <Alert
          color="info"
          title="Modo offline-first"
          description="Los registros se guardan localmente y se envían al servidor cuando hay conexión."
        />

        <div className="mt-4 grid gap-2 sm:grid-cols-2">
          <FormDescription>Estado: {isOnline ? "En línea" : "Sin conexión"}</FormDescription>
          <FormDescription>Pendientes: {summary.pending + summary.failed}</FormDescription>
          <FormDescription>Sincronizados: {summary.synced}</FormDescription>
          <FormDescription>Última sync: {formatDateTime(lastSyncAt)}</FormDescription>
        </div>

        {can("sync.manual") && (
          <div className="mt-4 flex flex-wrap gap-2">
            <Button type="button" onClick={() => syncNow()} loading={isSyncing} loadingText="Sincronizando..." disabled={!isOnline}>
              <UploadCloud aria-hidden="true" className="size-4" />
              Sincronizar ahora
            </Button>
            <Button
              type="button"
              variant="outline"
              color="neutral"
              onClick={handleRefreshCatalogs}
              loading={refreshingCatalogs}
              disabled={!isOnline}
            >
              <Database aria-hidden="true" className="size-4" />
              Actualizar catálogos
            </Button>
            {summary.failed > 0 && (
              <Button type="button" variant="outline" color="danger" onClick={handleClearFailed} loading={clearing}>
                Limpiar fallidos
              </Button>
            )}
          </div>
        )}
      </PageSection>

      {catalogSummary ? (
        <PageSection title="Datos locales">
          <div className="grid gap-2 sm:grid-cols-2">
            <FormDescription>Granjas: {catalogSummary.farms}</FormDescription>
            <FormDescription>Galpones: {catalogSummary.sheds}</FormDescription>
            <FormDescription>Lotes: {catalogSummary.lots}</FormDescription>
            <FormDescription>Alojamientos: {catalogSummary.placements}</FormDescription>
          </div>
          {catalogSummary.lastRefresh && (
            <FormDescription className="mt-2">
              Catálogos: {formatDateTime(catalogSummary.lastRefresh)}
            </FormDescription>
          )}
        </PageSection>
      ) : (
        <PageSection>
          <Skeleton variant="line" className="h-5 w-32" />
          <div className="mt-3 grid gap-3 sm:grid-cols-2">
            {Array.from({ length: 4 }).map((_, index) => (
              <Skeleton key={index} variant="line" className="h-4 w-28" />
            ))}
          </div>
        </PageSection>
      )}

      <ConfirmDialogHost />
    </div>
  );
}
