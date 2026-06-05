import { Schema, model } from "mongoose";
import { contactMessageCategories, contactMessageStatuses } from "../../../shared/src/index.js";

const contactMessageSchema = new Schema(
  {
    name: String,
    email: { type: String, lowercase: true, trim: true },
    subject: { type: String, required: true },
    category: { type: String, enum: contactMessageCategories, default: "general", index: true },
    message: { type: String, required: true },
    status: { type: String, enum: contactMessageStatuses, default: "new", index: true },
    adminNote: String,
    reviewedBy: { type: Schema.Types.ObjectId, ref: "User" },
    reviewedAt: Date,
    ipHash: String,
    userAgent: String
  },
  { timestamps: true }
);

export const ContactMessage = model("ContactMessage", contactMessageSchema);
