export type HealthDbStatus = "up" | "down";
export type HealthStatus = "ok" | "degraded";

export interface HealthResponse {
  status: HealthStatus;
  db: HealthDbStatus;
  version: string;
}

export const APP_VERSION = "0.3.0-m3";

export * from "./identity.js";
export * from "./community.js";
