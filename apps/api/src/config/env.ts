import { config as loadDotenv } from "dotenv";
import path from "node:path";
import { fileURLToPath } from "node:url";

const here = path.dirname(fileURLToPath(import.meta.url));
loadDotenv({ path: path.resolve(here, "../../../../.env") });
loadDotenv();

export interface Env {
  databaseUrl: string;
  apiPort: number;
  webOrigin: string;
  nodeEnv: string;
  version: string;
}

export function loadEnv(): Env {
  const databaseUrl =
    process.env.DATABASE_URL ??
    "postgresql://go_darom:go_darom_dev@localhost:5432/go_darom";

  return {
    databaseUrl,
    apiPort: Number(process.env.API_PORT ?? "4000"),
    webOrigin: process.env.WEB_ORIGIN ?? "http://localhost:5173",
    nodeEnv: process.env.NODE_ENV ?? "development",
    version: process.env.APP_VERSION ?? "0.1.0-m1",
  };
}
