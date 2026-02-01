import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { api } from './api';

// Mock fetch globally
const mockFetch = vi.fn();
vi.stubGlobal('fetch', mockFetch);

describe('api', () => {
  beforeEach(() => {
    mockFetch.mockReset();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('fetchMonitors', () => {
    it('fetches from correct URL', async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        json: () => Promise.resolve([]),
      });

      await api.fetchMonitors();

      expect(mockFetch).toHaveBeenCalledWith('/api/v1/monitors');
    });

    it('returns parsed JSON on success', async () => {
      const monitors = [{ id: '1', name: 'Test' }];
      mockFetch.mockResolvedValue({
        ok: true,
        json: () => Promise.resolve(monitors),
      });

      const result = await api.fetchMonitors();

      expect(result).toEqual(monitors);
    });

    it('throws error on failure', async () => {
      mockFetch.mockResolvedValue({ ok: false });

      await expect(api.fetchMonitors()).rejects.toThrow(
        'Failed to fetch monitors',
      );
    });
  });

  describe('createMonitor', () => {
    it('sends POST request with JSON body', async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({ id: '1' }),
      });

      const data = { name: 'New Monitor', url: 'https://example.com' };
      await api.createMonitor(data);

      expect(mockFetch).toHaveBeenCalledWith('/api/v1/monitors', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
    });

    it('throws error on failure', async () => {
      mockFetch.mockResolvedValue({ ok: false });

      await expect(api.createMonitor({})).rejects.toThrow(
        'Failed to create monitor',
      );
    });
  });

  describe('updateMonitor', () => {
    it('sends PUT request to correct URL', async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({ success: true }),
      });

      const data = { name: 'Updated' };
      await api.updateMonitor('mon_123', data);

      expect(mockFetch).toHaveBeenCalledWith('/api/v1/monitors/mon_123', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
    });

    it('throws error on failure', async () => {
      mockFetch.mockResolvedValue({ ok: false });

      await expect(api.updateMonitor('mon_123', {})).rejects.toThrow(
        'Failed to update monitor',
      );
    });
  });

  describe('deleteMonitor', () => {
    it('sends DELETE request to correct URL', async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({ success: true }),
      });

      await api.deleteMonitor('mon_123');

      expect(mockFetch).toHaveBeenCalledWith('/api/v1/monitors/mon_123', {
        method: 'DELETE',
      });
    });

    it('throws error on failure', async () => {
      mockFetch.mockResolvedValue({ ok: false });

      await expect(api.deleteMonitor('mon_123')).rejects.toThrow(
        'Failed to delete monitor',
      );
    });
  });

  describe('bulkUpdateMonitors', () => {
    it('sends PATCH request with ids and update payload', async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({ success: true, affected: 3 }),
      });

      await api.bulkUpdateMonitors(['id1', 'id2'], { enabled: 0 });

      expect(mockFetch).toHaveBeenCalledWith('/api/v1/monitors/bulk', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ids: ['id1', 'id2'], update: { enabled: 0 } }),
      });
    });

    it('handles null ids for update all', async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({ success: true, affected: 10 }),
      });

      await api.bulkUpdateMonitors(null, { enabled: 1 });

      expect(mockFetch).toHaveBeenCalledWith('/api/v1/monitors/bulk', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ids: null, update: { enabled: 1 } }),
      });
    });

    it('throws error on failure', async () => {
      mockFetch.mockResolvedValue({ ok: false });

      await expect(api.bulkUpdateMonitors([], {})).rejects.toThrow(
        'Failed to bulk update monitors',
      );
    });
  });

  describe('fetchMonitor', () => {
    it('fetches single monitor by id', async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({ id: 'mon_123' }),
      });

      await api.fetchMonitor('mon_123');

      expect(mockFetch).toHaveBeenCalledWith('/api/v1/monitors/mon_123');
    });

    it('throws error on failure', async () => {
      mockFetch.mockResolvedValue({ ok: false });

      await expect(api.fetchMonitor('invalid')).rejects.toThrow(
        'Failed to fetch monitor',
      );
    });
  });

  describe('fetchMonitorChecks', () => {
    it('fetches checks with default limit', async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({ data: [] }),
      });

      await api.fetchMonitorChecks('mon_123');

      expect(mockFetch).toHaveBeenCalledWith(
        '/api/v1/monitors/mon_123/checks?limit=50',
      );
    });

    it('fetches checks with custom limit', async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({ data: [] }),
      });

      await api.fetchMonitorChecks('mon_123', 100);

      expect(mockFetch).toHaveBeenCalledWith(
        '/api/v1/monitors/mon_123/checks?limit=100',
      );
    });

    it('throws error on failure', async () => {
      mockFetch.mockResolvedValue({ ok: false });

      await expect(api.fetchMonitorChecks('mon_123')).rejects.toThrow(
        'Failed to fetch checks',
      );
    });
  });

  describe('fetchIncidents', () => {
    it('fetches incidents without filters', async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({ data: [] }),
      });

      await api.fetchIncidents();

      expect(mockFetch).toHaveBeenCalledWith('/api/v1/incidents?');
    });

    it('applies active filter', async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({ data: [] }),
      });

      await api.fetchIncidents({ active: true });

      expect(mockFetch).toHaveBeenCalledWith('/api/v1/incidents?active=true');
    });

    it('applies monitorId filter', async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({ data: [] }),
      });

      await api.fetchIncidents({ monitorId: 'mon_123' });

      expect(mockFetch).toHaveBeenCalledWith(
        '/api/v1/incidents?monitorId=mon_123',
      );
    });

    it('applies limit filter', async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({ data: [] }),
      });

      await api.fetchIncidents({ limit: 10 });

      expect(mockFetch).toHaveBeenCalledWith('/api/v1/incidents?limit=10');
    });

    it('combines multiple filters', async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({ data: [] }),
      });

      await api.fetchIncidents({
        active: true,
        monitorId: 'mon_123',
        limit: 5,
      });

      expect(mockFetch).toHaveBeenCalledWith(
        '/api/v1/incidents?active=true&monitorId=mon_123&limit=5',
      );
    });

    it('throws error on failure', async () => {
      mockFetch.mockResolvedValue({ ok: false });

      await expect(api.fetchIncidents()).rejects.toThrow(
        'Failed to fetch incidents',
      );
    });
  });

  describe('fetchGlobalStats', () => {
    it('fetches from correct URL', async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({ uptime30d: 99.9, avgLatency: 150 }),
      });

      await api.fetchGlobalStats();

      expect(mockFetch).toHaveBeenCalledWith('/api/v1/stats/global');
    });
  });

  describe('fetchMonitorStats', () => {
    it('fetches stats for specific monitor', async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({ uptime: 100, avgResponseTime: 200 }),
      });

      await api.fetchMonitorStats('mon_123');

      expect(mockFetch).toHaveBeenCalledWith('/api/v1/monitors/mon_123/stats');
    });
  });

  describe('checkMonitor', () => {
    it('sends POST request with force=true', async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({ status: 'UP' }),
      });

      await api.checkMonitor('mon_123');

      expect(mockFetch).toHaveBeenCalledWith(
        '/api/v1/monitors/mon_123/check?force=true',
        { method: 'POST' },
      );
    });

    it('throws error on failure', async () => {
      mockFetch.mockResolvedValue({ ok: false });

      await expect(api.checkMonitor('mon_123')).rejects.toThrow(
        'Failed to check monitor',
      );
    });
  });

  describe('testMonitorUrl', () => {
    it('sends POST request with config', async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        json: () =>
          Promise.resolve({
            success: true,
            statusCode: 200,
            responseTime: 100,
            error: null,
          }),
      });

      const config = {
        url: 'https://example.com',
        method: 'GET',
        timeoutMs: 5000,
        expectedStatus: '200',
      };
      await api.testMonitorUrl(config);

      expect(mockFetch).toHaveBeenCalledWith('/api/v1/monitors/test', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(config),
      });
    });

    it('sends POST request with headers and body', async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        json: () =>
          Promise.resolve({
            success: true,
            statusCode: 200,
            responseTime: 100,
            error: null,
          }),
      });

      const config = {
        url: 'https://example.com',
        method: 'POST',
        timeoutMs: 5000,
        expectedStatus: '200',
        headers: { Authorization: 'Bearer token123', 'X-Custom': 'value' },
        body: '{"key": "value"}',
      };
      await api.testMonitorUrl(config);

      expect(mockFetch).toHaveBeenCalledWith('/api/v1/monitors/test', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(config),
      });
    });

    it('throws error on failure', async () => {
      mockFetch.mockResolvedValue({ ok: false });

      await expect(
        api.testMonitorUrl({
          url: 'https://example.com',
          method: 'GET',
          timeoutMs: 5000,
          expectedStatus: '200',
        }),
      ).rejects.toThrow('Failed to test URL');
    });
  });

  describe('fetchChannels', () => {
    it('fetches from correct URL', async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        json: () => Promise.resolve([]),
      });

      await api.fetchChannels();

      expect(mockFetch).toHaveBeenCalledWith('/api/v1/channels');
    });

    it('throws error on failure', async () => {
      mockFetch.mockResolvedValue({ ok: false });

      await expect(api.fetchChannels()).rejects.toThrow(
        'Failed to fetch channels',
      );
    });
  });

  describe('fetchChannel', () => {
    it('fetches single channel by id', async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({ id: 'ch_123' }),
      });

      await api.fetchChannel('ch_123');

      expect(mockFetch).toHaveBeenCalledWith('/api/v1/channels/ch_123');
    });

    it('throws error on failure', async () => {
      mockFetch.mockResolvedValue({ ok: false });

      await expect(api.fetchChannel('invalid')).rejects.toThrow(
        'Failed to fetch channel',
      );
    });
  });

  describe('createChannel', () => {
    it('sends POST request with JSON body', async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({ id: 'ch_123' }),
      });

      const data = {
        type: 'WEBHOOK',
        config: { url: 'https://hook.example' },
      } as const;
      await api.createChannel(data);

      expect(mockFetch).toHaveBeenCalledWith('/api/v1/channels', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
    });

    it('throws error on failure', async () => {
      mockFetch.mockResolvedValue({ ok: false });

      await expect(api.createChannel({})).rejects.toThrow(
        'Failed to create channel',
      );
    });
  });

  describe('updateChannel', () => {
    it('sends PUT request to correct URL', async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({ success: true }),
      });

      const data = { config: { url: 'https://new-hook.example' } };
      await api.updateChannel('ch_123', data);

      expect(mockFetch).toHaveBeenCalledWith('/api/v1/channels/ch_123', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
    });

    it('throws error on failure', async () => {
      mockFetch.mockResolvedValue({ ok: false });

      await expect(api.updateChannel('ch_123', {})).rejects.toThrow(
        'Failed to update channel',
      );
    });
  });

  describe('deleteChannel', () => {
    it('sends DELETE request to correct URL', async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({ success: true }),
      });

      await api.deleteChannel('ch_123');

      expect(mockFetch).toHaveBeenCalledWith('/api/v1/channels/ch_123', {
        method: 'DELETE',
      });
    });

    it('throws error on failure', async () => {
      mockFetch.mockResolvedValue({ ok: false });

      await expect(api.deleteChannel('ch_123')).rejects.toThrow(
        'Failed to delete channel',
      );
    });
  });

  describe('testChannel', () => {
    it('sends POST request to correct URL', async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({ success: true, error: null }),
      });

      await api.testChannel('ch_123');

      expect(mockFetch).toHaveBeenCalledWith('/api/v1/channels/ch_123/test', {
        method: 'POST',
      });
    });

    it('returns success result', async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({ success: true, error: null }),
      });

      const result = await api.testChannel('ch_123');

      expect(result.success).toBe(true);
      expect(result.error).toBeNull();
    });

    it('returns failure result with error', async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({ success: false, error: 'HTTP 500' }),
      });

      const result = await api.testChannel('ch_123');

      expect(result.success).toBe(false);
      expect(result.error).toBe('HTTP 500');
    });

    it('throws error on request failure', async () => {
      mockFetch.mockResolvedValue({ ok: false });

      await expect(api.testChannel('ch_123')).rejects.toThrow(
        'Failed to test channel',
      );
    });
  });

  describe('fetchNotificationLogs', () => {
    it('fetches logs without filters', async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({ data: [] }),
      });

      await api.fetchNotificationLogs();

      expect(mockFetch).toHaveBeenCalledWith('/api/v1/notifications?');
    });

    it('applies channelId filter', async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({ data: [] }),
      });

      await api.fetchNotificationLogs({ channelId: 'ch_123' });

      expect(mockFetch).toHaveBeenCalledWith(
        '/api/v1/notifications?channelId=ch_123',
      );
    });

    it('applies monitorId filter', async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({ data: [] }),
      });

      await api.fetchNotificationLogs({ monitorId: 'mon_123' });

      expect(mockFetch).toHaveBeenCalledWith(
        '/api/v1/notifications?monitorId=mon_123',
      );
    });

    it('applies success=true filter', async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({ data: [] }),
      });

      await api.fetchNotificationLogs({ success: true });

      expect(mockFetch).toHaveBeenCalledWith(
        '/api/v1/notifications?success=true',
      );
    });

    it('applies success=false filter', async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({ data: [] }),
      });

      await api.fetchNotificationLogs({ success: false });

      expect(mockFetch).toHaveBeenCalledWith(
        '/api/v1/notifications?success=false',
      );
    });

    it('applies limit filter', async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({ data: [] }),
      });

      await api.fetchNotificationLogs({ limit: 25 });

      expect(mockFetch).toHaveBeenCalledWith('/api/v1/notifications?limit=25');
    });

    it('combines multiple filters', async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({ data: [] }),
      });

      await api.fetchNotificationLogs({
        channelId: 'ch_123',
        monitorId: 'mon_456',
        success: true,
        limit: 10,
      });

      expect(mockFetch).toHaveBeenCalledWith(
        '/api/v1/notifications?channelId=ch_123&monitorId=mon_456&success=true&limit=10',
      );
    });

    it('throws error on failure', async () => {
      mockFetch.mockResolvedValue({ ok: false });

      await expect(api.fetchNotificationLogs()).rejects.toThrow(
        'Failed to fetch notification logs',
      );
    });
  });
});
