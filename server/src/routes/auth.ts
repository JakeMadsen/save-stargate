import { Router } from "express";
import { acceptInviteSchema, loginRequestSchema } from "../../../shared/src/index.js";
import { asyncRoute } from "../utils/asyncRoute.js";
import { validateBody } from "../middleware/validate.js";
import { User } from "../models/User.js";
import { consumeInviteToken } from "../services/authTokens.js";
import { hashPassword, verifyPassword } from "../services/passwords.js";

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
