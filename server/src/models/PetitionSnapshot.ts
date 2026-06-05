import { Schema, model } from "mongoose";

const petitionSnapshotSchema = new Schema(
  {
    petitionId: { type: Schema.Types.ObjectId, ref: "Petition", required: true, index: true },
    count: { type: Number, required: true },
    goal: { type: Number, default: 0 },
    source: { type: String, enum: ["sync", "manual"], required: true },
    capturedAt: { type: Date, default: Date.now, index: true }
  },
  { timestamps: true }
);

export const PetitionSnapshot = model("PetitionSnapshot", petitionSnapshotSchema);

