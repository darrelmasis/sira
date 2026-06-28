import dayjs from "dayjs";
import "dayjs/locale/es";

dayjs.locale("es");

const DATE_ONLY_RE = /^(\d{4}-\d{2}-\d{2})/;

/**
 * Extrae la fecha calendario (YYYY-MM-DD) sin desfase por zona horaria.
 * - Strings "YYYY-MM-DD" o ISO: usa los primeros 10 caracteres.
 * - Date (p. ej. del DatePicker): componentes locales getFullYear/getMonth/getDate.
 */
export function extractDateOnly(value) {
  if (value == null || value === "") return "";

  if (typeof value === "string") {
    const match = value.match(DATE_ONLY_RE);
    return match ? match[1] : "";
  }

  if (value instanceof Date) {
    if (Number.isNaN(value.getTime())) return "";
    const y = value.getFullYear();
    const m = String(value.getMonth() + 1).padStart(2, "0");
    const d = String(value.getDate()).padStart(2, "0");
    return `${y}-${m}-${d}`;
  }

  return extractDateOnly(new Date(value));
}

/** Date | string → YYYY-MM-DD para almacenar o enviar al API */
export function formatDateInput(value) {
  return extractDateOnly(value);
}

/** YYYY-MM-DD → Date en medianoche local (valor correcto para DatePicker) */
export function parseDateInput(value) {
  const str = extractDateOnly(value);
  if (!str) return undefined;
  const [y, m, d] = str.split("-").map(Number);
  return new Date(y, m - 1, d);
}

export function formatDate(value) {
  const str = extractDateOnly(value);
  if (!str) return "—";
  return dayjs(parseDateInput(str)).format("D MMM YYYY");
}

export function formatDateShort(value) {
  const str = extractDateOnly(value);
  if (!str) return "—";
  const [, y, m, d] = str.match(/^(\d{4})-(\d{2})-(\d{2})$/) || [];
  if (!d) return "—";
  return `${d}/${m}/${y}`;
}

export function formatDateTime(value) {
  if (!value) return "—";
  return dayjs(value).format("D MMM YYYY, HH:mm");
}

export function todayInput() {
  return extractDateOnly(new Date());
}

export function isSameCalendarDay(a, b) {
  return extractDateOnly(a) === extractDateOnly(b);
}
