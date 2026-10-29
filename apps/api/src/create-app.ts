import cors from "cors";
import express from "express";
import type { HealthService } from "./app/health-service.js";
import { createHealthRouter } from "./http/routes/health.js";

export function createApp(options: {
  healthService: HealthService;
  webOrigin: string;
}) {
  const app = express();
  app.use(cors({ origin: options.webOrigin }));
  app.use(express.json({ limit: "100kb" }));
  app.use(createHealthRouter(options.healthService));
  return app;
}
