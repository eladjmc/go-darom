import { migrate } from "drizzle-orm/node-postgres/migrator";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { loadEnv } from "../../config/env.js";
import { createDb } from "./client.js";

async function main() {
  const env = loadEnv();
  const { db, pool } = createDb(env.databaseUrl);
  const migrationsFolder = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../../../drizzle");
  await migrate(db, { migrationsFolder });
  console.log("Migrations applied from", migrationsFolder);
  await pool.end();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
