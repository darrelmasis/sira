import mongoose from "mongoose";

const UserSchema = new mongoose.Schema(
  {
    username: {
      type: String,
      required: true,
      unique: true,
      trim: true,
    },

    passwordHash: {
      type: String,
      required: true,
    },

    nombre: {
      type: String,
      required: true,
    },

    email: {
      type: String,
      required: true,
      unique: true,
    },

    role: {
      type: String,
      enum: ["admin", "supervisor", "operador", "desarrollador"],
      default: "operador",
    },

    granjasAsignadas: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Farm",
      },
    ],

    active: {
      type: Boolean,
      default: true,
    },

    avatarId: {
      type: String,
      default: null,
      trim: true,
    },

    avatarColorIndex: {
      type: Number,
      default: null,
      min: 0,
    },

    passwordResetTokenHash: {
      type: String,
      default: null,
    },

    passwordResetExpiresAt: {
      type: Date,
      default: null,
    },

    passwordResetRequestedAt: {
      type: Date,
      default: null,
    },
  },
  {
    timestamps: true,
  },
);

export default mongoose.models.User || mongoose.model("User", UserSchema);
