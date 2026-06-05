import { Router } from "express";
import { acceptInviteSchema, loginRequestSchema, signupRequestSchema, verifyEmailSchema } from "../../../shared/src/index.js";
import { asyncRoute } from "../utils/asyncRoute.js";
import { validateBody } from "../middleware/validate.js";
import { User } from "../models/User.js";
import { consumeEmailVerificationToken, consumeInviteToken, createEmailVerificationLink } from "../services/authTokens.js";
import { isEmailConfigured } from "../services/email.js";
import { hashPassword, verifyPassword } from "../services/passwords.js";
import { isProduction } from "../config.js";
import { getRequestBaseUrl } from "../utils/requestUrl.js";

export const authRouter = Router();

const publicUser = (user: any) => {
  if (!user) return null;
  const data = user.toObject ? user.toObject() : { ...user };
  delete data.passwordHash;
  return data;
};

authRouter.get(
  "/me",
  asyncRoute(async (req, res) => {
    res.json({ user: publicUser(req.user) });
  })
);

authRouter.post(
  "/login",
  validateBody(loginRequestSchema),
  asyncRoute(async (req, res) => {
    const user = await User.findOne({ email: req.body.email });
    if (user?.status === "pending" && (await verifyPassword(req.body.password, user.passwordHash))) {
      return res.status(403).json({ error: "Please verify your email before logging in" });
    }
    if (!user || user.status !== "active" || !(await verifyPassword(req.body.password, user.passwordHash))) {
      return res.status(401).json({ error: "Invalid email or password" });
    }

    user.lastLoginAt = new Date();
    await user.save();
    req.session.userId = String(user._id);
    res.json({ user: publicUser(user) });
  })
);

authRouter.post(
  "/signup",
  validateBody(signupRequestSchema),
  asyncRoute(async (req, res) => {
    const existing = await User.findOne({ email: req.body.email });

    if (existing?.status === "banned") {
      return res.status(403).json({ error: "This account cannot be used" });
    }

    if (existing && existing.role !== "user") {
      return res.status(409).json({ error: "That email is already reserved for a staff account" });
    }

    if (existing?.status === "active") {
      return res.status(409).json({ error: "That email already has an account" });
    }

    const user = existing ?? new User({ email: req.body.email, role: "user" });
    user.displayName = req.body.displayName || user.displayName || "";
    user.passwordHash = await hashPassword(req.body.password);
    user.passwordSetAt = new Date();
    user.status = "pending";
    await user.save();

    const verification = await createEmailVerificationLink(req.body.email, getRequestBaseUrl(req));
    res.status(201).json({
      ok: true,
      message: "Check your email for a verification link.",
      verificationLink: !isEmailConfigured() && !isProduction ? verification.link : undefined
    });
  })
);

authRouter.post(
  "/verify-email",
  validateBody(verifyEmailSchema),
  asyncRoute(async (req, res) => {
    const token = await consumeEmailVerificationToken(req.body.token);
    if (!token) return res.status(400).json({ error: "Invalid or expired verification link" });

    const user = await User.findOne({ email: token.email });
    if (!user || user.status === "banned" || user.role !== "user") {
      return res.status(400).json({ error: "Account cannot be verified" });
    }

    user.status = "active";
    user.lastLoginAt = new Date();
    await user.save();

    req.session.userId = String(user._id);
    res.json({ user: publicUser(user) });
  })
);

authRouter.post(
  "/invites/accept",
  validateBody(acceptInviteSchema),
  asyncRoute(async (req, res) => {
    const token = await consumeInviteToken(req.body.token);
    if (!token) return res.status(400).json({ error: "Invalid or expired invite link" });

    const user = await User.findOneAndUpdate(
      { email: token.email },
      {
        $setOnInsert: {
          email: token.email,
          role: token.role ?? "user",
          invitedBy: token.invitedBy
        },
        $set: {
          displayName: req.body.displayName || undefined,
          passwordHash: await hashPassword(req.body.password),
          passwordSetAt: new Date(),
          lastLoginAt: new Date(),
          status: "active"
        }
      },
      { upsert: true, new: true, setDefaultsOnInsert: true }
    );

    req.session.userId = String(user._id);
    res.json({ user: publicUser(user) });
  })
);

authRouter.post("/logout", (req, res) => {
  req.session.destroy(() => {
    res.clearCookie("save-the-gate.sid");
    res.json({ ok: true });
  });
});
