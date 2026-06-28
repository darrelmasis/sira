import mongoose from "mongoose";
import { validateRecordDate } from "../utils/permissions.js";
import { validateFarmAccess } from "../utils/farmAccess.js";

export function validateMortalidadRecord(record, user) {
  if (!record) return "Registro inválido";
  if (record.module !== "mortalidad") return "Módulo inválido";
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

  const mortalidad = Number(record.data.mortalidad);

  if (!Number.isFinite(mortalidad) || mortalidad < 0) {
    return "Mortalidad debe ser cero o mayor";
  }

  if (!["macho", "hembra", "mixto"].includes(record.data.sexo)) {
    return "Sexo inválido";
  }

  return "";
}
