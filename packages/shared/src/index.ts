export type HealthDbStatus = "up" | "down";
export type HealthStatus = "ok" | "degraded";

export interface HealthResponse {
  status: HealthStatus;
  db: HealthDbStatus;
  version: string;
}

export const APP_VERSION = "0.4.0-m4";

export * from "./identity.js";
export * from "./community.js";
export * from "./games.js";
