import { Schema, model } from "mongoose";
import { contentStatuses } from "../../../shared/src/index.js";

const communityTopicSchema = new Schema(
  {
    title: { type: String, required: true },
    slug: { type: String, required: true, unique: true, index: true },
    bodyMarkdown: { type: String, required: true },
    status: { type: String, enum: contentStatuses, default: "draft", index: true },
    pinned: { type: Boolean, default: false, index: true },
    createdBy: { type: Schema.Types.ObjectId, ref: "User" }
  },
  { timestamps: true }
);

export const CommunityTopic = model("CommunityTopic", communityTopicSchema);

