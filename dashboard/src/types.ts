import type { Params } from 'react-router-dom';

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
  timeoutMs: number;
  recentChecks?: CheckResult[];
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
  status: string;
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

export interface RouteHandle {
  title?: string | ((params: Params<string>) => string);
  meta?: {
    description?: string;
    ogImage?: string;
    ogType?: 'website' | 'article' | 'profile';
    canonical?: string;
    noIndex?: boolean;
  };
}
