import { useEffect, useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { Alert, Button, Badge, FormControl, Label, Select, toast } from "quickit-ui";
import { MapPin, ArrowRightLeft, ShieldAlert, RotateCw } from "lucide-react";
import { usePermissions } from "@/features/auth/permissions";
import { useFarmAccess } from "@/features/auth/farmAccess";
import { getLocalCatalogs } from "@/features/catalogs/catalogStore";
import { api } from "@/lib/api";
import { useAuth } from "@/features/auth/AuthContext";
import PageTable from "@/components/data/PageTable";

const CAPITALIZATION_MIN_WEEKS = 25;

export default function InventarioPage() {
  const navigate = useNavigate();
  const { accessToken } = useAuth();
  const { can } = usePermissions();
  const { filterCatalogs, hasAssignedFarms } = useFarmAccess();

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [farms, setFarms] = useState([]);
  const [selectedFarmId, setSelectedFarmId] = useState("");
  const [inventory, setInventory] = useState([]);

  // Load farms catalog
  useEffect(() => {
    getLocalCatalogs()
      .then((cats) => {
        const scopedFarms = filterCatalogs(cats).farms || [];
        setFarms(scopedFarms);
        if (scopedFarms.length === 1) {
          setSelectedFarmId(scopedFarms[0].id);
        }
      })
      .catch(() => toast({ title: "Error al cargar granjas", kind: "error" }));
  }, []);

  // Fetch inventory
  async function fetchInventory(silent = false) {
    if (!silent) setLoading(true);
    else setRefreshing(true);

    try {
      const url = selectedFarmId ? `inventario?granjaId=${selectedFarmId}` : "inventario";
      const res = await api(url, { method: "GET", accessToken });
      if (res.success && Array.isArray(res.data)) {
        setInventory(res.data);
      } else {
        throw new Error(res.message || "Error al obtener inventario");
      }
    } catch (err) {
      toast({ title: err.message, kind: "error" });
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }

  useEffect(() => {
    if (can("inventory.view")) {
      fetchInventory();
    }
  }, [selectedFarmId]);

  const columns = useMemo(
    () => [
      {
        key: "granja",
        header: "Granja",
        render: (row) => row.granja?.nombre || "—",
      },
      {
        key: "lote",
        header: "Lote",
        render: (row) => <span className="font-semibold">{row.lote?.codigo || "—"}</span>,
      },
      {
        key: "galpon",
        header: "Galpón",
        render: (row) => row.galpon?.nombre || "—",
      },
      {
        key: "tipo",
        header: "Fase Alojamiento",
        render: (row) => (
          <Badge color={row.tipo === "postura" ? "emerald" : "brand"} variant="soft" className="capitalize">
            {row.tipo}
          </Badge>
        ),
      },
      {
        key: "edad",
        header: "Edad",
        align: "right",
        render: (row) => <span className="tabular-nums font-medium">{row.edadSemanas} sem</span>,
      },
      {
        key: "hembras",
        header: "Hembras Vivas",
        align: "right",
        render: (row) => (
          <div className="flex flex-col items-end">
            <span className="tabular-nums font-bold text-zinc-950 dark:text-zinc-50">{row.hembras}</span>
            <span className="text-xxs text-zinc-400 dark:text-zinc-500 tabular-nums">Inic: {row.detalles?.inicialHembras}</span>
          </div>
        ),
      },
      {
        key: "machos",
        header: "Machos Vivos",
        align: "right",
        render: (row) => (
          <div className="flex flex-col items-end">
            <span className="tabular-nums font-bold text-zinc-950 dark:text-zinc-50">{row.machos}</span>
            <span className="text-xxs text-zinc-400 dark:text-zinc-500 tabular-nums">Inic: {row.detalles?.inicialMachos}</span>
          </div>
        ),
      },
      {
        key: "total",
        header: "Total Vivas",
        align: "right",
        render: (row) => <span className="tabular-nums font-extrabold text-brand-600 dark:text-brand-400">{row.hembras + row.machos}</span>,
      },
      {
        key: "acciones",
        header: "",
        align: "right",
        render: (row) => {
          if (!can("transfers.create")) return null;

          const isLevante = row.tipo === "levante";
          const isCapitalizable = isLevante && row.edadSemanas >= CAPITALIZATION_MIN_WEEKS;

          return (
            <div className="flex items-center justify-end gap-2">
              <Button
                size="sm"
                variant="ghost"
                onClick={() =>
                  navigate(`/traslados?tipo=traslado&loteId=${row.lote?.id}&origenId=${row.galpon?.id}`)
                }
              >
                <ArrowRightLeft className="mr-1 size-3.5" />
                Trasladar
              </Button>
              {isLevante && (
                <Button
                  size="sm"
                  color={isCapitalizable ? "brand" : "neutral"}
                  variant={isCapitalizable ? "solid" : "outline"}
                  disabled={!isCapitalizable}
                  title={
                    isCapitalizable
                      ? undefined
                      : `Requiere ${CAPITALIZATION_MIN_WEEKS} semanas de edad (actual: ${row.edadSemanas})`
                  }
                  onClick={() =>
                    navigate(`/traslados?tipo=capitalizacion&loteId=${row.lote?.id}&origenId=${row.galpon?.id}`)
                  }
                >
                  Capitalizar
                </Button>
              )}
            </div>
          );
        },
      },
    ],
    [navigate, can]
  );

  if (!can("inventory.view")) {
    return (
      <Alert
        color="danger"
        title="Acceso denegado"
        description="No tienes permisos para visualizar el inventario de aves."
        icon={ShieldAlert}
      />
    );
  }

  if (!hasAssignedFarms) {
    return (
      <Alert
        color="warning"
        title="Sin granjas asignadas"
        description="Tu usuario no tiene granjas asignadas. Comunícate con soporte para habilitar tu acceso."
      />
    );
  }

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-zinc-950 dark:text-zinc-50">Inventario de Aves</h1>
          <p className="text-sm text-zinc-500 dark:text-zinc-400">Existencias de aves vivas estimadas en tiempo real por alojamiento activo.</p>
        </div>

        <div className="flex items-center gap-2">
          {farms.length > 1 && (
            <FormControl controlId="farmFilter" className="w-56">
              <Select
                value={selectedFarmId}
                onValueChange={setSelectedFarmId}
              >
                <option value="">Todas las granjas</option>
                {farms.map((f) => (
                  <option key={f.id} value={f.id}>{f.nombre}</option>
                ))}
              </Select>
            </FormControl>
          )}

          <Button
            variant="ghost"
            onClick={() => fetchInventory(true)}
            disabled={refreshing || loading}
          >
            <RotateCw className={`size-4 ${refreshing ? "animate-spin" : ""}`} />
          </Button>

          {can("transfers.create") && (
            <Button
              color="brand"
              onClick={() => navigate("/traslados")}
            >
              <ArrowRightLeft className="mr-2 size-4" />
              Nuevo Traslado
            </Button>
          )}
        </div>
      </div>

      <PageTable
        columns={columns}
        data={inventory}
        rowKey={(row) => row.alojamientoId}
        loading={loading}
        emptyIcon={MapPin}
        emptyTitle="Sin existencias activas"
        emptyDescription="No se encontraron alojamientos activos de aves para la granja seleccionada."
      />
    </div>
  );
}
