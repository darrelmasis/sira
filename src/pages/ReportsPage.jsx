import { useEffect, useMemo, useState } from "react";
import {
  Button,
  DatePicker,
  Select,
  toast,
} from "quickit-ui";
import { FileSpreadsheet, FileText, Play, History, SearchX, Download, Mars, Venus } from "lucide-react";
import * as XLSX from "xlsx";
import PageTable from "@/components/data/PageTable";
import ListEmptyState from "@/components/feedback/ListEmptyState";
import { useFarmAccess } from "@/features/auth/farmAccess";
import { usePermissions } from "@/features/auth/permissions";
import { getLocalCatalogs } from "@/features/catalogs/catalogStore";
import { getSyncQueue } from "@/features/sync/syncQueue";
import { api } from "@/lib/api";
import { useAuth } from "@/features/auth/AuthContext";
import { formatDateShort, formatDateInput, extractDateOnly, getAgeWeeks } from "@/lib/datetime";
import { buildNameMap, normalizeId } from "@/lib/catalog-utils";
import { EGG_CATEGORIES } from "@/lib/egg-categories";

const PREVIEW_LIMIT = 20;

function getRecordEdad(record, catalogs) {
  const p = record.payload;
  if (p.edad != null && p.edad !== "" && Number.isFinite(Number(p.edad))) {
    return Number(p.edad);
  }
  const fecha = p.fecha;
  if (!fecha) return null;
  const lot = catalogs.lots.find((item) => normalizeId(item.id) === normalizeId(p.loteId));
  if (lot?.fechaAlojamiento) {
    return getAgeWeeks(lot.fechaAlojamiento, fecha);
  }
  const placement = (catalogs.placements || []).find(
    (item) =>
      normalizeId(item.loteId) === normalizeId(p.loteId) &&
      normalizeId(item.galponId) === normalizeId(p.galponId),
  );
  if (placement?.fechaAlojamiento) {
    return getAgeWeeks(placement.fechaAlojamiento, fecha);
  }
  const lotPlacements = (catalogs.placements || []).filter(
    (item) => normalizeId(item.loteId) === normalizeId(p.loteId),
  );
  if (lotPlacements.length) {
    const earliest = lotPlacements.reduce((min, item) => {
      const v = item.fechaAlojamiento;
      return !min || (v && v < min) ? v : min;
    }, null);
    if (earliest) return getAgeWeeks(earliest, fecha);
  }
  return null;
}

function normalizeServerRecord(row) {
  const auditName = row.audit?.updatedByName || row.audit?.createdByName || "";
  return {
    id: row.clientId || row.id,
    module: row.module || "mortalidad",
    syncStatus: "synced",
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
    payload: {
      fecha: row.fecha,
      granjaId: row.granjaId,
      galponId: row.galponId,
      loteId: row.loteId,
      edad: row.edad,
      data: row.data || {},
      meta: row.meta || {},
    },
  };
}

export default function ReportsPage() {
  const { accessToken } = useAuth();
  const { filterCatalogs, filterRecords } = useFarmAccess();
  const { can } = usePermissions();

  const [catalogs, setCatalogs] = useState({ farms: [], sheds: [], lots: [], placements: [] });
  const [loadingCatalogs, setLoadingCatalogs] = useState(true);

  const [moduleFilter, setModuleFilter] = useState("mortalidad");
  const [farmFilter, setFarmFilter] = useState("");
  const [dateRange, setDateRange] = useState({ from: null, to: null });

  const [reportData, setReportData] = useState(null);
  const [generating, setGenerating] = useState(false);

  useEffect(() => {
    let active = true;
    getLocalCatalogs()
      .then((nextCatalogs) => {
        if (!active) return;
        setCatalogs(filterCatalogs(nextCatalogs));
      })
      .finally(() => {
        if (active) setLoadingCatalogs(false);
      });
    return () => { active = false; };
  }, [filterCatalogs]);

  async function generateReport() {
    setGenerating(true);
    setReportData(null);
    try {
      const [nextRecords, nextCatalogs] = await Promise.all([getSyncQueue(), getLocalCatalogs()]);
      const scopedCatalogs = filterCatalogs(nextCatalogs);
      setCatalogs(scopedCatalogs);

      let merged = filterRecords(nextRecords);
      if (can("records.view")) {
        try {
          const serverRes = await api("records", { method: "GET", accessToken });
          if (serverRes?.success && Array.isArray(serverRes.data)) {
            const localIds = new Set(nextRecords.map((r) => r.id));
            for (const row of serverRes.data) {
              const cid = row.clientId || row.id;
              if (!cid || localIds.has(cid)) continue;
              localIds.add(cid);
              merged.push(normalizeServerRecord(row));
            }
          }
        } catch {}
      }

      const filtered = merged.filter((r) => {
        if (r.module !== moduleFilter) return false;
        if (dateRange.from && dateRange.to) {
          const d = extractDateOnly(r.payload.fecha);
          if (!d || d < extractDateOnly(dateRange.from) || d > extractDateOnly(dateRange.to)) return false;
        }
        if (farmFilter && normalizeId(r.payload.granjaId) !== normalizeId(farmFilter)) return false;
        return true;
      }).sort(
        (a, b) => new Date(b.payload?.fecha || b.createdAt) - new Date(a.payload?.fecha || a.createdAt),
      );

      setReportData(filtered);
    } finally {
      setGenerating(false);
    }
  }

  const catalogMaps = useMemo(
    () => ({
      farms: buildNameMap(catalogs.farms),
      sheds: buildNameMap(catalogs.sheds),
      lots: buildNameMap(catalogs.lots, "codigo"),
    }),
    [catalogs],
  );

  const isProduccion = moduleFilter === "produccion";

  function formatRows(rows) {
    return rows.map((row) => {
      const p = row.payload;
      const farm = catalogMaps.farms[normalizeId(p.granjaId)] || "—";
      const shed = catalogMaps.sheds[normalizeId(p.galponId)] || "—";
      const lot = catalogMaps.lots[normalizeId(p.loteId)] || "—";
      const edad = getRecordEdad(row, catalogs);
      const base = {
        Fecha: formatDateShort(p.fecha),
        Granja: farm,
        Galpón: shed,
        Lote: lot,
        "Edad (sem)": edad ?? "—",
      };
      if (isProduccion) {
        const registros = p.data?.registros || [];
        for (const cat of EGG_CATEGORIES) {
          const r = registros.find((reg) => reg.categoria === cat.id);
          base[cat.nombre] = r ? Number(r.cantidad) : 0;
        }
        base.Total = registros.reduce((s, r) => s + Number(r.cantidad || 0), 0);
      }
      if (!isProduccion) {
        if (p.data?.mortalidad != null) {
          base.Mortalidad = Number(p.data.mortalidad);
          base.Sexo = p.data.sexo || "macho";
          base["Causa de muerte"] = p.data.causaMuerte || "—";
        }
      }
      return base;
    });
  }

  function exportCSV() {
    if (!reportData || reportData.length === 0) {
      toast({ title: "No hay datos para exportar", kind: "warning" });
      return;
    }
    const rows = formatRows(reportData);
    const headers = Object.keys(rows[0]);
    const csvContent = [
      headers.join(","),
      ...rows.map((row) =>
        headers.map((h) => {
          const v = row[h];
          const s = String(v ?? "");
          return s.includes(",") || s.includes('"') ? `"${s.replace(/"/g, '""')}"` : s;
        }).join(","),
      ),
    ].join("\n");
    const blob = new Blob(["\uFEFF" + csvContent], { type: "text/csv;charset=utf-8;bom" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `reporte-${moduleFilter}-${formatDateInput(new Date())}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    toast({ title: "CSV exportado", kind: "success" });
  }

  function exportExcel() {
    if (!reportData || reportData.length === 0) {
      toast({ title: "No hay datos para exportar", kind: "warning" });
      return;
    }
    const rows = formatRows(reportData);
    const wb = XLSX.utils.book_new();
    const ws = XLSX.utils.json_to_sheet(rows);
    XLSX.utils.book_append_sheet(wb, ws, "Reporte");
    const filename = `reporte-${moduleFilter}-${formatDateInput(new Date())}.xlsx`;
    XLSX.writeFile(wb, filename);
    toast({ title: "Excel exportado", kind: "success" });
  }

  const columns = useMemo(() => {
    const cols = [
      {
        key: "fecha",
        header: "Fecha",
        sortable: true,
        cellClassName: "min-w-20 whitespace-nowrap",
        render: (row) => formatDateShort(row.payload.fecha),
      },
      {
        key: "ubicacion",
        header: "Ubicación",
        cellClassName: "min-w-36 whitespace-normal",
        render: (row) => {
          const p = row.payload;
          const farm = catalogMaps.farms[normalizeId(p.granjaId)] || "—";
          const shed = catalogMaps.sheds[normalizeId(p.galponId)] || "—";
          const lot = catalogMaps.lots[normalizeId(p.loteId)] || "—";
          return (
            <div>
              <div className="font-medium">{farm}</div>
              <div className="text-xs text-zinc-500">{shed} · Lote {lot}</div>
            </div>
          );
        },
      },
      {
        key: "edad",
        header: "Edad",
        sortable: true,
        align: "right",
        cellClassName: "min-w-14 whitespace-nowrap",
        render: (row) => {
          const edad = getRecordEdad(row, catalogs);
          return <span className="tabular-nums">{edad != null ? `${edad} sem` : "—"}</span>;
        },
      },
    ];

    if (isProduccion || moduleFilter === "all") {
      for (const cat of EGG_CATEGORIES) {
        cols.push({
          key: cat.id,
          header: cat.nombre,
          align: "right",
          cellClassName: "min-w-16 whitespace-nowrap",
          render: (row) => {
            const registros = row.payload.data?.registros || [];
            const r = registros.find((reg) => reg.categoria === cat.id);
            return <span className="tabular-nums">{r ? Number(r.cantidad) : 0}</span>;
          },
        });
      }
      cols.push({
        key: "total",
        header: "Total",
        sortable: true,
        align: "right",
        cellClassName: "min-w-16 whitespace-nowrap font-semibold",
        render: (row) => {
          const registros = row.payload.data?.registros || [];
          return <span className="tabular-nums">{registros.reduce((s, r) => s + Number(r.cantidad || 0), 0)}</span>;
        },
      });
    }

    if (!isProduccion || moduleFilter === "all") {
      cols.push({
        key: "mortalidad",
        header: "Mort.",
        align: "right",
        cellClassName: "min-w-14 whitespace-nowrap",
        render: (row) => <span className="tabular-nums">{row.payload.data?.mortalidad ?? "—"}</span>,
      });
      cols.push({
        key: "sexo",
        header: "Sexo",
        cellClassName: "min-w-14 whitespace-nowrap",
        render: (row) => {
          const sexo = row.payload.data?.sexo;
          if (!sexo) return "—";
          const Icon = sexo === "hembra" ? Venus : Mars;
          return (
            <span className="inline-flex items-center gap-1 capitalize">
              <Icon size={16} className={sexo === "hembra" ? "text-pink-500" : "text-sky-500"} />
              {sexo === "hembra" ? "Hembra" : "Macho"}
            </span>
          );
        },
      });
      cols.push({
        key: "causaMuerte",
        header: "Causa",
        cellClassName: "min-w-28 whitespace-nowrap truncate max-w-32",
        render: (row) => {
          const causa = row.payload.data?.causaMuerte;
          return causa ? <span className="truncate block" title={causa}>{causa}</span> : "—";
        },
      });
    }

    return cols;
  }, [catalogMaps, catalogs, isProduccion, moduleFilter]);

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-2">
          <Select
          value={moduleFilter}
          onValueChange={(value) => setModuleFilter(value)}
          size="sm"
          className="flex-none w-auto max-w-44"
        >
          <option value="mortalidad">Mortalidad</option>
          <option value="produccion">Producción</option>
        </Select>

        <Select
          value={farmFilter}
          onValueChange={(value) => setFarmFilter(value)}
          size="sm"
          className="flex-none w-auto max-w-44"
          placeholder="Todas las granjas"
        >
          <option value="">Todas las granjas</option>
          {catalogs.farms.map((farm) => (
            <option key={farm.id} value={farm.id}>{farm.nombre}</option>
          ))}
        </Select>

        <div className="flex items-center gap-1">
          <DatePicker
            selectionMode="between"
            value={dateRange}
            onChange={(range) => setDateRange(range)}
            placeholder="Rango de fechas"
            size="sm"
          />
        </div>

        <Button
          type="button"
          size="sm"
          color="brand"
          onClick={generateReport}
          loading={generating}
          loadingText="Generando..."
        >
          <Play aria-hidden="true" className="size-4" />
          Generar reporte
        </Button>
      </div>

      {reportData === null ? (
        <ListEmptyState
          icon={History}
          title="Selecciona los filtros y genera tu reporte"
          description="Usa los filtros para definir el alcance del reporte y haz clic en «Generar reporte» para visualizar los datos."
        />
      ) : reportData.length === 0 ? (
        <ListEmptyState
          icon={SearchX}
          title="Sin resultados"
          description="No se encontraron registros con los filtros seleccionados. Ajusta los filtros e intenta de nuevo."
        />
      ) : (
        <>
          <div className="flex items-center justify-between">
            <div className="text-xs text-zinc-500">
              {reportData.length} registro{reportData.length !== 1 ? "s" : ""} encontrado{reportData.length !== 1 ? "s" : ""}
              {reportData.length > PREVIEW_LIMIT && (
                <span> · Mostrando los primeros {PREVIEW_LIMIT}. Descarga el reporte completo en CSV o Excel.</span>
              )}
            </div>
            <div className="flex items-center gap-2">
              <Button type="button" size="sm" variant="outline" color="neutral" onClick={exportCSV}>
                <FileText aria-hidden="true" className="size-4" />
                CSV
              </Button>
              <Button type="button" size="sm" variant="outline" color="brand" onClick={exportExcel}>
                <FileSpreadsheet aria-hidden="true" className="size-4" />
                Excel
              </Button>
            </div>
          </div>
          <PageTable
            columns={columns}
            data={reportData.slice(0, PREVIEW_LIMIT)}
            rowKey={(row) => row.id}
            loading={generating}
            stickyHeader
            color="neutral"
            skeletonRows={6}
          />
        </>
      )}
    </div>
  );
}
