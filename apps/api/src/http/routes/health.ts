import { Router } from "express";
import type { HealthService } from "../../app/health-service.js";

export function createHealthRouter(healthService: HealthService): Router {
  const router = Router();
  router.get("/health", async (_req, res) => {
    const body = await healthService.getHealth();
    res.status(200).json(body);
  });
  return router;
}
