import mongoose from "mongoose";
import { ALL_ROLES } from "../utils/permissions.defaults.js";

const RolePermissionSchema = new mongoose.Schema(
  {
    role: {
      type: String,
      enum: ALL_ROLES,
      required: true,
      unique: true,
    },
    permissions: {
      type: [String],
      default: [],
    },
  },
  {
    collection: "role_permissions",
    timestamps: true,
  },
);

export default mongoose.models.RolePermission || mongoose.model("RolePermission", RolePermissionSchema);
