import { describe, expect, it, vi } from "vitest";
import type pg from "pg";
import { HealthService } from "./health-service.js";

describe("HealthService", () => {
  it("reports ok when DB ping succeeds", async () => {
    const pool = {
      query: vi.fn().mockResolvedValue({ rows: [{ "?column?": 1 }] }),
    } as unknown as pg.Pool;
    const service = new HealthService(pool, "0.1.0-m1");
    await expect(service.getHealth()).resolves.toEqual({
      status: "ok",
      db: "up",
      version: "0.1.0-m1",
    });
  });

  it("reports degraded when DB ping fails", async () => {
    const pool = {
      query: vi.fn().mockRejectedValue(new Error("connection refused")),
    } as unknown as pg.Pool;
    const service = new HealthService(pool, "0.1.0-m1");
    await expect(service.getHealth()).resolves.toEqual({
      status: "degraded",
      db: "down",
      version: "0.1.0-m1",
    });
  });
});
