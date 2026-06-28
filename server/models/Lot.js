import mongoose from "mongoose";

const LotSchema = new mongoose.Schema(
  {
    codigo: {
      type: String,
      required: true,
      trim: true,
      index: true,
    },
    granjaId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Farm",
      required: true,
      index: true,
    },
    raza: {
      type: String,
      enum: ["COBB", "ROSS"],
      required: true,
    },
    sexo: {
      type: String,
      enum: ["macho", "hembra", "mixto"],
      required: true,
    },
    estado: {
      type: String,
      enum: ["activo", "cerrado"],
      default: "activo",
      index: true,
    },
    hembras: {
      type: Number,
      min: 0,
      default: 0,
    },
    machos: {
      type: Number,
      min: 0,
      default: 0,
    },
  },
  {
    timestamps: true,
    collection: "lotes",
  },
);

export default mongoose.models.Lot || mongoose.model("Lot", LotSchema);
