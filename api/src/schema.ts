import { sql } from 'drizzle-orm';
import { index, integer, sqliteTable, text } from 'drizzle-orm/sqlite-core';

export const monitors = sqliteTable('monitors', {
  id: text('id').primaryKey(), // ULID
  name: text('name').notNull(),
  url: text('url').notNull(),
  method: text('method').notNull().default('GET'),
  intervalSeconds: integer('interval_seconds').notNull().default(60),
  timeoutMs: integer('timeout_ms').notNull().default(5000),
  expectedStatus: text('expected_status').notNull().default('200'), // "200,201"
  headers: text('headers', { mode: 'json' }), // JSON object
  body: text('body'),
  status: text('status').notNull().default('UP'), // UP, DOWN, DEGRADED
  enabled: integer('enabled').notNull().default(1), // 0 or 1
  createdAt: text('created_at').notNull().default(sql`(current_timestamp)`),
  updatedAt: text('updated_at').notNull().default(sql`(current_timestamp)`),
});

export const checkResults = sqliteTable(
  'check_results',
  {
    id: text('id').primaryKey(), // ULID
    monitorId: text('monitor_id')
      .notNull()
      .references(() => monitors.id, { onDelete: 'cascade' }),
    status: text('status').notNull(), // UP, DOWN
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
    id: text('id').primaryKey(), // ULID
    monitorId: text('monitor_id')
      .notNull()
      .references(() => monitors.id, { onDelete: 'cascade' }),
    startedAt: text('started_at').notNull().default(sql`(current_timestamp)`),
    endedAt: text('ended_at'),
    cause: text('cause'),
  },
  table => ({
    monitorIdIdx: index('incidents_monitor_id_idx').on(table.monitorId),
  }),
);

export const notificationChannels = sqliteTable('notification_channels', {
  id: text('id').primaryKey(), // ULID
  type: text('type').notNull(), // WEBHOOK
  config: text('config', { mode: 'json' }).notNull(), // { url: "..." }
  enabled: integer('enabled').notNull().default(1),
  createdAt: text('created_at').notNull().default(sql`(current_timestamp)`),
});
