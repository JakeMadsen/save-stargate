import { Schema, model, type InferSchemaType } from "mongoose";
import { roles, userStatuses } from "../../../shared/src/index.js";

const userSchema = new Schema(
  {
    email: { type: String, required: true, unique: true, lowercase: true, trim: true, index: true },
    displayName: { type: String, default: "" },
    passwordHash: String,
    passwordSetAt: Date,
    role: { type: String, enum: roles, default: "user", index: true },
    status: { type: String, enum: userStatuses, default: "active", index: true },
    invitedBy: { type: Schema.Types.ObjectId, ref: "User" },
    lastLoginAt: Date
  },
  { timestamps: true }
);

export type UserDocument = InferSchemaType<typeof userSchema> & { _id: Schema.Types.ObjectId };
export const User = model("User", userSchema);
