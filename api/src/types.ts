import type { InferInsertModel, InferSelectModel } from 'drizzle-orm';
import type { checkResults, incidents, monitors } from './schema';

// 1. Define strict Enums/Unions that SQLite just sees as "text"
export type MonitorStatus = 'UP' | 'DOWN' | 'DEGRADED' | 'RECOVERING';

// 2. Infer Base Database Models
export type Monitor = InferSelectModel<typeof monitors>;
export type CheckResult = InferSelectModel<typeof checkResults>;
export type Incident = InferSelectModel<typeof incidents>;

// 3. Define Insert Models (useful for API request bodies)
export type NewMonitor = InferInsertModel<typeof monitors>;
export type NewCheckResult = InferInsertModel<typeof checkResults>;

// 4. Define DO Internal Config
// We extend the DB model but narrow types where Drizzle is loose (like 'json' fields or 'text' enums)
export interface MonitorConfig extends Omit<Monitor, 'status' | 'headers'> {
  status: MonitorStatus;
  headers: Record<string, string> | null;
}
