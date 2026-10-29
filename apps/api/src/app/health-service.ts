import type { HealthResponse } from "@go-darom/shared";
import type pg from "pg";
import { pingDb } from "../infra/db/client.js";

export class HealthService {
  constructor(
    private readonly pool: pg.Pool,
    private readonly version: string,
  ) {}

  async getHealth(): Promise<HealthResponse> {
    const up = await pingDb(this.pool);
    return {
      status: up ? "ok" : "degraded",
      db: up ? "up" : "down",
      version: this.version,
    };
  }
}
