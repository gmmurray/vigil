import { useMutation, useQuery } from '@tanstack/react-query';
import { useState } from 'react';
import { api, queryClient } from '../../lib/api';
import { getMonitorsQueryOptions } from '../../lib/queries';
import { cn } from '../../lib/utils';
import { KPIGrid } from '../dashboard/KPIGrid';
import { MonitorRow } from '../dashboard/MonitorRow';
import { EmptyState } from '../ui/EmptyState';
import { SearchInput } from '../ui/SearchInput';

type StatusFilter = 'all' | 'up' | 'down' | 'disabled';

export function DashboardView() {
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');

  const {
    data: monitors,
    isLoading,
    isError,
    refetch,
  } = useQuery({
    ...getMonitorsQueryOptions,
    refetchInterval: 5000,
  });

  const bulkMutation = useMutation({
    mutationFn: (enabled: number) => api.bulkUpdateMonitors(null, { enabled }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['monitors'] }),
  });

  const allMonitors = monitors || [];
  const enabledMonitors = allMonitors.filter(m => m.enabled);
  const enabledCount = enabledMonitors.length;
  const downCount = enabledMonitors.filter(
    m => m.status === 'DOWN' || m.status === 'DEGRADED',
  ).length;

  if (isLoading) {
    return (
      <div className="panel h-32 flex items-center justify-center font-mono text-gold-dim animate-pulse">
        :: ACCESSING ::
      </div>
    );
  }

  if (isError || !monitors) {
    return (
      <div className="panel h-32 flex flex-col items-center justify-center font-mono text-retro-red gap-3">
        <span>:: CONNECTION LOST ::</span>
        <button
          type="button"
          onClick={() => refetch()}
          className="text-xs uppercase text-gold-dim hover:text-gold-primary transition-colors"
        >
          &gt; Retry
        </button>
      </div>
    );
  }

  const filteredMonitors = allMonitors.filter(m => {
    // Text search
    const matchesSearch =
      m.name.toLowerCase().includes(search.toLowerCase()) ||
      m.url.toLowerCase().includes(search.toLowerCase());
    if (!matchesSearch) return false;

    // Status filter
    if (statusFilter === 'disabled') return !m.enabled;
    if (statusFilter === 'down')
      return m.enabled && (m.status === 'DOWN' || m.status === 'DEGRADED');
    if (statusFilter === 'up')
      return m.enabled && (m.status === 'UP' || m.status === 'RECOVERING');
    return true;
  });

  return (
    <div className="flex flex-col gap-8">
      <KPIGrid enabledCount={enabledCount} downCount={downCount} />

      <div className="flex flex-col gap-4">
        <div className="flex flex-col md:flex-row justify-between md:items-end gap-4">
          <div className="flex items-center gap-4">
            <div className="text-xs uppercase tracking-widest text-gold-dim">
              Monitors ({filteredMonitors.length})
            </div>
            <div className="flex gap-1">
              {(['all', 'up', 'down', 'disabled'] as const).map(filter => (
                <button
                  key={filter}
                  type="button"
                  onClick={() => setStatusFilter(filter)}
                  className={cn(
                    'px-2 py-1 text-xs font-mono uppercase transition-colors cursor-pointer',
                    statusFilter === filter
                      ? 'text-gold-primary border-b border-gold-primary'
                      : 'text-gold-dim hover:text-gold-primary',
                  )}
                >
                  {filter}
                </button>
              ))}
            </div>
          </div>
          <div className="flex flex-col md:flex-row items-stretch md:items-center gap-2 md:gap-3 w-full md:w-auto">
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => bulkMutation.mutate(0)}
                disabled={bulkMutation.isPending}
                className={cn(
                  'btn-gold text-xs flex-1 md:flex-none',
                  bulkMutation.isPending && 'opacity-50',
                )}
              >
                Pause All
              </button>
              <button
                type="button"
                onClick={() => bulkMutation.mutate(1)}
                disabled={bulkMutation.isPending}
                className={cn(
                  'btn-gold text-xs flex-1 md:flex-none',
                  bulkMutation.isPending && 'opacity-50',
                )}
              >
                Enable All
              </button>
            </div>
            <SearchInput
              value={search}
              onChange={setSearch}
              placeholder="Filter..."
            />
          </div>
        </div>

        <div className="bg-panel border border-gold-faint">
          {filteredMonitors.length === 0 ? (
            <EmptyState
              title={
                search || statusFilter !== 'all'
                  ? 'NO MATCHES'
                  : 'NO MONITORS CONFIGURED'
              }
              description={
                search || statusFilter !== 'all'
                  ? undefined
                  : 'Add a monitor to start tracking uptime'
              }
              action={
                search || statusFilter !== 'all'
                  ? undefined
                  : { label: 'Add Monitor', to: '/config/add' }
              }
            />
          ) : (
            filteredMonitors.map(monitor => (
              <MonitorRow key={monitor.id} monitor={monitor} />
            ))
          )}
        </div>
      </div>
    </div>
  );
}
