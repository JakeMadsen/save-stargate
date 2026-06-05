import type { NextFunction, Request, Response } from "express";
import type { Role } from "../../../shared/src/index.js";
import { User } from "../models/User.js";
import { hasRole } from "../auth/permissions.js";

declare global {
  namespace Express {
    interface Request {
      user?: any;
    }
  }
}

export const attachUser = async (req: Request, _res: Response, next: NextFunction) => {
  if (!req.session.userId) return next();
  const user = await User.findById(req.session.userId);
  if (!user || user.status === "banned") {
    req.session.destroy(() => undefined);
    return next();
  }
  req.user = user;
  next();
};

export const requireAuth = (req: Request, res: Response, next: NextFunction) => {
  if (!req.user) return res.status(401).json({ error: "Authentication required" });
  next();
};

export const requireRole = (role: Role) => (req: Request, res: Response, next: NextFunction) => {
  if (!req.user || !hasRole(req.user.role, role)) {
    return res.status(403).json({ error: "Insufficient permissions" });
  }
  next();
};
