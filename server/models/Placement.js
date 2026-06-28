import mongoose from "mongoose";

const PlacementSchema = new mongoose.Schema(
  {
    loteId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Lot",
      required: true,
      index: true,
    },
    galponId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Shed",
      required: true,
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
    fechaAlojamiento: {
      type: Date,
      required: true,
      index: true,
    },
  },
  {
    timestamps: { createdAt: true, updatedAt: false },
    collection: "alojamientos",
  },
);

export default mongoose.models.Placement || mongoose.model("Placement", PlacementSchema);
