import type { Role } from "../../../shared/src/index.js";

const roleRank: Record<Role, number> = {
  user: 0,
  moderator: 1,
  admin: 2,
  owner: 3
};

export const hasRole = (role: Role | undefined, minimum: Role) => {
  if (!role) return false;
  return roleRank[role] >= roleRank[minimum];
};

export const canManageRole = (actorRole: Role, targetRole: Role) => {
  if (actorRole === "owner") return true;
  if (actorRole === "admin") return targetRole === "moderator" || targetRole === "user";
  return false;
};

