import { pgTable, serial, timestamp } from "drizzle-orm/pg-core";

/** Minimal M1 table — proves migrations only; not a product entity. */
export const healthChecks = pgTable("health_checks", {
  id: serial("id").primaryKey(),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
});
