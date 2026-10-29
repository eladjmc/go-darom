export type HealthDbStatus = "up" | "down";
export type HealthStatus = "ok" | "degraded";

export interface HealthResponse {
  status: HealthStatus;
  db: HealthDbStatus;
  version: string;
}

export const APP_VERSION = "0.1.0-m1";
