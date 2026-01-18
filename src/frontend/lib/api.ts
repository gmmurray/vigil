import { QueryClient } from '@tanstack/react-query';
import type { CheckResult, Incident, Monitor } from '../types';

const API_BASE = '/api/v1';

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: { staleTime: 0, retry: 2 },
  },
});

export const api = {
  fetchMonitors: async () => {
    const res = await fetch(`${API_BASE}/monitors`);
    if (!res.ok) throw new Error('Failed to fetch monitors');
    return res.json() as Promise<Monitor[]>;
  },

  createMonitor: async (data: Partial<Monitor>) => {
    const res = await fetch(`${API_BASE}/monitors`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    if (!res.ok) throw new Error('Failed to create monitor');
    return res.json();
  },

  updateMonitor: async (id: string, data: Partial<Monitor>) => {
    const res = await fetch(`${API_BASE}/monitors/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    if (!res.ok) throw new Error('Failed to update monitor');
    return res.json();
  },

  deleteMonitor: async (id: string) => {
    const res = await fetch(`${API_BASE}/monitors/${id}`, {
      method: 'DELETE',
    });
    if (!res.ok) throw new Error('Failed to delete monitor');
    return res.json();
  },

  fetchMonitor: async (id: string) => {
    const res = await fetch(`${API_BASE}/monitors/${id}`);
    if (!res.ok) throw new Error('Failed to fetch monitor');
    return res.json() as Promise<Monitor>;
  },

  fetchMonitorChecks: async (id: string, limit = 50) => {
    const res = await fetch(`${API_BASE}/monitors/${id}/checks?limit=${limit}`);
    if (!res.ok) throw new Error('Failed to fetch checks');
    return res.json() as Promise<{ data: CheckResult[] }>; // API returns { data: [], meta: {} }
  },

  fetchIncidents: async (filter?: {
    active?: boolean;
    monitorId?: string;
    limit?: number;
  }) => {
    const params = new URLSearchParams();
    if (filter?.active) params.append('active', 'true');
    if (filter?.monitorId) params.append('monitorId', filter.monitorId);
    if (filter?.limit) params.append('limit', filter.limit.toString());

    const res = await fetch(`${API_BASE}/incidents?${params.toString()}`);
    if (!res.ok) throw new Error('Failed to fetch incidents');
    return res.json() as Promise<{ data: Incident[] }>;
  },

  fetchGlobalStats: async () => {
    const res = await fetch(`${API_BASE}/stats/global`);
    return res.json() as Promise<{ uptime30d: number; avgLatency: number }>;
  },

  fetchMonitorStats: async (monitorId: string) => {
    const res = await fetch(`${API_BASE}/monitors/${monitorId}/stats`);
    return res.json() as Promise<{ uptime: number; avgResponseTime: number }>;
  },

  subscribeToMonitor: (id: string) => {
    const wsUrl = getWsUrl(`/monitors/${id}/sub`);
    return new WebSocket(wsUrl);
  },
};

const getWsUrl = (path: string) => {
  const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
  return `${protocol}//${window.location.host}${API_BASE}${path}`;
};
