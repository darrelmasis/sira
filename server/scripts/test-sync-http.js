import dayjs from "dayjs";
import mongoose from "mongoose";
import { loadEnv } from "../env.js";
import { connectMongo } from "../db/mongo.js";
import User from "../models/User.js";
import Farm from "../models/Farm.js";
import Lot from "../models/Lot.js";
import FieldRecord from "../models/FieldRecord.js";
import { signAccessToken } from "../utils/jwt.js";

loadEnv();
await connectMongo();

const port = process.env.VITE_TEST_PORT || 5174;
const base = `http://localhost:${port}/api`;

const user = await User.findOne({ active: true }).lean();
const farm = await Farm.findOne({ active: true }).lean();
const lot = await Lot.findOne().lean();

if (!user || !farm || !lot) {
  console.error("Faltan datos base");
  process.exit(1);
}

const token = signAccessToken({ id: String(user._id), role: user.role });
const galponId = new mongoose.Types.ObjectId();

const record = {
  clientId: `http-test-${Date.now()}`,
  module: "mortalidad",
  fecha: dayjs().format("YYYY-MM-DD"),
  granjaId: String(farm._id),
  galponId: String(galponId),
  loteId: String(lot._id),
  data: { mortalidad: 1, sexo: "mixto", causaMuerte: "test" },
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
};

const response = await fetch(`${base}/sync`, {
  method: "POST",
  headers: {
    "Content-Type": "application/json",
    Authorization: `Bearer ${token}`,
  },
  body: JSON.stringify({ records: [record] }),
});

const body = await response.json().catch(() => ({}));
console.log("Status:", response.status);
console.log(JSON.stringify(body, null, 2));

if (body.success) {
  await FieldRecord.deleteOne({ clientId: record.clientId });
}

process.exit(body.success ? 0 : 1);
