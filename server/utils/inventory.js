import mongoose from "mongoose";
import FieldRecord from "../models/FieldRecord.js";
import Placement from "../models/Placement.js";
import Lot from "../models/Lot.js";
import { dateOnlyToLocalDate, getAgeWeeks, getEtapa } from "./dates.js";
import { v4 as uuidv4 } from "uuid";

export const CAPITALIZATION_MIN_WEEKS = 25;

function toObjectId(value) {
  if (!value) return null;
  if (value instanceof mongoose.Types.ObjectId) return value;
  return new mongoose.Types.ObjectId(String(value));
}

function resolveAtDateEnd(atDate) {
  if (!atDate) return new Date();

  const dayStart = dateOnlyToLocalDate(atDate);
  if (!dayStart) return new Date(atDate);

  const asDate = new Date(atDate);
  const isDateOnly =
    asDate.getHours() === 0 &&
    asDate.getMinutes() === 0 &&
    asDate.getSeconds() === 0 &&
    asDate.getMilliseconds() === 0;

  if (isDateOnly) {
    const end = new Date(dayStart);
    end.setHours(23, 59, 59, 999);
    return end;
  }

  return asDate;
}

function resolveSinceStart(sinceDate) {
  return dateOnlyToLocalDate(sinceDate) || new Date(sinceDate);
}

function applyMortalityBySexo(qty, sexo, lotSexo, totals) {
  if (sexo === "hembra") {
    totals.hembras += qty;
    return;
  }
  if (sexo === "macho") {
    totals.machos += qty;
    return;
  }

  // "mixto" u otro valor: repartir según el sexo del lote
  if (lotSexo === "hembra") {
    totals.hembras += qty;
  } else if (lotSexo === "macho") {
    totals.machos += qty;
  } else {
    totals.hembras += Math.floor(qty / 2);
    totals.machos += qty - Math.floor(qty / 2);
  }
}

export async function getLotAgeStartDates(lotIds) {
  if (!lotIds.length) return new Map();

  const objectIds = lotIds.map(toObjectId);
  const lots = await Lot.find({ _id: { $in: objectIds } })
    .select("fechaAlojamiento")
    .lean();

  const map = new Map();
  const needsFallback = [];

  for (const lot of lots) {
    const id = String(lot._id);
    if (lot.fechaAlojamiento) {
      map.set(id, lot.fechaAlojamiento);
    } else {
      needsFallback.push(lot._id);
    }
  }

  if (needsFallback.length) {
    const fallback = await getLotStartDates(needsFallback.map(String));
    for (const id of needsFallback) {
      const key = String(id);
      if (fallback.has(key)) {
        map.set(key, fallback.get(key));
      }
    }
  }

  return map;
}

export async function getLotAgeStartDate(lotId) {
  const map = await getLotAgeStartDates([lotId]);
  return map.get(String(lotId)) || null;
}

export async function getLotAllocation(lotId, excludePlacementId = null) {
  const lot = await Lot.findById(lotId).lean();
  if (!lot) return null;

  const placementFilter = {
    loteId: toObjectId(lotId),
    estado: { $ne: "cerrado" },
  };
  if (excludePlacementId) {
    placementFilter._id = { $ne: toObjectId(excludePlacementId) };
  }

  const activePlacements = await Placement.find(placementFilter).lean();

  let allocatedHembras = 0;
  let allocatedMachos = 0;
  for (const placement of activePlacements) {
    allocatedHembras += placement.hembras || 0;
    allocatedMachos += placement.machos || 0;
  }

  const intakeRecords = await FieldRecord.find({
    module: "mortalidad",
    loteId: toObjectId(lotId),
    "meta.tipo": "alojamiento",
  }).lean();

  let intakeHembras = 0;
  let intakeMachos = 0;
  const intakeTotals = { hembras: 0, machos: 0 };
  for (const record of intakeRecords) {
    const qty = Number(record.data?.mortalidad || 0);
    if (!Number.isFinite(qty) || qty <= 0) continue;
    const sexo = record.data?.sexo || "macho";
    applyMortalityBySexo(qty, sexo, lot.sexo, intakeTotals);
  }
  intakeHembras = intakeTotals.hembras;
  intakeMachos = intakeTotals.machos;

  const lotHembras = lot.hembras || 0;
  const lotMachos = lot.machos || 0;

  return {
    loteId: String(lot._id),
    codigo: lot.codigo,
    fechaAlojamiento: lot.fechaAlojamiento || null,
    lotHembras,
    lotMachos,
    allocatedHembras,
    allocatedMachos,
    intakeMortalityHembras: intakeHembras,
    intakeMortalityMachos: intakeMachos,
    pendingHembras: lotHembras - allocatedHembras - intakeHembras,
    pendingMachos: lotMachos - allocatedMachos - intakeMachos,
  };
}

export async function createIntakeMortalityRecords({
  user,
  lot,
  galponId,
  fechaAlojamiento,
  mortalidadHembras = 0,
  mortalidadMachos = 0,
}) {
  const mortH = Number(mortalidadHembras);
  const mortM = Number(mortalidadMachos);
  if (mortH <= 0 && mortM <= 0) return [];

  const fecha = dateOnlyToLocalDate(fechaAlojamiento) || new Date(fechaAlojamiento);
  const lotStart = lot.fechaAlojamiento || fecha;
  const edad = getAgeWeeks(lotStart, fecha);
  const etapa = getEtapa(edad);

  const records = [];
  const base = {
    module: "mortalidad",
    fecha,
    granjaId: lot.granjaId,
    galponId: toObjectId(galponId),
    loteId: lot._id,
    etapa,
    edad,
    meta: { tipo: "alojamiento" },
    createdBy: user._id,
  };

  if (mortH > 0) {
    records.push({
      ...base,
      clientId: uuidv4(),
      data: {
        mortalidad: mortH,
        sexo: "hembra",
        causaMuerte: "Mortalidad en alojamiento",
      },
    });
  }
  if (mortM > 0) {
    records.push({
      ...base,
      clientId: uuidv4(),
      data: {
        mortalidad: mortM,
        sexo: "macho",
        causaMuerte: "Mortalidad en alojamiento",
      },
    });
  }

  if (records.length) {
    await FieldRecord.insertMany(records);
  }
  return records;
}

export async function getLotStartDates(lotIds) {
  if (!lotIds.length) return new Map();

  const objectIds = lotIds.map(toObjectId);
  const rows = await Placement.aggregate([
    { $match: { loteId: { $in: objectIds } } },
    { $group: { _id: "$loteId", fechaInicio: { $min: "$fechaAlojamiento" } } },
  ]);

  return new Map(rows.map((row) => [String(row._id), row.fechaInicio]));
}

export async function getLotStartDate(lotId) {
  const map = await getLotStartDates([lotId]);
  return map.get(String(lotId)) || null;
}

export async function countActiveLevantePlacements(lotId, session = null) {
  const query = Placement.countDocuments({
    loteId: toObjectId(lotId),
    tipo: "levante",
    estado: { $ne: "cerrado" },
  });
  if (session) query.session(session);
  return query;
}

export async function getPlacementLiveCount(placement, atDate = new Date(), lotSexo = null) {
  const lotId = placement.loteId?._id || placement.loteId;
  const shedId = placement.galponId?._id || placement.galponId;
  const sinceStart = resolveSinceStart(placement.fechaAlojamiento);
  const atEnd = resolveAtDateEnd(atDate);

  const mortalities = await FieldRecord.find({
    module: "mortalidad",
    loteId: toObjectId(lotId),
    galponId: toObjectId(shedId),
    fecha: { $gte: sinceStart, $lte: atEnd },
    "meta.tipo": { $ne: "alojamiento" },
  }).lean();

  const totals = { hembras: 0, machos: 0 };
  for (const record of mortalities) {
    const qty = Number(record.data?.mortalidad || 0);
    if (!Number.isFinite(qty) || qty <= 0) continue;
    const sexo = record.data?.sexo || "macho";
    applyMortalityBySexo(qty, sexo, lotSexo, totals);
  }

  const liveHembras = Math.max(0, placement.hembras - totals.hembras);
  const liveMachos = Math.max(0, placement.machos - totals.machos);

  return {
    hembras: liveHembras,
    machos: liveMachos,
    detalles: {
      inicialHembras: placement.hembras,
      inicialMachos: placement.machos,
      mortalidadHembras: totals.hembras,
      mortalidadMachos: totals.machos,
    },
  };
}

export async function findActivePlacement(loteId, galponId, session = null) {
  const query = Placement.findOne({
    loteId: toObjectId(loteId),
    galponId: toObjectId(galponId),
    estado: { $ne: "cerrado" },
  }).sort({ fechaAlojamiento: -1 });

  if (session) query.session(session);
  return query;
}
