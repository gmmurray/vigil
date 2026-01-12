import { useQuery } from '@tanstack/react-query';
import { api } from '../../lib/api'; // Ensure api.fetchGlobalStats is added below
import { cn } from '../../lib/utils';

export function KPIGrid({
  activeCount,
  totalCount,
}: {
  activeCount: number;
  totalCount: number;
}) {
  const { data: stats, isLoading } = useQuery({
    queryKey: ['global-stats'],
    queryFn: api.fetchGlobalStats,
    refetchInterval: 60000, // Refresh every minute
  });

  const isDegraded = activeCount < totalCount;

  return (
    <section className="grid grid-cols-1 md:grid-cols-3 gap-4">
      {/* System Status */}
      <div className="panel flex flex-col justify-between h-32">
        <div className="text-xs uppercase tracking-widest text-gold-dim">
          System Status
        </div>
        <div>
          <div
            className={cn(
              'text-3xl font-mono',
              isDegraded ? 'text-retro-warn' : 'text-retro-green',
            )}
          >
            {isDegraded ? 'DEGRADED' : 'OPERATIONAL'}
          </div>
          <div className="text-sm text-gold-dim mt-1">
            {activeCount}/{totalCount} Monitors Active
          </div>
        </div>
      </div>

      {/* Global Uptime */}
      <div className="panel flex flex-col justify-between h-32">
        <div className="text-xs uppercase tracking-widest text-gold-dim">
          Global Uptime (30d)
        </div>
        {isLoading ? (
          <div className="animate-pulse text-gold-dim font-mono text-xl">
            ...
          </div>
        ) : (
          <div>
            <div className="text-3xl text-gold-primary font-mono">
              {stats?.uptime30d}%
            </div>
            <div className="text-sm text-gold-dim mt-1">
              Calculated via Incident Log
            </div>
          </div>
        )}
      </div>

      {/* Avg Latency */}
      <div className="panel flex flex-col justify-between h-32">
        <div className="text-xs uppercase tracking-widest text-gold-dim">
          Avg Latency (Global)
        </div>
        {isLoading ? (
          <div className="animate-pulse text-gold-dim font-mono text-xl">
            ...
          </div>
        ) : (
          <div>
            <div className="text-3xl text-gold-primary font-mono">
              {stats?.avgLatency}
              <span className="text-base">ms</span>
            </div>
            <div className="text-sm text-gold-dim mt-1">
              Sampled 24h Average
            </div>
          </div>
        )}
      </div>
    </section>
  );
}
