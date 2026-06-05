import dotenv from "dotenv";

dotenv.config();

const numberFromEnv = (name: string, fallback: number) => {
  const value = process.env[name];
  if (!value) return fallback;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
};

const nodeEnv = process.env.NODE_ENV ?? "development";
const port = numberFromEnv("PORT", 4000);

export const config = {
  nodeEnv,
  port,
  appUrl: process.env.APP_URL ?? (nodeEnv === "production" ? `http://localhost:${port}` : "http://localhost:5173"),
  mongoUri: process.env.MONGO_URI ?? "mongodb://127.0.0.1:27017/save-the-gate",
  sessionSecret: process.env.SESSION_SECRET ?? "dev-session-secret",
  ownerEmail: process.env.OWNER_EMAIL?.toLowerCase(),
  smtp: {
    host: process.env.SMTP_HOST,
    port: numberFromEnv("SMTP_PORT", 587),
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
    from: process.env.SMTP_FROM ?? "Save The Gate <no-reply@localhost>"
  },
  petitionSyncIntervalMinutes: numberFromEnv("PETITION_SYNC_INTERVAL_MINUTES", 60)
};

export const isProduction = config.nodeEnv === "production";
