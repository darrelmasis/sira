import { loadEnv } from "../env.js";
import { connectMongo } from "../db/mongo.js";
import Transfer from "../models/Transfer.js";
import Placement from "../models/Placement.js";
import Shed from "../models/Shed.js";
import Lot from "../models/Lot.js";

loadEnv();
await connectMongo();

const placements = await Placement.find().populate("loteId", "codigo").populate("galponId", "nombre").lean();
console.log("=== PLACEMENTS ===");
console.log(JSON.stringify(placements, null, 2));

const sheds = await Shed.find().lean();
console.log("=== SHEDS ===");
console.log(JSON.stringify(sheds, null, 2));

const lots = await Lot.find().lean();
console.log("=== LOTS ===");
console.log(JSON.stringify(lots, null, 2));

process.exit(0);
