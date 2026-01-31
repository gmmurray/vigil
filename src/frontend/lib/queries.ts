import { queryOptions, useMutation } from '@tanstack/react-query';
import { api, queryClient } from './api';

export const getMonitorsQueryOptions = queryOptions({
  queryKey: ['monitors'],
  queryFn: api.fetchMonitors,
});

export const getMonitorQueryOptions = (id?: string) =>
  queryOptions({
    queryKey: ['monitor', id],
    queryFn: () => api.fetchMonitor(id!),
    enabled: !!id,
  });

export const getMonitorChecksQueryOptions = (id?: string, limit?: number) =>
  queryOptions({
    queryKey: ['monitor-checks', id],
    queryFn: () => api.fetchMonitorChecks(id!, limit),
    enabled: !!id,
  });

export const getMonitorIncidentsQueryOptions = (id?: string, limit?: number) =>
  queryOptions({
    queryKey: ['monitor-incidents', id],
    queryFn: () => api.fetchIncidents({ monitorId: id, limit }),
    enabled: !!id,
  });

export const getMonitorStatsQueryOptions = (id?: string) =>
  queryOptions({
    queryKey: ['monitor-stats', id],
    queryFn: () => api.fetchMonitorStats(id!),
    enabled: !!id,
  });

export const useDeleteConfig = () =>
  useMutation({
    mutationFn: api.deleteMonitor,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['monitors'] }),
  });

// Channels
export const getChannelsQueryOptions = () =>
  queryOptions({
    queryKey: ['channels'],
    queryFn: api.fetchChannels,
  });

export const getChannelQueryOptions = (id?: string) =>
  queryOptions({
    queryKey: ['channel', id],
    queryFn: () => api.fetchChannel(id!),
    enabled: !!id,
  });

export const useDeleteChannel = () =>
  useMutation({
    mutationFn: api.deleteChannel,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['channels'] }),
  });

export const getIncidentsQueryOptions = (activeOnly: boolean) =>
  queryOptions({
    queryKey: ['incidents', { activeOnly }],
    queryFn: () => api.fetchIncidents({ active: activeOnly, limit: 100 }),
    refetchInterval: 10000,
  });

// Notification Logs
export const getNotificationLogsQueryOptions = (filter?: {
  channelId?: string;
  success?: boolean;
}) =>
  queryOptions({
    queryKey: ['notification-logs', filter],
    queryFn: () =>
      api.fetchNotificationLogs({
        channelId: filter?.channelId,
        success: filter?.success,
        limit: 100,
      }),
  });
