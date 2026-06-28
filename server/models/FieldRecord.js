import mongoose from "mongoose";

const FieldRecordSchema = new mongoose.Schema(
  {
    clientId: {
      type: String,
      required: true,
      unique: true,
      index: true,
    },
    module: {
      type: String,
      required: true,
      enum: ["mortalidad", "produccion"],
      index: true,
    },
    fecha: {
      type: Date,
      required: true,
      index: true,
    },
    granjaId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Farm",
      required: true,
      index: true,
    },
    galponId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Shed",
      required: true,
      index: true,
    },
    loteId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Lot",
      required: true,
      index: true,
    },
    etapa: {
      type: String,
      enum: ["levante", "postura"],
      required: true,
    },
    edad: {
      type: Number,
      min: 0,
      required: true,
    },
    data: {
      type: mongoose.Schema.Types.Mixed,
      required: true,
    },
    meta: {
      type: mongoose.Schema.Types.Mixed,
      default: {},
    },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
    },
    updatedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
    },
    audit: {
      createdByName: String,
      updatedByName: String,
      clientCreatedAt: Date,
      clientUpdatedAt: Date,
    },
  },
  {
    timestamps: true,
    collection: "campo",
  },
);

export default mongoose.models.FieldRecord || mongoose.model("FieldRecord", FieldRecordSchema);
