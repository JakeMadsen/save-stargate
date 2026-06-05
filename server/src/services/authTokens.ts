import { createHash, randomBytes } from "node:crypto";
import type { Types } from "mongoose";
import type { Role } from "../../../shared/src/index.js";
import { config } from "../config.js";
import { LoginToken } from "../models/LoginToken.js";
import { sendInviteEmail, sendVerificationEmail } from "./email.js";

const hashToken = (token: string) => createHash("sha256").update(token).digest("hex");

export const createInviteLink = async (params: {
  email: string;
  role?: Exclude<Role, "owner">;
  invitedBy?: Types.ObjectId;
  baseUrl?: string;
}) => {
  const token = randomBytes(32).toString("base64url");
  const expiresAt = new Date(Date.now() + 1000 * 60 * 60 * 24 * 7);

  await LoginToken.create({
    email: params.email,
    tokenHash: hashToken(token),
    purpose: "invite",
    role: params.role,
    invitedBy: params.invitedBy,
    expiresAt
  });

  const link = `${params.baseUrl ?? config.appUrl}/invite/accept?token=${encodeURIComponent(token)}`;
  await sendInviteEmail(params.email, link);
  return { link, expiresAt };
};

export const createEmailVerificationLink = async (email: string, baseUrl?: string) => {
  const token = randomBytes(32).toString("base64url");
  const expiresAt = new Date(Date.now() + 1000 * 60 * 60 * 24);

  await LoginToken.updateMany(
    {
      email,
      purpose: "verify-email",
      usedAt: { $exists: false }
    },
    { usedAt: new Date() }
  );

  await LoginToken.create({
    email,
    tokenHash: hashToken(token),
    purpose: "verify-email",
    expiresAt
  });

  const link = `${baseUrl ?? config.appUrl}/verify-email?token=${encodeURIComponent(token)}`;
  await sendVerificationEmail(email, link);
  return { link, expiresAt };
};

export const consumeInviteToken = async (token: string) => {
  const record = await LoginToken.findOneAndUpdate(
    {
      tokenHash: hashToken(token),
      purpose: "invite",
      usedAt: { $exists: false },
      expiresAt: { $gt: new Date() }
    },
    { usedAt: new Date() },
    { new: true }
  );

  return record;
};

export const consumeEmailVerificationToken = async (token: string) => {
  const record = await LoginToken.findOneAndUpdate(
    {
      tokenHash: hashToken(token),
      purpose: "verify-email",
      usedAt: { $exists: false },
      expiresAt: { $gt: new Date() }
    },
    { usedAt: new Date() },
    { new: true }
  );

  return record;
};
