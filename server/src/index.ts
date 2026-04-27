import http from "node:http";
import express from "express";
import cors from "cors";
import helmet from "helmet";
import rateLimit from "express-rate-limit";
import { config } from "./config.js";
import { log } from "./utils/log.js";
import { agentRouter } from "./routes/agent.js";
import { filesRouter } from "./routes/files.js";
import { projectsRouter } from "./routes/projects.js";
import { attachTerminalWS } from "./ws/terminal.js";

const app = express();

app.disable("x-powered-by");
app.use(helmet({ contentSecurityPolicy: false }));
app.use(
  cors({
    origin: (origin, cb) => {
      if (!origin) return cb(null, true);
      if (config.ALLOWED_ORIGINS.includes(origin)) return cb(null, true);
      return cb(new Error(`origin ${origin} not allowed`));
    },
    credentials: true,
  }),
);
app.use(express.json({ limit: "2mb" }));
app.use(express.urlencoded({ extended: false }));

app.use(
  rateLimit({
    windowMs: config.RATE_LIMIT_WINDOW_MS,
    max: config.RATE_LIMIT_MAX,
    standardHeaders: true,
    legacyHeaders: false,
  }),
);

app.get("/healthz", (_req, res) => {
  res.json({ ok: true, service: "aqualibria-agent-backend", version: "0.1.0", env: config.NODE_ENV });
});

app.use("/api/agent", agentRouter);
app.use("/api/agent", filesRouter);
app.use("/api/agent", projectsRouter);

app.use((req, res) => {
  res.status(404).json({ error: "not found", path: req.path });
});

app.use((err: unknown, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
  log.error({ err }, "unhandled error");
  res.status(500).json({ error: err instanceof Error ? err.message : "internal error" });
});

const server = http.createServer(app);
attachTerminalWS(server);

server.listen(config.PORT, config.HOST, () => {
  log.info(
    { port: config.PORT, host: config.HOST, sandbox: config.SANDBOX_MODE, env: config.NODE_ENV },
    "Aqualibria Master Architect backend listening",
  );
});

process.on("SIGTERM", () => {
  log.info("SIGTERM received, shutting down");
  server.close(() => process.exit(0));
});
process.on("SIGINT", () => {
  log.info("SIGINT received, shutting down");
  server.close(() => process.exit(0));
});
