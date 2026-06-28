import mongoose from "mongoose";

const TransferSchema = new mongoose.Schema(
  {
    loteId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Lot",
      required: true,
      index: true,
    },
    origenGalponId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Shed",
      required: true,
      index: true,
    },
    destinoGalponId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Shed",
      required: true,
      index: true,
    },
    hembrasTrasladadas: {
      type: Number,
      min: 0,
      required: true,
    },
    machosTrasladadas: {
      type: Number,
      min: 0,
      required: true,
    },
    mortalidadHembras: {
      type: Number,
      min: 0,
      default: 0,
    },
    mortalidadMachos: {
      type: Number,
      min: 0,
      default: 0,
    },
    fecha: {
      type: Date,
      required: true,
      index: true,
    },
    tipo: {
      type: String,
      enum: ["traslado", "capitalizacion"],
      required: true,
      index: true,
    },
    notas: {
      type: String,
      trim: true,
    },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
  },
  {
    timestamps: true,
    collection: "traslados",
  }
);

export default mongoose.models.Transfer || mongoose.model("Transfer", TransferSchema);
