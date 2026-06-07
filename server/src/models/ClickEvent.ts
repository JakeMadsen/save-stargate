import { Schema, model } from "mongoose";

const clickEventSchema = new Schema(
  {
    dateKey: { type: String, required: true, index: true },
    category: { type: String, required: true, index: true },
    label: { type: String, required: true },
    targetUrl: { type: String, required: true },
    sourcePath: { type: String, required: true, index: true },
    clicks: { type: Number, default: 0 },
    visitorHashes: { type: [String], default: [] },
    lastClickedAt: Date
  },
  { timestamps: true }
);

clickEventSchema.index({ dateKey: 1, category: 1, sourcePath: 1 });

export const ClickEvent = model("ClickEvent", clickEventSchema);
