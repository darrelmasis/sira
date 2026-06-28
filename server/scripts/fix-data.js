import { loadEnv } from "../env.js";
import { connectMongo } from "../db/mongo.js";
import mongoose from "mongoose";
import Lot from "../models/Lot.js";
import Placement from "../models/Placement.js";
import FieldRecord from "../models/FieldRecord.js";

loadEnv();
await connectMongo();

// 1. Backfill fechaAlojamiento on lots from earliest placement
console.log("=== BACKFILL fechaAlojamiento on lots ===");
const lots = await Lot.find({ fechaAlojamiento: { $exists: false } }).lean();
for (const lot of lots) {
  const earliest = await Placement.findOne({ loteId: lot._id })
    .sort({ fechaAlojamiento: 1 })
    .lean();
  if (earliest) {
    await Lot.findByIdAndUpdate(lot._id, { fechaAlojamiento: earliest.fechaAlojamiento });
    console.log(`  Lot ${lot.codigo}: set fechaAlojamiento to ${earliest.fechaAlojamiento}`);
  } else {
    console.log(`  Lot ${lot.codigo}: no placements found, skipping`);
  }
}

// Also update lots that DO have the field but it's null/undefined
const lotsWithNull = await Lot.find({ fechaAlojamiento: null }).lean();
for (const lot of lotsWithNull) {
  const earliest = await Placement.findOne({ loteId: lot._id })
    .sort({ fechaAlojamiento: 1 })
    .lean();
  if (earliest) {
    await Lot.findByIdAndUpdate(lot._id, { fechaAlojamiento: earliest.fechaAlojamiento });
    console.log(`  Lot ${lot.codigo}: set fechaAlojamiento to ${earliest.fechaAlojamiento} (was null)`);
  }
}

// 2. Fix bad mortality record (wrong galponId)
console.log("\n=== FIX MORTALITY RECORDS ===");
const allMortalities = await FieldRecord.find({ module: "mortalidad" }).lean();
console.log(`  Total mortality records: ${allMortalities.length}`);

for (const m of allMortalities) {
  const placement = await Placement.findOne({
    loteId: m.loteId,
    galponId: m.galponId,
    fechaAlojamiento: { $lte: m.fecha },
  }).sort({ fechaAlojamiento: -1 }).lean();

  if (!placement) {
    // Try to find a placement for this lot in any galpon
    const anyPlacement = await Placement.findOne({
      loteId: m.loteId,
      estado: { $ne: "cerrado" },
      fechaAlojamiento: { $lte: m.fecha },
    }).sort({ fechaAlojamiento: -1 }).lean();

    if (anyPlacement) {
      console.log(`  Mortality ${m._id}: galponId mismatch (has ${m.galponId}, needs ${anyPlacement.galponId}). Updating...`);
      await FieldRecord.findByIdAndUpdate(m._id, {
        $set: { galponId: anyPlacement.galponId }
      });
      console.log(`  -> Updated galponId to ${anyPlacement.galponId}`);
    } else {
      console.log(`  Mortality ${m._id}: no matching placement found for lot ${m.loteId}. Needs manual review.`);
    }
  } else {
    console.log(`  Mortality ${m._id}: OK (matches placement ${placement._id})`);
  }
}

// 3. Verify results
console.log("\n=== VERIFICATION ===");
const allLots = await Lot.find().lean();
for (const lot of allLots) {
  console.log(`  Lot ${lot.codigo}: fechaAlojamiento=${lot.fechaAlojamiento}`);
}

const allMortAfter = await FieldRecord.find({ module: "mortalidad" }).lean();
for (const m of allMortAfter) {
  const matchingPlacement = await Placement.findOne({
    loteId: m.loteId,
    galponId: m.galponId,
    fechaAlojamiento: { $lte: m.fecha },
  }).lean();
  console.log(`  Mortality ${m._id}: loteId=${m.loteId} galponId=${m.galponId} -> ${matchingPlacement ? "MATCHED" : "NO MATCH"}`);
}

process.exit(0);
