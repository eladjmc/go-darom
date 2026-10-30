import {
  boolean,
  integer,
  jsonb,
  pgEnum,
  pgTable,
  serial,
  text,
  timestamp,
  uniqueIndex,
  uuid,
} from "drizzle-orm/pg-core";

/** Minimal M1 table — proves migrations; retained. */
export const healthChecks = pgTable("health_checks", {
  id: serial("id").primaryKey(),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
});

export const userRoleEnum = pgEnum("user_role", ["member", "admin"]);

export const users = pgTable("users", {
  id: uuid("id").defaultRandom().primaryKey(),
  nickname: text("nickname"),
  avatarUrl: text("avatar_url"),
  role: userRoleEnum("role").notNull().default("member"),
  onboardingCompleted: boolean("onboarding_completed").notNull().default(false),
  suspendedAt: timestamp("suspended_at", { withTimezone: true }),
  lastSeenAt: timestamp("last_seen_at", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
});

export const authIdentities = pgTable(
  "auth_identities",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    provider: text("provider").notNull(),
    externalId: text("external_id").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [uniqueIndex("auth_identities_provider_external_uidx").on(table.provider, table.externalId)],
);

export const chatThreadKindEnum = pgEnum("chat_thread_kind", ["community", "dm"]);

export const chatThreads = pgTable(
  "chat_threads",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    kind: chatThreadKindEnum("kind").notNull(),
    /** For DM: lexicographically smaller user id */
    userLowId: uuid("user_low_id").references(() => users.id, { onDelete: "cascade" }),
    /** For DM: lexicographically larger user id */
    userHighId: uuid("user_high_id").references(() => users.id, { onDelete: "cascade" }),
    nextSeq: integer("next_seq").notNull().default(1),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    uniqueIndex("chat_threads_dm_pair_uidx").on(table.userLowId, table.userHighId),
  ],
);

export const chatMessages = pgTable(
  "chat_messages",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    threadId: uuid("thread_id")
      .notNull()
      .references(() => chatThreads.id, { onDelete: "cascade" }),
    senderId: uuid("sender_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    threadSeq: integer("thread_seq").notNull(),
    body: text("body").notNull(),
    clientCommandId: text("client_command_id"),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
    deletedAt: timestamp("deleted_at", { withTimezone: true }),
    deletedBy: uuid("deleted_by").references(() => users.id),
  },
  (table) => [
    uniqueIndex("chat_messages_thread_seq_uidx").on(table.threadId, table.threadSeq),
    uniqueIndex("chat_messages_sender_command_uidx").on(table.senderId, table.clientCommandId),
  ],
);

export const chatThreadReads = pgTable(
  "chat_thread_reads",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    threadId: uuid("thread_id")
      .notNull()
      .references(() => chatThreads.id, { onDelete: "cascade" }),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    lastReadSeq: integer("last_read_seq").notNull().default(0),
    updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [uniqueIndex("chat_thread_reads_thread_user_uidx").on(table.threadId, table.userId)],
);

export const userBlocks = pgTable(
  "user_blocks",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    blockerId: uuid("blocker_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    blockedId: uuid("blocked_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [uniqueIndex("user_blocks_pair_uidx").on(table.blockerId, table.blockedId)],
);

export const reportTargetTypeEnum = pgEnum("report_target_type", ["public_message", "dm_message"]);
export const reportStatusEnum = pgEnum("report_status", ["open", "resolved", "dismissed"]);

export const moderationReports = pgTable("moderation_reports", {
  id: uuid("id").defaultRandom().primaryKey(),
  targetType: reportTargetTypeEnum("target_type").notNull(),
  messageId: uuid("message_id")
    .notNull()
    .references(() => chatMessages.id, { onDelete: "cascade" }),
  threadId: uuid("thread_id")
    .notNull()
    .references(() => chatThreads.id, { onDelete: "cascade" }),
  reporterId: uuid("reporter_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  reason: text("reason").notNull(),
  status: reportStatusEnum("status").notNull().default("open"),
  /** Frozen evidence snapshot for DM reports (bounded messages). */
  contextSnapshot: jsonb("context_snapshot").$type<unknown>(),
  resolutionNote: text("resolution_note"),
  resolvedBy: uuid("resolved_by").references(() => users.id),
  resolvedAt: timestamp("resolved_at", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
});

export const moderationAuditLog = pgTable("moderation_audit_log", {
  id: uuid("id").defaultRandom().primaryKey(),
  actorId: uuid("actor_id")
    .notNull()
    .references(() => users.id),
  action: text("action").notNull(),
  entityType: text("entity_type").notNull(),
  entityId: text("entity_id").notNull(),
  detail: jsonb("detail").$type<Record<string, unknown>>(),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
});

export const notifications = pgTable("notifications", {
  id: uuid("id").defaultRandom().primaryKey(),
  recipientId: uuid("recipient_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  type: text("type").notNull(),
  payload: jsonb("payload").$type<Record<string, unknown>>().notNull(),
  readAt: timestamp("read_at", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
});
