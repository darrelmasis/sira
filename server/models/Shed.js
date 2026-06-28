import mongoose from "mongoose";

const ShedSchema = new mongoose.Schema(
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
    collection: "galpones",
  },
);

export default mongoose.models.Shed || mongoose.model("Shed", ShedSchema);
