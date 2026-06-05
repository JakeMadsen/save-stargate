import { Schema, model } from "mongoose";
import { fanMessageStatuses } from "../../../shared/src/index.js";

const fanMessageSchema = new Schema(
  {
    displayName: { type: String, default: "" },
    email: { type: String, lowercase: true, trim: true },
    message: { type: String, required: true },
    authorId: { type: Schema.Types.ObjectId, ref: "User", index: true },
    status: { type: String, enum: fanMessageStatuses, default: "pending", index: true },
    anonymous: { type: Boolean, default: true, index: true },
    tokenHash: { type: String, index: true },
    tokenExpiresAt: Date,
    verifiedAt: Date,
    ipHash: String,
    userAgent: String
  },
  { timestamps: true }
);

export const FanMessage = model("FanMessage", fanMessageSchema);
