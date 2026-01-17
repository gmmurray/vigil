import { queryOptions } from '@tanstack/react-query';
import { api } from './api';

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

export const getMonitorIncidentsQueryOptions = (id?: string) =>
  queryOptions({
    queryKey: ['monitor-incidents', id],
    queryFn: () => api.fetchIncidents({ monitorId: id, limit: 10 }),
    enabled: !!id,
  });

export const getMonitorStatsQueryOptions = (id?: string) =>
  queryOptions({
    queryKey: ['monitor-stats', id],
    queryFn: () => api.fetchMonitorStats(id!),
    enabled: !!id,
  });
