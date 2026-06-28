import argon2 from "argon2";
import { loadEnv } from "../env.js";

loadEnv();

const [
  { connectMongo },
  { default: Farm },
  { default: Shed },
  { default: Lot },
  { default: Placement },
  { default: User },
  { seedDefaultPermissions },
] = await Promise.all([
  import("../db/mongo.js"),
  import("../models/Farm.js"),
  import("../models/Shed.js"),
  import("../models/Lot.js"),
  import("../models/Placement.js"),
  import("../models/User.js"),
  import("../utils/permissions.js"),
]);

async function upsertOne(Model, filter, data) {
  return Model.findOneAndUpdate(filter, { $set: data }, { new: true, upsert: true, setDefaultsOnInsert: true });
}

async function seedAdmin() {
  const password = process.env.SIRA_SEED_ADMIN_PASSWORD;

  if (!password) {
    console.log("Admin omitido: define SIRA_SEED_ADMIN_PASSWORD para crearlo.");
    return null;
  }

  const passwordHash = await argon2.hash(password);

  return upsertOne(
    User,
    { username: "admin" },
    {
      username: "admin",
      passwordHash,
      nombre: "Administrador SIRA",
      email: "admin@sira.local",
      role: "admin",
      active: true,
    },
  );
}

async function seedCatalogs() {
  const farm = await upsertOne(
    Farm,
    { nombre: "Granja Piloto" },
    {
      nombre: "Granja Piloto",
      tipo: "reproductora",
      active: true,
    },
  );

  const shedA = await upsertOne(
    Shed,
    { granjaId: farm._id, nombre: "Galpón 1" },
    {
      granjaId: farm._id,
      nombre: "Galpón 1",
      active: true,
    },
  );

  const shedB = await upsertOne(
    Shed,
    { granjaId: farm._id, nombre: "Galpón 2" },
    {
      granjaId: farm._id,
      nombre: "Galpón 2",
      active: true,
    },
  );

  const lot = await upsertOne(
    Lot,
    { codigo: "LOTE-001" },
    {
      codigo: "LOTE-001",
      granjaId: farm._id,
      raza: "COBB",
      sexo: "mixto",
      estado: "activo",
      hembras: 5000,
      machos: 500,
    },
  );

  await upsertOne(
    Placement,
    { loteId: lot._id, galponId: shedA._id },
    {
      loteId: lot._id,
      galponId: shedA._id,
      hembras: 2500,
      machos: 250,
      fechaAlojamiento: new Date("2026-01-01T00:00:00.000Z"),
    },
  );

  await upsertOne(
    Placement,
    { loteId: lot._id, galponId: shedB._id },
    {
      loteId: lot._id,
      galponId: shedB._id,
      hembras: 2500,
      machos: 250,
      fechaAlojamiento: new Date("2026-01-01T00:00:00.000Z"),
    },
  );

  return { farm, sheds: [shedA, shedB], lot };
}

async function seedDeveloper() {
  const password = process.env.SIRA_SEED_DEV_PASSWORD;

  if (!password) {
    console.log("Developer omitido: define SIRA_SEED_DEV_PASSWORD para crearlo.");
    return null;
  }

  const passwordHash = await argon2.hash(password);

  return upsertOne(
    User,
    { username: "developer" },
    {
      username: "developer",
      passwordHash,
      nombre: "Desarrollador SIRA",
      email: "dev@sira.local",
      role: "desarrollador",
      granjasAsignadas: [],
      active: true,
    },
  );
}

async function main() {
  await connectMongo();
  const admin = await seedAdmin();
  const developer = await seedDeveloper();
  const catalogs = await seedCatalogs();
  await seedDefaultPermissions();

  console.log("Seed Mongo completado.");
  console.log(`Usuario admin: ${admin ? "creado/actualizado" : "omitido"}`);
  console.log(`Usuario developer: ${developer ? "creado/actualizado" : "omitido"}`);
  console.log(`Granja: ${catalogs.farm.nombre}`);
  console.log(`Galpones: ${catalogs.sheds.length}`);
  console.log(`Lote: ${catalogs.lot.codigo}`);
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
