import { useQuery } from '@tanstack/react-query';
import { useState } from 'react';
import { getMonitorsQueryOptions } from '../../lib/queries';
import { KPIGrid } from '../dashboard/KPIGrid';
import { MonitorRow } from '../dashboard/MonitorRow';
import { EmptyState } from '../ui/EmptyState';
import { SearchInput } from '../ui/SearchInput';

export function DashboardView() {
  const [search, setSearch] = useState('');

  const {
    data: monitors,
    isLoading,
    isError,
    refetch,
  } = useQuery({
    ...getMonitorsQueryOptions,
    refetchInterval: 5000,
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

  const filteredMonitors = allMonitors.filter(
    m =>
      m.name.toLowerCase().includes(search.toLowerCase()) ||
      m.url.toLowerCase().includes(search.toLowerCase()),
  );

  return (
    <div className="flex flex-col gap-8">
      <KPIGrid enabledCount={enabledCount} downCount={downCount} />

      <div className="flex flex-col gap-4">
        <div className="flex flex-col md:flex-row justify-between md:items-end gap-1">
          <div className="text-xs uppercase tracking-widest text-gold-dim">
            Monitors ({filteredMonitors.length})
          </div>
          <SearchInput
            value={search}
            onChange={setSearch}
            placeholder="Filter..."
          />
        </div>

        <div className="bg-panel border border-gold-faint">
          {filteredMonitors.length === 0 ? (
            <EmptyState
              title={search ? 'NO MATCHES' : 'NO MONITORS CONFIGURED'}
              description={
                search ? undefined : 'Add a monitor to start tracking uptime'
              }
              action={
                search ? undefined : { label: 'Add Monitor', to: '/config/add' }
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
