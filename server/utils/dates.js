import dayjs from "dayjs";

const DATE_ONLY_RE = /^(\d{4}-\d{2}-\d{2})/;

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

export function dateOnlyToLocalDate(value) {
  const str = extractDateOnly(value);
  if (!str) return null;
  const [y, m, d] = str.split("-").map(Number);
  return new Date(y, m - 1, d);
}

export function dateOnlyRange(value) {
  const start = dateOnlyToLocalDate(value);
  if (!start) return null;
  const end = new Date(start);
  end.setHours(23, 59, 59, 999);
  return { start, end };
}

export function getAgeWeeks(fechaAlojamiento, atDate = new Date()) {
  const start = dayjs(dateOnlyToLocalDate(fechaAlojamiento)).startOf("day");
  const end = dayjs(dateOnlyToLocalDate(atDate)).startOf("day");
  const days = Math.max(0, end.diff(start, "day"));
  return Math.floor(days / 7);
}

export function getEtapa(weeks) {
  return weeks < 18 ? "levante" : "postura";
}
