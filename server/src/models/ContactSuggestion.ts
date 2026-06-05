import { Schema, model } from "mongoose";
import { contactKinds, contactLinkTypes, contactSuggestionStatuses } from "../../../shared/src/index.js";

const contactSuggestionSchema = new Schema(
  {
    contactTargetId: { type: Schema.Types.ObjectId, ref: "ContactTarget", index: true },
    targetName: { type: String, required: true },
    kind: { type: String, enum: contactKinds, default: "entity", index: true },
    submitterName: String,
    submitterEmail: String,
    suggestedLabel: { type: String, required: true },
    suggestedType: { type: String, enum: contactLinkTypes, default: "other" },
    suggestedUrl: { type: String, required: true },
    notes: { type: String, required: true },
    status: { type: String, enum: contactSuggestionStatuses, default: "pending", index: true },
    adminNote: String,
    reviewedBy: { type: Schema.Types.ObjectId, ref: "User" },
    reviewedAt: Date
  },
  { timestamps: true }
);

export const ContactSuggestion = model("ContactSuggestion", contactSuggestionSchema);
