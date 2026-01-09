export type MonitorStatus = 'UP' | 'DOWN' | 'DEGRADED' | 'RECOVERING';

export interface MonitorConfig {
  id: string;
  name: string;
  url: string;
  method: string;
  intervalSeconds: number;
  timeoutMs: number;
  enabled: number; // 0 or 1
  expectedStatus: string;
  headers: Record<string, string> | null;
  body: string | null;
  status: MonitorStatus;
}

export interface CheckResult {
  monitorId: string;
  status: 'UP' | 'DOWN';
  responseTimeMs: number;
  statusCode: number | null;
  error: string | null;
  checkedAt: string;
}
