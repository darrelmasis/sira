import mongoose from "mongoose";
import { validateRecordDate } from "../utils/permissions.js";
import { validateFarmAccess } from "../utils/farmAccess.js";

const VALID_CATEGORIAS = [
  "huevo-clase-a", "huevo-clase-b",
  "huevo-d-yema", "huevo-infertil", "huevo-protocolo",
  "huevos-blancos", "huevos-micro-fisurados", "huevos-pequenos", "huevos-sucios",
  "huevo-cascara-delgada", "huevo-roto",
];

export function validateProduccionRecord(record, user) {
  if (!record) return "Registro inválido";
  if (record.module !== "produccion") return "Módulo inválido";
  if (!record.clientId) return "clientId es obligatorio";
  if (!record.fecha || Number.isNaN(Date.parse(record.fecha))) return "Fecha inválida";

  const dateError = validateRecordDate(user?.role, record.fecha);
  if (dateError) return dateError;

  const farmError = validateFarmAccess(user, record.granjaId);
  if (farmError) return farmError;
  if (!mongoose.Types.ObjectId.isValid(record.granjaId)) return "Granja inválida";
  if (!mongoose.Types.ObjectId.isValid(record.galponId)) return "Galpón inválido";
  if (!mongoose.Types.ObjectId.isValid(record.loteId)) return "Lote inválido";
  if (!record.data) return "Datos específicos obligatorios";

  const registros = record.data.registros;
  if (!Array.isArray(registros) || registros.length === 0) return "Debe haber al menos un registro de producción";

  for (const r of registros) {
    if (!VALID_CATEGORIAS.includes(r.categoria)) return `Categoría inválida: ${r.categoria}`;
    if (!Number.isFinite(Number(r.cantidad)) || Number(r.cantidad) < 0) return "Cantidad debe ser cero o mayor";
  }

  return "";
}
