import { Schema, model } from "mongoose";
import { petitionStatuses } from "../../../shared/src/index.js";

const petitionSchema = new Schema(
  {
    title: { type: String, required: true },
    platform: { type: String, default: "change.org" },
    url: { type: String, required: true },
    description: { type: String, required: true },
    status: { type: String, enum: petitionStatuses, default: "active", index: true },
    currentCount: { type: Number, default: 0 },
    goalCount: { type: Number, default: 0 },
    displayOrder: { type: Number, default: 100, index: true },
    lastSyncedAt: Date,
    syncStatus: { type: String, enum: ["never", "ok", "failed", "disabled"], default: "never", index: true },
    manualOverride: { type: Boolean, default: false },
    syncDisabledReason: String
  },
  { timestamps: true }
);

export const Petition = model("Petition", petitionSchema);
