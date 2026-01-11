import { useQuery } from '@tanstack/react-query';
import { useState } from 'react';
import { api } from '../../lib/api';
import type { Monitor } from '../../types';
import { KPIGrid } from '../dashboard/KPIGrid';
import { MonitorRow } from '../dashboard/MonitorRow';
import { SearchInput } from '../ui/SearchInput';

export function DashboardView() {
  const [search, setSearch] = useState('');
  const {
    data: monitors,
    isLoading,
    isError,
  } = useQuery<Monitor[]>({
    queryKey: ['monitors'],
    queryFn: api.fetchMonitors,
    // Poll every 5 seconds for live status updates
    refetchInterval: 5000,
  });

  if (isLoading) {
    return (
      <div className="panel h-32 flex items-center justify-center font-mono text-gold-dim animate-pulse">
        :: INITIALIZING DATALINK ::
      </div>
    );
  }

  if (isError || !monitors) {
    return (
      <div className="panel h-32 flex items-center justify-center font-mono text-retro-red">
        :: CONNECTION LOST ::
      </div>
    );
  }

  const filteredMonitors =
    monitors?.filter(
      m =>
        m.name.toLowerCase().includes(search.toLowerCase()) ||
        m.url.toLowerCase().includes(search.toLowerCase()),
    ) || [];

  const activeCount = monitors?.filter(m => m.enabled).length || 0;

  return (
    <div className="flex flex-col gap-8">
      {/* Pass full counts to KPI Grid, not filtered counts */}
      <KPIGrid activeCount={activeCount} totalCount={monitors?.length || 0} />

      <div className="flex flex-col gap-4">
        {/* Toolbar Row */}
        <div className="flex justify-between items-end">
          <div className="text-xs uppercase tracking-widest text-gold-dim">
            Monitors ({filteredMonitors.length})
          </div>
          <SearchInput
            value={search}
            onChange={setSearch}
            placeholder="Filter monitors..."
          />
        </div>

        <div className="bg-panel border border-gold-faint">
          {filteredMonitors.length === 0 ? (
            <div className="p-8 text-center text-gold-dim font-mono text-sm">
              {search ? 'NO MATCHING MONITORS' : 'NO MONITORS CONFIGURED'}
            </div>
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
