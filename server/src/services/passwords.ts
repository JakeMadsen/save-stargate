import bcrypt from "bcryptjs";

const saltRounds = 12;

export const hashPassword = (password: string) => bcrypt.hash(password, saltRounds);

export const verifyPassword = (password: string, passwordHash: string | undefined | null) => {
  if (!passwordHash) return false;
  return bcrypt.compare(password, passwordHash);
};

