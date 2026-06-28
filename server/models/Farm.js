import mongoose from "mongoose";

const FarmSchema = new mongoose.Schema(
  {
    nombre: {
      type: String,
      required: true,
      trim: true,
    },
    tipo: {
      type: String,
      enum: ["reproductora", "engorde"],
      required: true,
    },
    active: {
      type: Boolean,
      default: true,
    },
  },
  {
    timestamps: true,
    collection: "granjas",
  },
);

export default mongoose.models.Farm || mongoose.model("Farm", FarmSchema);
