import mongoose from "mongoose";
import { requireEnv } from "../env.js";

let cached = global.mongoose;

if (!cached) {
  cached = global.mongoose = {
    conn: null,
    promise: null,
  };
}

export async function connectMongo() {
  if (cached.conn) {
    return cached.conn;
  }

  const mongoUri = requireEnv("MONGO_URI");

  if (!cached.promise) {
    cached.promise = mongoose.connect(mongoUri, {
      bufferCommands: false,
    });
  }

  cached.conn = await cached.promise;

  console.log("Conexión exitosa a MongoDB");
  return cached.conn;
}
