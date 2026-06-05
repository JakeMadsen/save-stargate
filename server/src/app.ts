import path from "node:path";
import { fileURLToPath } from "node:url";
import MongoStore from "connect-mongo";
import cookieParser from "cookie-parser";
import cors from "cors";
import express from "express";
import session from "express-session";
import { config, isProduction } from "./config.js";
import { attachUser } from "./middleware/auth.js";
import { adminRouter } from "./routes/admin.js";
import { authRouter } from "./routes/auth.js";
import { publicRouter } from "./routes/public.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export const createApp = () => {
  const app = express();

  app.use(
    cors({
      origin: isProduction ? config.appUrl : ["http://localhost:5173", "http://127.0.0.1:5173"],
      credentials: true
    })
  );
  app.use(express.json({ limit: "1mb" }));
  app.use(cookieParser());
  app.use(
    session({
      name: "save-the-gate.sid",
      secret: config.sessionSecret,
      resave: false,
      saveUninitialized: false,
      store: MongoStore.create({ mongoUrl: config.mongoUri }),
      cookie: {
        httpOnly: true,
        sameSite: "lax",
        secure: isProduction && config.appUrl.startsWith("https://"),
        maxAge: 1000 * 60 * 60 * 24 * 30
      }
    })
  );
  app.use(attachUser);

  app.use("/api/auth", authRouter);
  app.use("/api/public", publicRouter);
  app.use("/api/admin", adminRouter);

  app.get("/api/health", (_req, res) => {
    res.json({ ok: true });
  });

  if (isProduction) {
    const clientDir = path.resolve(__dirname, "../../client");
    app.use(express.static(clientDir));
    app.get(/.*/, (_req, res) => {
      res.sendFile(path.join(clientDir, "index.html"));
    });
  }

  app.use((error: Error, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
    console.error(error);
    res.status(500).json({ error: isProduction ? "Internal server error" : error.message });
  });

  return app;
};
