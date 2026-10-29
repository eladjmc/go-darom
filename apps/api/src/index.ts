import { HealthService } from "./app/health-service.js";
import { loadEnv } from "./config/env.js";
import { createApp } from "./create-app.js";
import { createDb } from "./infra/db/client.js";

async function main() {
  const env = loadEnv();
  const { pool } = createDb(env.databaseUrl);
  const healthService = new HealthService(pool, env.version);
  const app = createApp({ healthService, webOrigin: env.webOrigin });

  const server = app.listen(env.apiPort, () => {
    console.log(`Go Darom API listening on :${env.apiPort}`);
  });

  const shutdown = async () => {
    server.close();
    await pool.end();
    process.exit(0);
  };
  process.on("SIGINT", shutdown);
  process.on("SIGTERM", shutdown);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
