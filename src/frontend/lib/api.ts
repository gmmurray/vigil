import { QueryClient } from '@tanstack/react-query';
import type {
  Channel,
  CheckResult,
  Incident,
  Monitor,
  NotificationLog,
} from '../types';

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

  bulkUpdateMonitors: async (
    ids: string[] | null,
    update: { enabled?: number },
  ) => {
    const res = await fetch(`${API_BASE}/monitors/bulk`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ids, update }),
    });
    if (!res.ok) throw new Error('Failed to bulk update monitors');
    return res.json() as Promise<{ success: boolean; affected: number }>;
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

  checkMonitor: async (monitorId: string) => {
    const res = await fetch(
      `${API_BASE}/monitors/${monitorId}/check?force=true`,
      {
        method: 'POST',
      },
    );
    if (!res.ok) throw new Error('Failed to check monitor');
    return res.json();
  },

  testMonitorUrl: async (config: {
    url: string;
    method: string;
    timeoutMs: number;
    expectedStatus: string;
  }) => {
    const res = await fetch(`${API_BASE}/monitors/test`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(config),
    });
    if (!res.ok) throw new Error('Failed to test URL');
    return res.json() as Promise<{
      success: boolean;
      statusCode: number | null;
      responseTime: number;
      error: string | null;
    }>;
  },

  // Channels
  fetchChannels: async () => {
    const res = await fetch(`${API_BASE}/channels`);
    if (!res.ok) throw new Error('Failed to fetch channels');
    return res.json() as Promise<Channel[]>;
  },

  fetchChannel: async (id: string) => {
    const res = await fetch(`${API_BASE}/channels/${id}`);
    if (!res.ok) throw new Error('Failed to fetch channel');
    return res.json() as Promise<Channel>;
  },

  createChannel: async (data: Partial<Channel>) => {
    const res = await fetch(`${API_BASE}/channels`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    if (!res.ok) throw new Error('Failed to create channel');
    return res.json();
  },

  updateChannel: async (id: string, data: Partial<Channel>) => {
    const res = await fetch(`${API_BASE}/channels/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    if (!res.ok) throw new Error('Failed to update channel');
    return res.json();
  },

  deleteChannel: async (id: string) => {
    const res = await fetch(`${API_BASE}/channels/${id}`, {
      method: 'DELETE',
    });
    if (!res.ok) throw new Error('Failed to delete channel');
    return res.json();
  },

  // Notification Logs
  fetchNotificationLogs: async (filter?: {
    channelId?: string;
    monitorId?: string;
    success?: boolean;
    limit?: number;
  }) => {
    const params = new URLSearchParams();
    if (filter?.channelId) params.append('channelId', filter.channelId);
    if (filter?.monitorId) params.append('monitorId', filter.monitorId);
    if (filter?.success !== undefined)
      params.append('success', filter.success.toString());
    if (filter?.limit) params.append('limit', filter.limit.toString());

    const res = await fetch(`${API_BASE}/notifications?${params.toString()}`);
    if (!res.ok) throw new Error('Failed to fetch notification logs');
    return res.json() as Promise<{ data: NotificationLog[] }>;
  },
};

const getWsUrl = (path: string) => {
  const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
  return `${protocol}//${window.location.host}${API_BASE}${path}`;
};
