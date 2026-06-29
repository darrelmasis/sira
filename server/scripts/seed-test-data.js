import { loadEnv } from "../env.js";
loadEnv();

import { connectMongo } from "../db/mongo.js";
import { v4 as uuidv4 } from "uuid";
import argon2 from "argon2";
import Lot from "../models/Lot.js";
import Placement from "../models/Placement.js";
import FieldRecord from "../models/FieldRecord.js";
import Transfer from "../models/Transfer.js";
import User from "../models/User.js";
import Farm from "../models/Farm.js";
import Complex from "../models/Complex.js";
import Shed from "../models/Shed.js";
import { getAgeWeeks } from "../utils/dates.js";
import { buildShedName } from "../utils/complex.js";
import { seedDefaultPermissions } from "../utils/permissions.js";

// ============================================================
// CONFIG
// ============================================================

const NOW = new Date(2026, 5, 28);
const START = new Date(2024, 0, 15);
const DAYS_BETWEEN_LOTS = 14;

const CAUSAS = ["Mortalidad natural", "Necropsia", "Ovoscopia", "Descarte"];

const COMPLEJOS = [
  "Dario", "Tempisque", "Barranco", "Pencas", "Playitas", "Tomalapa",
];

function fill(n) { return String(n).padStart(3, "0"); }

function addDays(d, days) {
  const r = new Date(d);
  r.setDate(r.getDate() + days);
  return r;
}

function randomInt(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function pick(arr) {
  return arr[Math.floor(Math.random() * arr.length)];
}

// ============================================================
// MAIN
// ============================================================

async function main() {
  await connectMongo();

  await seedDefaultPermissions();

  // ──── GRANJA ────
  let farm = await Farm.findOne({ nombre: "Granja San Francisco" });
  if (!farm) {
    farm = await Farm.create({ nombre: "Granja San Francisco", tipo: "reproductora", active: true });
    console.log("Granja creada:", farm.nombre);
  } else {
    console.log("Granja ya existe:", farm.nombre);
  }

  // ──── COMPLEJOS Y GALPONES ────
  const complejos = [];
  for (const nombre of COMPLEJOS) {
    let complejo = await Complex.findOne({ granjaId: farm._id, nombre });
    if (!complejo) {
      complejo = await Complex.create({ granjaId: farm._id, nombre, active: true });
      const sheds = await Shed.insertMany([1, 2].map((num) => ({
        granjaId: farm._id, complejoId: complejo._id,
        numero: num, nombre: buildShedName(nombre, num), active: true,
      })));
      complejos.push({ complejo, sheds });
      console.log(`  Complejo creado: ${nombre}`);
    } else {
      const sheds = await Shed.find({ complejoId: complejo._id }).lean();
      if (sheds.length === 0) {
        const newSheds = await Shed.insertMany([1, 2].map((num) => ({
          granjaId: farm._id, complejoId: complejo._id,
          numero: num, nombre: buildShedName(nombre, num), active: true,
        })));
        complejos.push({ complejo, sheds: newSheds });
      } else {
        complejos.push({ complejo, sheds });
      }
      console.log(`  Complejo ya existe: ${nombre}`);
    }
  }

  // ──── USUARIOS ────
  const userData = [
    { username: "admin", nombre: "Administrador SIRA", role: "admin", pass: "admin123" },
    { username: "supervisor", nombre: "Supervisor Granjas", role: "supervisor", pass: "super123" },
    { username: "operario", nombre: "Operario de Campo", role: "operador", pass: "opera123" },
  ];

  const users = [];
  for (const u of userData) {
    let user = await User.findOne({ username: u.username });
    if (!user) {
      const passwordHash = await argon2.hash(u.pass);
      user = await User.create({
        username: u.username, passwordHash, nombre: u.nombre,
        email: `${u.username}@sira.local`, role: u.role,
        granjasAsignadas: [farm._id], active: true,
      });
      console.log(`  Usuario creado: ${u.username}`);
    } else {
      console.log(`  Usuario ya existe: ${u.username}`);
    }
    users.push(user);
  }

  const [adminUser, supervisorUser, operarioUser] = users;

  function makeMortRecord(loteId, galponId, granjaId, fecha, edad, cant, sexo, causa, etapa, metaTipo) {
    return {
      clientId: uuidv4(), module: "mortalidad", fecha,
      granjaId, galponId, loteId, etapa, edad,
      data: { mortalidad: cant, sexo, causaMuerte: causa },
      meta: metaTipo ? { tipo: metaTipo } : {},
      createdBy: operarioUser._id,
      audit: { createdByName: operarioUser.nombre },
    };
  }

  // ──── LOTES Y ALOJAMIENTOS ────
  const existingCodes = await Lot.find({}).distinct("codigo");
  const existingSet = new Set(existingCodes);

  const lotEntries = [];
  let lotsCreated = 0;

  for (let n = 1; n <= 51; n++) {
    const codigo = fill(n);
    if (existingSet.has(codigo)) {
      const lot = await Lot.findOne({ codigo }).lean();
      const p1 = await Placement.findOne({ loteId: lot._id, galponId: { $in: complejos.map(c => c.sheds[0]._id) } }).lean();
      const p2 = await Placement.findOne({ loteId: lot._id, galponId: { $in: complejos.map(c => c.sheds[1]._id) } }).lean();
      if (!p1 || !p2) {
        console.log(`  Lote ${codigo} existe pero faltan alojamientos, se omiten datos`);
      }
      lotEntries.push({ n, lot, p1, p2 });
      continue;
    }

    const idx = (n - 1) % COMPLEJOS.length;
    const { complejo, sheds } = complejos[idx];
    const fechaAloj = addDays(START, (n - 1) * DAYS_BETWEEN_LOTS);
    const hembras = randomInt(15000, 20000);
    const machos = Math.round(hembras * (0.12 + Math.random() * 0.06));
    const raza = n % 3 === 0 ? "ROSS" : "COBB";

    const lot = await Lot.create({
      codigo, granjaId: farm._id, raza, sexo: "hembra",
      estado: "activo", etapa: "levante",
      hembras, machos, fechaAlojamiento: fechaAloj,
    });

    const p1 = await Placement.create({
      loteId: lot._id, galponId: sheds[0]._id,
      hembras: Math.floor(hembras / 2), machos: Math.floor(machos / 2),
      fechaAlojamiento: fechaAloj, tipo: "levante", estado: "activo",
    });

    const p2 = await Placement.create({
      loteId: lot._id, galponId: sheds[1]._id,
      hembras: hembras - Math.floor(hembras / 2), machos: machos - Math.floor(machos / 2),
      fechaAlojamiento: fechaAloj, tipo: "levante", estado: "activo",
    });

    lotEntries.push({ n, lot, p1, p2, fechaAloj, complejo, sheds });
    lotsCreated++;
  }
  console.log(`Lotes: ${lotsCreated} nuevos, ${existingSet.size} existentes`);

  if (lotsCreated === 0) {
    console.log("No hay lotes nuevos que procesar. Seed finalizado.");
    process.exit(0);
  }

  // ──── MORTALIDAD DIARIA (levante, solo lotes nuevos) ────
  console.log("\nGenerando mortalidad diaria (levante)...");
  let totalMortLevante = 0;
  const mortBatch = [];

  for (const e of lotEntries) {
    if (!e.fechaAloj) continue; // skip existing lots
    const { lot, sheds, fechaAloj } = e;
    const maxWeeks = Math.min(getAgeWeeks(fechaAloj, NOW), 24);
    if (maxWeeks < 1) continue;

    const ingresoH = randomInt(5, 15);
    const ingresom = randomInt(1, 4);
    mortBatch.push(makeMortRecord(lot._id, sheds[0]._id, farm._id, fechaAloj, 0,
      ingresoH, "hembra", "Mortalidad en alojamiento", "levante", "alojamiento"));
    mortBatch.push(makeMortRecord(lot._id, sheds[1]._id, farm._id, fechaAloj, 0,
      ingresom, "macho", "Mortalidad en alojamiento", "levante", "alojamiento"));

    for (let w = 0; w <= maxWeeks; w++) {
      const weekStart = addDays(fechaAloj, w * 7);
      const daysInWeek = w === maxWeeks
        ? Math.min(7, Math.ceil((NOW - weekStart) / 86400000)) : 7;
      const freq = w <= 4 ? 1 : w <= 12 ? 2 : 3;

      for (let d = 0; d < daysInWeek; d += freq) {
        const fecha = addDays(weekStart, d);
        if (fecha > NOW) break;
        const galpon = d < daysInWeek / 2 ? sheds[0]._id : sheds[1]._id;
        const mortH = randomInt(1, w <= 4 ? 8 : 4);
        const mortM = randomInt(0, 3);
        const causa = pick(CAUSAS);

        if (mortH > 0) mortBatch.push(makeMortRecord(lot._id, galpon, farm._id, fecha, w, mortH, "hembra", causa, "levante"));
        if (mortM > 0) mortBatch.push(makeMortRecord(lot._id, galpon, farm._id, fecha, w, mortM, "macho", causa, "levante"));

        if (mortBatch.length >= 500) {
          await FieldRecord.insertMany(mortBatch);
          totalMortLevante += mortBatch.length;
          mortBatch.length = 0;
        }
      }
    }
  }

  if (mortBatch.length > 0) {
    await FieldRecord.insertMany(mortBatch);
    totalMortLevante += mortBatch.length;
  }
  console.log(`  ${totalMortLevante} registros de mortalidad en levante`);

  // ──── CAPITALIZACIONES ────
  console.log("\nCapitalizando lotes en semana 25...");
  let capCount = 0;
  let prodCount = 0;
  const prodBatch = [];

  for (const e of lotEntries) {
    if (!e.fechaAloj) continue;
    const { lot, sheds, fechaAloj } = e;
    const capDate = addDays(fechaAloj, 25 * 7);
    if (capDate > NOW) continue;

    const yaCapitalizado = await Transfer.findOne({ loteId: lot._id, tipo: "capitalizacion" });
    if (yaCapitalizado) continue;

    const morts = await FieldRecord.find({
      loteId: lot._id, module: "mortalidad", "meta.tipo": { $ne: "alojamiento" },
    }).lean();

    let totalMortH = 0, totalMortM = 0;
    for (const m of morts) {
      if (m.data.sexo === "hembra") totalMortH += m.data.mortalidad;
      else totalMortM += m.data.mortalidad;
    }

    const liveH = Math.max(0, lot.hembras - totalMortH);
    const liveM = Math.max(0, lot.machos - totalMortM);
    if (liveH <= 0) continue;

    const transitoH = randomInt(2, 8);
    const transitoM = liveM > 0 ? randomInt(0, 3) : 0;

    await Transfer.create({
      loteId: lot._id, origenGalponId: sheds[0]._id, destinoGalponId: sheds[1]._id,
      hembrasTrasladadas: Math.floor(liveH / 2), machosTrasladadas: Math.floor(liveM / 2),
      mortalidadHembras: transitoH, mortalidadMachos: transitoM,
      fecha: capDate, tipo: "capitalizacion",
      notas: `Capitalización lote ${lot.codigo} a los 25 semanas`,
      createdBy: supervisorUser._id,
    });

    const p1 = await Placement.findById(e.p1._id);
    p1.estado = "cerrado"; p1.hembras = 0; p1.machos = 0;
    await p1.save();

    const p2 = await Placement.findById(e.p2._id);
    p2.hembras += Math.floor(liveH / 2) - transitoH;
    p2.machos += Math.floor(liveM / 2) - transitoM;
    p2.tipo = "postura";
    await p2.save();

    await Lot.findByIdAndUpdate(lot._id, { etapa: "postura" });
    capCount++;

    // Producción
    const maxProdWeeks = Math.min(getAgeWeeks(capDate, NOW), 6);
    for (let w = 0; w < maxProdWeeks; w++) {
      const weekStart = addDays(capDate, w * 7);
      const daysInWeek = w === maxProdWeeks - 1
        ? Math.min(7, Math.ceil((NOW - weekStart) / 86400000)) : 7;
      const freq = w <= 2 ? 1 : 2;

      for (let d = 0; d < daysInWeek; d += freq) {
        const fecha = addDays(weekStart, d);
        if (fecha > NOW) break;

        const edad = 25 + w;
        const gallinasVivas = p2.hembras - Math.floor(totalMortH * (w / maxProdWeeks));
        const huevosPorDia = Math.round(gallinasVivas * (0.60 + Math.random() * 0.10));
        const aprovechamiento = 0.85 + Math.random() * 0.11;
        const incubable = Math.round(huevosPorDia * aprovechamiento);

        const registros = [
          { categoria: "huevo-clase-a", cantidad: Math.round(incubable * (0.65 + Math.random() * 0.08)) },
          { categoria: "huevo-clase-b", cantidad: Math.round(incubable * (0.12 + Math.random() * 0.05)) },
          { categoria: "huevo-d-yema", cantidad: Math.round(huevosPorDia * (0.02 + Math.random() * 0.03)) },
          { categoria: "huevo-infertil", cantidad: Math.round(huevosPorDia * (0.01 + Math.random() * 0.02)) },
          { categoria: "huevos-sucios", cantidad: Math.round(huevosPorDia * (0.02 + Math.random() * 0.02)) },
          { categoria: "huevos-micro-fisurados", cantidad: Math.round(huevosPorDia * (0.01 + Math.random() * 0.02)) },
          { categoria: "huevos-pequenos", cantidad: Math.round(huevosPorDia * (0.005 + Math.random() * 0.01)) },
          { categoria: "huevo-cascara-delgada", cantidad: Math.round(huevosPorDia * (0.005 + Math.random() * 0.01)) },
          { categoria: "huevo-roto", cantidad: Math.round(huevosPorDia * (0.005 + Math.random() * 0.01)) },
        ];

        const suma = registros.reduce((s, r) => s + r.cantidad, 0);
        if (suma !== huevosPorDia && registros.length > 0) {
          registros[registros.length - 1].cantidad += huevosPorDia - suma;
        }

        prodBatch.push({
          clientId: uuidv4(), module: "produccion", fecha,
          granjaId: farm._id, galponId: sheds[1]._id, loteId: lot._id,
          etapa: "postura", edad,
          data: { registros, raza: lot.raza }, meta: {},
          createdBy: operarioUser._id, audit: { createdByName: operarioUser.nombre },
        });

        if (prodBatch.length >= 500) {
          await FieldRecord.insertMany(prodBatch);
          prodCount += prodBatch.length;
          prodBatch.length = 0;
        }
      }
    }
  }

  if (prodBatch.length > 0) {
    await FieldRecord.insertMany(prodBatch);
    prodCount += prodBatch.length;
  }
  console.log(`  ${capCount} capitalizaciones, ${prodCount} registros de producción`);

  // Mortalidad postura
  console.log("\nGenerando mortalidad diaria (postura)...");
  let totalMortPostura = 0;
  const mortPostBatch = [];

  const capLotes = await Transfer.find({ tipo: "capitalizacion" }).lean();
  const capLoteIds = new Set(capLotes.map((t) => String(t.loteId)));

  for (const e of lotEntries) {
    if (!e.fechaAloj || !capLoteIds.has(String(e.lot._id))) continue;
    const { lot, sheds, fechaAloj } = e;
    const capDate = addDays(fechaAloj, 25 * 7);
    const maxWeeks = Math.min(getAgeWeeks(capDate, NOW), 6);

    for (let w = 0; w < maxWeeks; w++) {
      const weekStart = addDays(capDate, w * 7);
      const daysInWeek = Math.min(7, Math.ceil((NOW - weekStart) / 86400000));
      for (let d = 0; d < daysInWeek; d += 2) {
        const fecha = addDays(weekStart, d);
        if (fecha > NOW) break;
        const mortH = randomInt(0, 3);
        const mortM = randomInt(0, 1);
        const causa = pick(CAUSAS);
        if (mortH > 0) mortPostBatch.push(makeMortRecord(lot._id, sheds[1]._id, farm._id, fecha, 25 + w, mortH, "hembra", causa, "postura"));
        if (mortM > 0) mortPostBatch.push(makeMortRecord(lot._id, sheds[1]._id, farm._id, fecha, 25 + w, mortM, "macho", causa, "postura"));
        if (mortPostBatch.length >= 500) {
          await FieldRecord.insertMany(mortPostBatch);
          totalMortPostura += mortPostBatch.length;
          mortPostBatch.length = 0;
        }
      }
    }
  }

  if (mortPostBatch.length > 0) {
    await FieldRecord.insertMany(mortPostBatch);
    totalMortPostura += mortPostBatch.length;
  }
  console.log(`  ${totalMortPostura} registros de mortalidad en postura`);

  // ──── RESUMEN ────
  console.log("\n========================================");
  console.log("  SEED COMPLETADO (sin borrar datos existentes)");
  console.log("========================================");
  console.log(`
Resumen:
  Granja:           ${(await Farm.countDocuments({}))}
  Complejos:        ${(await Complex.countDocuments({}))}
  Galpones:         ${(await Shed.countDocuments({}))}
  Usuarios:         ${(await User.countDocuments({}))}
  Lotes:            ${(await Lot.countDocuments({}))}
  Alojamientos:     ${(await Placement.countDocuments({}))}
  Capitalizaciones: ${(await Transfer.countDocuments({}))}
  Mortalidad:       ${(await FieldRecord.countDocuments({ module: "mortalidad" }))}
  Producción:       ${(await FieldRecord.countDocuments({ module: "produccion" }))}

Usuarios:
  admin / admin123       → administrador
  supervisor / super123  → supervisor
  operario / opera123    → operador
`);

  process.exit(0);
}

main().catch((err) => {
  console.error("Error:", err);
  process.exit(1);
});
