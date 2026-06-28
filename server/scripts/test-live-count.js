import { loadEnv } from "../env.js";
import { connectMongo } from "../db/mongo.js";
import FieldRecord from "../models/FieldRecord.js";
import Placement from "../models/Placement.js";
import mongoose from "mongoose";

loadEnv();
await connectMongo();

const placement = await Placement.findOne({
  loteId: new mongoose.Types.ObjectId("6a402a57d967ada2b73e6456"),
  galponId: new mongoose.Types.ObjectId("6a4058d7688c9ae9c1f719ff")
}).lean();

console.log("Placement:", placement);

const sinceDate = placement.fechaAlojamiento;
const atDate = new Date();

console.log("sinceDate:", sinceDate);
console.log("atDate:", atDate);

// Let's query all mortalities for Lote 47
const allMort = await FieldRecord.find({
  module: "mortalidad",
  loteId: new mongoose.Types.ObjectId("6a402a57d967ada2b73e6456")
}).lean();

console.log("All Lote 47 mortalities:", allMort.map(m => ({
  fecha: m.fecha,
  galponId: m.galponId,
  mortalidad: m.data?.mortalidad,
  gteSince: m.fecha >= sinceDate,
  lteAt: m.fecha <= atDate
})));

process.exit(0);
