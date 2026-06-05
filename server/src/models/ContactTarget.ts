import { Schema, model } from "mongoose";
import { contactKinds, contactLinkTypes, contentStatuses } from "../../../shared/src/index.js";

const contactTargetSchema = new Schema(
  {
    name: { type: String, required: true },
    kind: { type: String, enum: contactKinds, default: "person", index: true },
    organization: String,
    role: String,
    address: String,
    publicContactUrl: String,
    sourceUrl: String,
    imageUrl: String,
    imageSourceUrl: String,
    links: [
      {
        label: { type: String, required: true },
        type: { type: String, enum: contactLinkTypes, default: "other", index: true },
        url: { type: String, required: true }
      }
    ],
    priority: { type: Number, default: 3, index: true },
    suggestedMessage: { type: String, required: true },
    notes: String,
    status: { type: String, enum: contentStatuses, default: "published", index: true }
  },
  { timestamps: true }
);

export const ContactTarget = model("ContactTarget", contactTargetSchema);
