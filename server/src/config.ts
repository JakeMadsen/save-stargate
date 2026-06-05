import dotenv from "dotenv";

dotenv.config();

const numberFromEnv = (name: string, fallback: number) => {
  const value = process.env[name];
  if (!value) return fallback;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
};

const booleanFromEnv = (name: string, fallback: boolean) => {
  const value = process.env[name];
  if (!value) return fallback;
  return ["1", "true", "yes", "on"].includes(value.toLowerCase());
};

const nodeEnv = process.env.NODE_ENV ?? (process.env.npm_lifecycle_event === "start" ? "production" : "development");
const port = numberFromEnv("PORT", 4000);
const mailProvider = process.env.MAIL_PROVIDER?.toLowerCase();
const usesZepto =
  mailProvider === "zeptomail" ||
  Boolean(process.env.ZEPTO_SMTP_HOST || process.env.ZEPTO_SMTP_PASS || process.env.ZEPTOMAIL_SMTP_HOST || process.env.ZEPTOMAIL_SMTP_PASS);
const smtpPort = numberFromEnv("SMTP_PORT", numberFromEnv("ZEPTO_SMTP_PORT", numberFromEnv("ZEPTOMAIL_SMTP_PORT", 587)));
const smtpHost = process.env.SMTP_HOST ?? process.env.ZEPTO_SMTP_HOST ?? process.env.ZEPTOMAIL_SMTP_HOST ?? (usesZepto ? "smtp.zeptomail.eu" : undefined);
const smtpUser = process.env.SMTP_USER ?? process.env.ZEPTO_SMTP_USER ?? process.env.ZEPTOMAIL_SMTP_USER ?? (usesZepto ? "emailapikey" : undefined);
const smtpPass = process.env.SMTP_PASS ?? process.env.ZEPTO_SMTP_PASS ?? process.env.ZEPTOMAIL_SMTP_PASS;
const smtpSecure = booleanFromEnv("SMTP_SECURE", smtpPort === 465);

export const config = {
  nodeEnv,
  port,
  appUrl: process.env.APP_URL ?? (nodeEnv === "production" ? `http://localhost:${port}` : "http://localhost:5173"),
  mongoUri: process.env.MONGO_URI ?? "mongodb://127.0.0.1:27017/save-the-gate",
  sessionSecret: process.env.SESSION_SECRET ?? "dev-session-secret",
  ownerEmail: process.env.OWNER_EMAIL?.toLowerCase(),
  smtp: {
    provider: mailProvider ?? (usesZepto ? "zeptomail" : undefined),
    host: smtpHost,
    port: smtpPort,
    user: smtpUser,
    pass: smtpPass,
    secure: smtpSecure,
    requireTls: booleanFromEnv("SMTP_REQUIRE_TLS", !smtpSecure),
    from: process.env.SMTP_FROM ?? process.env.MAIL_FROM ?? process.env.ZEPTO_FROM ?? process.env.ZEPTOMAIL_FROM ?? "Save The Gate <noreply@savethegate.org>"
  },
  petitionSyncIntervalMinutes: numberFromEnv("PETITION_SYNC_INTERVAL_MINUTES", 60)
};

export const isProduction = config.nodeEnv === "production";
