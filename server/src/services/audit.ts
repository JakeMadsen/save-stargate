import type { Request } from "express";
import { AuditEvent } from "../models/AuditEvent.js";

export const audit = async (
  req: Request,
  action: string,
  entityType: string,
  entityId?: unknown,
  metadata?: Record<string, unknown>
) => {
  await AuditEvent.create({
    actorId: req.user?._id,
    action,
    entityType,
    entityId,
    metadata
  });
};

