import Dexie from "dexie";

export const localDb = new Dexie("sira-db");

localDb.version(1).stores({
  syncQueue: "id, module, syncStatus, createdAt, updatedAt",
  meta: "key",
});

localDb.version(2).stores({
  syncQueue: "id, module, syncStatus, createdAt, updatedAt",
  meta: "key",
  farms: "id, nombre, tipo, active",
  sheds: "id, granjaId, nombre, active",
  lots: "id, codigo, granjaId, estado",
  placements: "id, loteId, galponId, fechaAlojamiento",
});

localDb.version(3).stores({
  syncQueue: "id, module, syncStatus, createdAt, updatedAt, fecha",
  meta: "key",
  farms: "id, nombre, tipo, active",
  sheds: "id, granjaId, nombre, active",
  lots: "id, codigo, granjaId, estado",
  placements: "id, loteId, galponId, fechaAlojamiento",
});
