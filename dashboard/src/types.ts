export type MonitorStatus = 'UP' | 'DOWN' | 'DEGRADED' | 'RECOVERING';

export interface Monitor {
  id: string;
  name: string;
  url: string;
  method: string;
  intervalSeconds: number;
  expectedStatus: string;
  status: MonitorStatus;
  enabled: number;
  updatedAt: string;
}

export interface MonitorStats {
  monitorId: string;
  period: string;
  uptime: number;
  avgResponseTime: number;
  totalChecks: number;
}

export interface CheckResult {
  id: string;
  monitorId: string;
  status: string; // "UP" | "DOWN"
  responseTimeMs: number;
  statusCode: number;
  error: string | null;
  checkedAt: string;
}

export interface Incident {
  id: string;
  monitorId: string;
  startedAt: string;
  endedAt: string | null;
  cause: string | null;
}
