import { Button, Popover, DatePicker, Select } from "quickit-ui";
import { CalendarDays, RotateCcw } from "lucide-react";

const presets = [
  { value: "all", label: "Todas las fechas" },
  { value: "today", label: "Hoy" },
];

export default function FilterDrawer({
  datePreset,
  onPresetChange,
  dateRange,
  setDateRange,
  moduleFilter,
  setModuleFilter,
  farmFilter,
  setFarmFilter,
  catalogs,
  records,
  filteredRecords,
}) {
  function clearFilters() {
    onPresetChange("all");
    setDateRange({ from: null, to: null });
    setModuleFilter("all");
    setFarmFilter("");
  }

  const hasActiveFilters = datePreset !== "all" || moduleFilter !== "all" || farmFilter;

  const dateLabel =
    datePreset === "today" ? "Hoy" :
    datePreset === "all" ? "Todas las fechas" :
    dateRange.from && dateRange.to
      ? `${dateRange.from.toLocaleDateString()} - ${dateRange.to.toLocaleDateString()}`
      : "Todas las fechas";

  return (
    <div className="flex items-center gap-2">
      <Select
        value={moduleFilter}
        onValueChange={(value) => setModuleFilter(value)}
        size="sm"
        className="flex-none w-auto max-w-40"
      >
        <option value="all">Todos los módulos</option>
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
          <option key={farm.id} value={farm.id}>
            {farm.nombre}
          </option>
        ))}
      </Select>

      <Popover
        content={
          <div className="space-y-3 p-2">
            <div className="flex flex-wrap gap-1.5">
              {presets.map((preset) => (
                <Button
                  key={preset.value}
                  type="button"
                  size="sm"
                  variant={datePreset === preset.value ? "solid" : "outline"}
                  color={datePreset === preset.value ? "brand" : "neutral"}
                  onClick={() => onPresetChange(preset.value)}
                >
                  {preset.label}
                </Button>
              ))}
            </div>
            <DatePicker
              selectionMode="between"
              value={dateRange}
              onChange={(range) => {
                setDateRange(range);
                onPresetChange("range");
              }}
              placeholder="Rango personalizado"
              size="sm"
              fullWidth
            />
          </div>
        }
        trigger="click"
        interactive
        usePortal
        placement="bottom-start"
      >
        <Button type="button" size="sm" variant="outline" color="neutral" className="flex-none whitespace-nowrap">
          <CalendarDays aria-hidden="true" className="size-4" />
          {dateLabel}
        </Button>
      </Popover>

      {hasActiveFilters && (
        <Button type="button" size="sm" variant="ghost" color="neutral" onClick={clearFilters}>
          <RotateCcw aria-hidden="true" className="size-3" />
        </Button>
      )}

      <span className="ml-auto text-xs text-zinc-500 dark:text-zinc-400 whitespace-nowrap">
        {filteredRecords.length} de {records.length} registro{records.length !== 1 ? "s" : ""}
      </span>
    </div>
  );
}
