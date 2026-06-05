import { Schema, model } from "mongoose";

const loginTokenSchema = new Schema(
  {
    email: { type: String, required: true, lowercase: true, trim: true, index: true },
    tokenHash: { type: String, required: true, unique: true },
    purpose: { type: String, enum: ["invite"], default: "invite" },
    role: { type: String, enum: ["admin", "moderator", "user"] },
    expiresAt: { type: Date, required: true, index: { expires: 0 } },
    usedAt: Date,
    invitedBy: { type: Schema.Types.ObjectId, ref: "User" }
  },
  { timestamps: true }
);

export const LoginToken = model("LoginToken", loginTokenSchema);
