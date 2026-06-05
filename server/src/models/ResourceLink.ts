import { Schema, model } from "mongoose";
import { contentStatuses, resourceTypes } from "../../../shared/src/index.js";

const resourceLinkSchema = new Schema(
  {
    title: { type: String, required: true },
    type: { type: String, enum: resourceTypes, default: "other", index: true },
    url: { type: String, required: true },
    description: { type: String, required: true },
    priority: { type: Number, default: 5, index: true },
    tags: [{ type: String }],
    status: { type: String, enum: contentStatuses, default: "published", index: true }
  },
  { timestamps: true }
);

export const ResourceLink = model("ResourceLink", resourceLinkSchema);

