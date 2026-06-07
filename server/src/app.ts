import path from "node:path";
import { fileURLToPath } from "node:url";
import MongoStore from "connect-mongo";
import cookieParser from "cookie-parser";
import cors from "cors";
import express from "express";
import session from "express-session";
import mongoose from "mongoose";
import { config, isProduction } from "./config.js";
import { attachUser } from "./middleware/auth.js";
import { adminRouter } from "./routes/admin.js";
import { authRouter } from "./routes/auth.js";
import { publicRouter } from "./routes/public.js";
import { CommunityTopic } from "./models/CommunityTopic.js";
import { UpdatePost } from "./models/UpdatePost.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const cleanBaseUrl = (value: string) => value.replace(/\/+$/, "");
const requestBaseUrl = (req: express.Request) => {
  const configured = cleanBaseUrl(config.appUrl);
  if (!configured.includes("localhost") && !configured.includes("127.0.0.1")) return configured;

  const forwardedProto = req.get("x-forwarded-proto")?.split(",")[0]?.trim();
  const proto = forwardedProto || req.protocol;
  const forwardedHost = req.get("x-forwarded-host")?.split(",")[0]?.trim();
  const host = forwardedHost || req.get("host");
  return host ? `${proto}://${host}` : configured;
};

const escapeXml = (value: string) =>
  value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");

const publicPages = [
  { path: "/", priority: "1.0", changefreq: "daily" },
  { path: "/updates", priority: "0.8", changefreq: "daily" },
  { path: "/petitions", priority: "0.9", changefreq: "hourly" },
  { path: "/contacts", priority: "0.8", changefreq: "weekly" },
  { path: "/community", priority: "0.7", changefreq: "daily" },
  { path: "/fan-messages", priority: "0.7", changefreq: "daily" },
  { path: "/resources", priority: "0.6", changefreq: "weekly" },
  { path: "/write-us", priority: "0.4", changefreq: "monthly" }
];

export const createApp = (options: { databaseAvailable?: boolean } = {}) => {
  const app = express();
  if (isProduction) {
    app.set("trust proxy", 1);
  }
  const databaseAvailable = options.databaseAvailable ?? mongoose.connection.readyState === 1;
  const sessionStore = databaseAvailable
    ? MongoStore.create({ client: mongoose.connection.getClient() as any })
    : new session.MemoryStore();

  sessionStore.on?.("error", (error) => {
    console.error("Session store error:", error);
  });
  const sessionMiddleware = session({
    name: "save-the-gate.sid",
    secret: config.sessionSecret,
    resave: false,
    saveUninitialized: false,
    proxy: isProduction,
    store: sessionStore,
    cookie: {
      httpOnly: true,
      sameSite: "lax",
      secure: isProduction ? "auto" : false,
      maxAge: 1000 * 60 * 60 * 24 * 30
    }
  });

  app.use(
    cors({
      origin: isProduction ? config.appUrl : ["http://localhost:5173", "http://127.0.0.1:5173"],
      credentials: true
    })
  );
  app.use(express.json({ limit: "1mb" }));
  app.use(cookieParser());

  const uploadsDir = path.resolve(process.cwd(), "uploads");
  app.use("/uploads", express.static(uploadsDir));

  app.get("/api/health", (_req, res) => {
    res.json({ ok: true, database: databaseAvailable ? "connected" : "unavailable" });
  });

  app.get("/robots.txt", (req, res) => {
    const baseUrl = requestBaseUrl(req);
    res.type("text/plain").send([
      "User-agent: *",
      "Allow: /",
      "Disallow: /admin",
      "Disallow: /login",
      "Disallow: /signup",
      "Disallow: /verify-email",
      "Disallow: /invite",
      `Sitemap: ${baseUrl}/sitemap.xml`,
      ""
    ].join("\n"));
  });

  app.get("/sitemap.xml", async (req, res, next) => {
    try {
      const baseUrl = requestBaseUrl(req);
      const dynamicPages = databaseAvailable
        ? await Promise.all([
            UpdatePost.find({ status: "published" }).select("slug updatedAt publishedAt").lean(),
            CommunityTopic.find({ status: "published" }).select("slug updatedAt").lean()
          ]).catch((error) => {
            console.error("Sitemap dynamic route lookup failed:", error);
            return [[], []];
          })
        : [[], []];
      const [updates, topics] = dynamicPages;
      const urls = [
        ...publicPages.map((page) => ({ ...page, lastmod: new Date() })),
        ...updates.map((update) => ({
          path: `/updates/${update.slug}`,
          priority: "0.7",
          changefreq: "weekly",
          lastmod: update.updatedAt ?? update.publishedAt ?? new Date()
        })),
        ...topics.map((topic) => ({
          path: `/community/${topic.slug}`,
          priority: "0.6",
          changefreq: "weekly",
          lastmod: topic.updatedAt ?? new Date()
        }))
      ];
      const xml = [
        '<?xml version="1.0" encoding="UTF-8"?>',
        '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">',
        ...urls.map((url) => [
          "  <url>",
          `    <loc>${escapeXml(`${baseUrl}${url.path}`)}</loc>`,
          `    <lastmod>${new Date(url.lastmod).toISOString().slice(0, 10)}</lastmod>`,
          `    <changefreq>${url.changefreq}</changefreq>`,
          `    <priority>${url.priority}</priority>`,
          "  </url>"
        ].join("\n")),
        "</urlset>",
        ""
      ].join("\n");
      res.type("application/xml").send(xml);
    } catch (error) {
      next(error);
    }
  });

  if (isProduction) {
    const clientDir = path.resolve(__dirname, "../../client");
    app.use(express.static(clientDir));
    app.get(/^\/(?!api(?:\/|$)|uploads(?:\/|$)|robots\.txt$|sitemap\.xml$).*/, (_req, res) => {
      res.sendFile(path.join(clientDir, "index.html"));
    });
  }

  app.use(sessionMiddleware);
  app.use(attachUser);

  if (!databaseAvailable) {
    app.use("/api", (_req, res) => {
      res.status(503).json({ error: "Database unavailable" });
    });
  }

  app.use("/api/auth", authRouter);
  app.use("/api/public", publicRouter);
  app.use("/api/admin", adminRouter);

  app.use((error: Error, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
    console.error(error);
    res.status(500).json({ error: isProduction ? "Internal server error" : error.message });
  });

  return app;
};
