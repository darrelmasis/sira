import mongoose from "mongoose";

const ComplexSchema = new mongoose.Schema(
  {
    granjaId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Farm",
      required: true,
      index: true,
    },
    nombre: {
      type: String,
      required: true,
      trim: true,
    },
    active: {
      type: Boolean,
      default: true,
    },
  },
  {
    timestamps: true,
    collection: "complejos",
  },
);

ComplexSchema.index({ granjaId: 1, nombre: 1 }, { unique: true });

export default mongoose.models.Complex || mongoose.model("Complex", ComplexSchema);
