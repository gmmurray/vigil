import type { InferInsertModel, InferSelectModel } from 'drizzle-orm';
import type {
  checkResults,
  incidents,
  monitors,
  notificationChannels,
  notificationLogs,
} from './schema';

// Type-safe enums for SQLite text fields
export type MonitorStatus = 'UP' | 'DOWN' | 'DEGRADED' | 'RECOVERING';

// Database models
export type Monitor = InferSelectModel<typeof monitors>;
export type CheckResult = InferSelectModel<typeof checkResults>;
export type Incident = InferSelectModel<typeof incidents>;
export type Channel = InferInsertModel<typeof notificationChannels>;
export type NotificationLog = InferSelectModel<typeof notificationLogs>;

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

type CheckCompletedMessage = {
  type: 'CHECK_COMPLETED';
  payload: {
    check: CheckResult;
    monitorStatus: MonitorStatus;
  };
};

type StatusUpdateMessage = {
  type: 'STATUS_UPDATE';
  payload: {
    monitorStatus: MonitorStatus;
  };
};

export type MonitorBroadcast = CheckCompletedMessage | StatusUpdateMessage;
