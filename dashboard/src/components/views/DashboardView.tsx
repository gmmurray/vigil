import { useQuery } from '@tanstack/react-query';
import { api } from '../../lib/api';
import type { Monitor } from '../../types';
import { KPIGrid } from '../dashboard/KPIGrid';
import { MonitorRow } from '../dashboard/MonitorRow';

export function DashboardView() {
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

  const activeCount = monitors.filter(m => m.enabled).length;

  return (
    <div className="flex flex-col gap-8">
      <KPIGrid activeCount={activeCount} totalCount={monitors.length} />

      <div className="bg-panel border border-gold-faint">
        {monitors.length === 0 ? (
          <div className="p-8 text-center text-gold-dim font-mono text-sm">
            NO MONITORS CONFIGURED
          </div>
        ) : (
          monitors.map(monitor => (
            <MonitorRow key={monitor.id} monitor={monitor} />
          ))
        )}
      </div>
    </div>
  );
}
