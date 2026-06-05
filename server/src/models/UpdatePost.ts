import { Schema, model } from "mongoose";
import { contentStatuses } from "../../../shared/src/index.js";

const updatePostSchema = new Schema(
  {
    title: { type: String, required: true },
    slug: { type: String, required: true, unique: true, index: true },
    summary: { type: String, required: true },
    bodyMarkdown: { type: String, required: true },
    tags: [{ type: String }],
    status: { type: String, enum: contentStatuses, default: "draft", index: true },
    pinned: { type: Boolean, default: false, index: true },
    allowComments: { type: Boolean, default: true },
    publishedAt: Date,
    createdBy: { type: Schema.Types.ObjectId, ref: "User" },
    updatedBy: { type: Schema.Types.ObjectId, ref: "User" }
  },
  { timestamps: true }
);

export const UpdatePost = model("UpdatePost", updatePostSchema);

