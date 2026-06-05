import { Schema, model } from "mongoose";

const auditEventSchema = new Schema(
  {
    actorId: { type: Schema.Types.ObjectId, ref: "User" },
    action: { type: String, required: true, index: true },
    entityType: { type: String, required: true, index: true },
    entityId: { type: Schema.Types.ObjectId },
    metadata: { type: Schema.Types.Mixed }
  },
  { timestamps: true }
);

export const AuditEvent = model("AuditEvent", auditEventSchema);

