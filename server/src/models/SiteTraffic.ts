import { Schema, model } from "mongoose";

const siteTrafficSchema = new Schema(
  {
    dateKey: { type: String, required: true, index: true },
    path: { type: String, required: true, index: true },
    views: { type: Number, default: 0 },
    visitorHashes: { type: [String], default: [] },
    lastSeenAt: Date
  },
  { timestamps: true }
);

siteTrafficSchema.index({ dateKey: 1, path: 1 }, { unique: true });

export const SiteTraffic = model("SiteTraffic", siteTrafficSchema);
