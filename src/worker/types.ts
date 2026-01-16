import type { InferInsertModel, InferSelectModel } from 'drizzle-orm';
import type {
  checkResults,
  incidents,
  monitors,
  notificationChannels,
} from './schema';

// Type-safe enums for SQLite text fields
export type MonitorStatus = 'UP' | 'DOWN' | 'DEGRADED' | 'RECOVERING';

// Database models
export type Monitor = InferSelectModel<typeof monitors>;
export type CheckResult = InferSelectModel<typeof checkResults>;
export type Incident = InferSelectModel<typeof incidents>;
export type Channel = InferInsertModel<typeof notificationChannels>;

// Insert models for API requests
export type NewMonitor = InferInsertModel<typeof monitors>;
export type NewCheckResult = InferInsertModel<typeof checkResults>;
export type NewChannel = InferInsertModel<typeof notificationChannels>;

export type UpdateChannel = Partial<Omit<NewChannel, 'id' | 'createdAt'>>;

// Durable Object config with narrowed types (Drizzle's json/text fields are loosely typed)
export interface MonitorConfig extends Omit<Monitor, 'status' | 'headers'> {
  status: MonitorStatus;
  headers: Record<string, string> | null;
}
