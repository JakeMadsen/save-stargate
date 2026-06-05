import { Schema, model } from "mongoose";
import { commentStatuses } from "../../../shared/src/index.js";

const commentSchema = new Schema(
  {
    parentType: { type: String, enum: ["update", "topic"], required: true, index: true },
    parentId: { type: Schema.Types.ObjectId, required: true, index: true },
    body: { type: String, required: true },
    authorId: { type: Schema.Types.ObjectId, ref: "User", required: true, index: true },
    status: { type: String, enum: commentStatuses, default: "visible", index: true },
    reportCount: { type: Number, default: 0, index: true },
    reports: [
      {
        userId: { type: Schema.Types.ObjectId, ref: "User" },
        reason: String,
        createdAt: { type: Date, default: Date.now }
      }
    ]
  },
  { timestamps: true }
);

export const Comment = model("Comment", commentSchema);

