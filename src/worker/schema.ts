import { sql } from 'drizzle-orm';
import { index, integer, sqliteTable, text } from 'drizzle-orm/sqlite-core';

export const monitors = sqliteTable('monitors', {
  id: text('id').primaryKey(),
  name: text('name').notNull(),
  url: text('url').notNull(),
  method: text('method').notNull().default('GET'),
  intervalSeconds: integer('interval_seconds').notNull().default(60),
  timeoutMs: integer('timeout_ms').notNull().default(5000),
  expectedStatus: text('expected_status').notNull().default('200'), // Comma-separated codes: "200,201,204"
  headers: text('headers', { mode: 'json' }),
  body: text('body'),
  status: text('status').notNull().default('UP'), // MonitorStatus enum
  enabled: integer('enabled').notNull().default(1), // Boolean: 0 or 1
  createdAt: text('created_at').notNull().default(sql`(current_timestamp)`),
  updatedAt: text('updated_at').notNull().default(sql`(current_timestamp)`),
});

export const checkResults = sqliteTable(
  'check_results',
  {
    id: text('id').primaryKey(),
    monitorId: text('monitor_id')
      .notNull()
      .references(() => monitors.id, { onDelete: 'cascade' }),
    status: text('status').notNull(),
    responseTimeMs: integer('response_time_ms'),
    statusCode: integer('status_code'),
    error: text('error'),
    checkedAt: text('checked_at').notNull().default(sql`(current_timestamp)`),
  },
  table => ({
    monitorIdIdx: index('check_results_monitor_id_idx').on(table.monitorId),
    checkedAtIdx: index('check_results_checked_at_idx').on(table.checkedAt),
  }),
);

export const incidents = sqliteTable(
  'incidents',
  {
    id: text('id').primaryKey(),
    monitorId: text('monitor_id')
      .notNull()
      .references(() => monitors.id, { onDelete: 'cascade' }),
    startedAt: text('started_at').notNull().default(sql`(current_timestamp)`),
    endedAt: text('ended_at'), // NULL = ongoing incident
    cause: text('cause'),
  },
  table => ({
    monitorIdIdx: index('incidents_monitor_id_idx').on(table.monitorId),
  }),
);

export const notificationChannels = sqliteTable('notification_channels', {
  id: text('id').primaryKey(),
  type: text('type').notNull(), // e.g., WEBHOOK
  config: text('config', { mode: 'json' }).notNull(), // Channel-specific config: { url: "..." }
  enabled: integer('enabled').notNull().default(1),
  createdAt: text('created_at').notNull().default(sql`(current_timestamp)`),
});

export const notificationLogs = sqliteTable(
  'notification_logs',
  {
    id: text('id').primaryKey(),
    channelId: text('channel_id')
      .notNull()
      .references(() => notificationChannels.id, { onDelete: 'cascade' }),
    monitorId: text('monitor_id')
      .notNull()
      .references(() => monitors.id, { onDelete: 'cascade' }),
    event: text('event').notNull(), // UP, DOWN
    success: integer('success').notNull(), // Boolean: 0 or 1
    error: text('error'),
    createdAt: text('created_at').notNull().default(sql`(current_timestamp)`),
  },
  table => ({
    channelIdIdx: index('notification_logs_channel_id_idx').on(table.channelId),
    monitorIdIdx: index('notification_logs_monitor_id_idx').on(table.monitorId),
    createdAtIdx: index('notification_logs_created_at_idx').on(table.createdAt),
  }),
);
