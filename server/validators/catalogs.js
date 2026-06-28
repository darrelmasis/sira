import mongoose from "mongoose";
import Farm from "../models/Farm.js";
import Shed from "../models/Shed.js";
import Lot from "../models/Lot.js";
import Placement from "../models/Placement.js";

import { dateOnlyRange } from "../utils/dates.js";

function escapeRegex(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

export async function validateFarmPayload(body, excludeId) {
  const nombre = body?.nombre?.trim();
  if (!nombre) return "El nombre de la granja es obligatorio.";

  const filter = { nombre: { $regex: new RegExp(`^${escapeRegex(nombre)}$`, "i") } };
  if (excludeId && mongoose.Types.ObjectId.isValid(excludeId)) {
    filter._id = { $ne: excludeId };
  }

  const exists = await Farm.findOne(filter).lean();
  if (exists) return "Ya existe una granja con ese nombre.";

  if (!["engorde", "reproductora"].includes(body?.tipo)) {
    return "Tipo de granja inválido.";
  }

  return "";
}

export async function validateShedPayload(body, excludeId) {
  const nombre = body?.nombre?.trim();
  if (!nombre) return "El nombre del galpón es obligatorio.";
  if (!mongoose.Types.ObjectId.isValid(body?.granjaId)) return "Selecciona una granja válida.";

  const filter = {
    granjaId: body.granjaId,
    nombre: { $regex: new RegExp(`^${escapeRegex(nombre)}$`, "i") },
  };
  if (excludeId && mongoose.Types.ObjectId.isValid(excludeId)) {
    filter._id = { $ne: excludeId };
  }

  const exists = await Shed.findOne(filter).lean();
  if (exists) return "Ya existe un galpón con ese nombre en la granja seleccionada.";

  const farm = await Farm.findById(body.granjaId).lean();
  if (!farm) return "La granja seleccionada no existe.";

  return "";
}

export async function validateLotPayload(body, excludeId) {
  const codigo = body?.codigo?.trim();
  if (!codigo) return "El código del lote es obligatorio.";
  if (!mongoose.Types.ObjectId.isValid(body?.granjaId)) return "Selecciona una granja válida.";

  const filter = { codigo: { $regex: new RegExp(`^${escapeRegex(codigo)}$`, "i") } };
  if (excludeId && mongoose.Types.ObjectId.isValid(excludeId)) {
    filter._id = { $ne: excludeId };
  }

  const exists = await Lot.findOne(filter).lean();
  if (exists) return "Ya existe un lote con ese código.";

  const farm = await Farm.findById(body.granjaId).lean();
  if (!farm) return "La granja seleccionada no existe.";

  if (!["COBB", "ROSS"].includes(body?.raza)) return "Raza inválida.";
  if (!["macho", "hembra", "mixto"].includes(body?.sexo)) return "Sexo inválido.";
  if (!["activo", "cerrado"].includes(body?.estado)) return "Estado inválido.";

  const hembras = Number(body?.hembras ?? 0);
  const machos = Number(body?.machos ?? 0);
  if (!Number.isFinite(hembras) || hembras < 0) return "Hembras debe ser cero o mayor.";
  if (!Number.isFinite(machos) || machos < 0) return "Machos debe ser cero o mayor.";

  return "";
}

export async function validatePlacementPayload(body, excludeId) {
  if (!mongoose.Types.ObjectId.isValid(body?.loteId)) return "Selecciona un lote válido.";
  if (!mongoose.Types.ObjectId.isValid(body?.galponId)) return "Selecciona un galpón válido.";
  if (!body?.fechaAlojamiento || Number.isNaN(Date.parse(body.fechaAlojamiento))) {
    return "Fecha de alojamiento inválida.";
  }

  const lot = await Lot.findById(body.loteId).lean();
  if (!lot) return "El lote seleccionado no existe.";

  const shed = await Shed.findById(body.galponId).lean();
  if (!shed) return "El galpón seleccionado no existe.";

  if (String(lot.granjaId) !== String(shed.granjaId)) {
    return "El lote y el galpón deben pertenecer a la misma granja.";
  }

  const hembras = Number(body?.hembras ?? 0);
  const machos = Number(body?.machos ?? 0);
  if (!Number.isFinite(hembras) || hembras < 0) return "Hembras debe ser cero o mayor.";
  if (!Number.isFinite(machos) || machos < 0) return "Machos debe ser cero o mayor.";

  const range = dateOnlyRange(body.fechaAlojamiento);
  if (!range) return "Fecha de alojamiento inválida.";

  const filter = {
    loteId: body.loteId,
    galponId: body.galponId,
    fechaAlojamiento: { $gte: range.start, $lte: range.end },
  };
  if (excludeId && mongoose.Types.ObjectId.isValid(excludeId)) {
    filter._id = { $ne: excludeId };
  }

  const exists = await Placement.findOne(filter).lean();
  if (exists) return "Ya existe un alojamiento para ese lote, galpón y fecha.";

  return "";
}

export async function validateCatalogPayload(resource, body, excludeId) {
  if (resource === "granjas") return validateFarmPayload(body, excludeId);
  if (resource === "galpones") return validateShedPayload(body, excludeId);
  if (resource === "lotes") return validateLotPayload(body, excludeId);
  if (resource === "alojamientos") return validatePlacementPayload(body, excludeId);
  return "";
}
