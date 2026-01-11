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
