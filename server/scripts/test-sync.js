import dayjs from "dayjs";
import { loadEnv } from "../env.js";
import { connectMongo } from "../db/mongo.js";
import User from "../models/User.js";
import Farm from "../models/Farm.js";
import Shed from "../models/Shed.js";
import Lot from "../models/Lot.js";
import FieldRecord from "../models/FieldRecord.js";
import Placement from "../models/Placement.js";
import { signAccessToken } from "../utils/jwt.js";
import { ensurePermissionsLoaded } from "../utils/permissions.js";
import syncHandler from "../handlers/sync/sync.js";
import { validateMortalidadRecord } from "../validators/mortalidad.js";
import { getAgeWeeks, getEtapa } from "../utils/dates.js";

loadEnv();
await connectMongo();
await ensurePermissionsLoaded();

const user = await User.findOne({ role: "desarrollador", active: true }).lean();
if (!user) {
  console.error("No hay usuario desarrollador");
  process.exit(1);
}

const farm = await Farm.findOne({ active: true }).lean();
const shed = await Shed.findOne({ granjaId: farm._id, active: true }).lean();
const lot = await Lot.findOne({ granjaId: farm._id }).lean();

if (!farm || !shed || !lot) {
  console.error("Faltan catálogos en Mongo. Ejecuta npm run db:seed");
  process.exit(1);
}

const record = {
  clientId: `test-sync-${Date.now()}`,
  module: "mortalidad",
  fecha: dayjs().format("YYYY-MM-DD"),
  granjaId: String(farm._id),
  galponId: String(shed._id),
  loteId: String(lot._id),
  data: { mortalidad: 1, sexo: "mixto", causaMuerte: "" },
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
  audit: {
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    createdBy: { nombre: user.nombre, username: user.username },
    updatedBy: { nombre: user.nombre, username: user.username },
  },
};

console.log("Usuario:", user.username);
console.log("Validación:", validateMortalidadRecord(record, user) || "OK");

const placement = await Placement.findOne({
  loteId: lot._id,
  galponId: shed._id,
  fechaAlojamiento: { $lte: new Date(record.fecha) },
})
  .sort({ fechaAlojamiento: -1 })
  .lean();

console.log("Placement:", placement?._id?.toString() || "ninguno");
const edad = placement ? getAgeWeeks(placement.fechaAlojamiento, record.fecha) : 0;

const token = signAccessToken({ id: String(user._id), role: user.role });

const req = {
  method: "POST",
  body: { records: [record] },
  headers: { authorization: `Bearer ${token}` },
};

let responseBody = null;
const res = {
  statusCode: 200,
  status(code) {
    this.statusCode = code;
    return this;
  },
  setHeader() {},
  json(data) {
    responseBody = data;
  },
};

await syncHandler(req, res);

console.log("HTTP status:", res.statusCode);
console.log("Respuesta sync:", JSON.stringify(responseBody, null, 2));

if (responseBody?.success && responseBody.data?.synced?.length > 0) {
  await FieldRecord.deleteOne({ clientId: record.clientId });
  console.log("Limpieza OK");
}

process.exit(responseBody?.success ? 0 : 1);
