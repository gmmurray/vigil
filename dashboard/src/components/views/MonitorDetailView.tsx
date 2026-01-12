import { useQuery } from '@tanstack/react-query';
import { Link, useParams } from 'react-router-dom';
import { api } from '../../lib/api';
import { cn } from '../../lib/utils';
import { ResponseTimeChart } from '../monitors/ResponseTimeChart';

export function MonitorDetailView() {
  const { id } = useParams<{ id: string }>();

  // 1. Fetch Monitor Config
  const { data: monitor, isLoading: loadingMonitor } = useQuery({
    queryKey: ['monitor', id],
    queryFn: () => api.fetchMonitor(id!),
    enabled: !!id,
    refetchInterval: 5000,
  });

  // 2. Fetch Checks
  const { data: checkData, isLoading: loadingChecks } = useQuery({
    queryKey: ['monitor-checks', id],
    queryFn: () => api.fetchMonitorChecks(id!),
    enabled: !!id,
    refetchInterval: 5000,
  });

  // 3. Fetch Incidents
  const { data: incidentData } = useQuery({
    queryKey: ['monitor-incidents', id],
    queryFn: () => api.fetchIncidents({ monitorId: id, limit: 10 }),
    enabled: !!id,
  });

  // 4. Fetch Stats (Uptime/Latency)
  const { data: stats } = useQuery({
    queryKey: ['monitor-stats', id],
    queryFn: () => api.fetchMonitorStats(id!),
    enabled: !!id,
  });

  const getDuration = (start: string, end: string | null) => {
    if (!end) return 'ONGOING';
    const diffMs = new Date(end).getTime() - new Date(start).getTime();
    const minutes = Math.floor(diffMs / 60000);
    if (minutes < 60) return `${minutes}m`;
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return `${hours}h ${mins}m`;
  };

  if (loadingMonitor || loadingChecks) {
    return (
      <div className="panel animate-pulse text-gold-dim font-mono text-center p-8">
        :: LOADING ::
      </div>
    );
  }

  if (!monitor) {
    return (
      <div className="panel border-retro-red text-center p-12">
        <div className="text-retro-red font-mono mb-4">
          ERROR: MONITOR NOT FOUND
        </div>
        <Link to="/" className="btn-gold">
          Back to dashboard
        </Link>
      </div>
    );
  }

  const isUp = monitor.status === 'UP' || monitor.status === 'RECOVERING';
  const checks = checkData?.data || [];
  const incidents = incidentData?.data || [];

  return (
    <div className="flex flex-col gap-6">
      {/* Header */}
      <div className="flex justify-between items-end">
        <div>
          <Link
            to="/"
            className="text-xs text-gold-dim hover:text-gold-primary mb-2 font-mono"
          >
            &lt; BACK TO DASHBOARD
          </Link>
          <h1 className="text-2xl text-gold-primary font-medium">
            {monitor.name}
          </h1>
          <div className="font-mono text-gold-dim text-sm">{monitor.url}</div>
        </div>
        <div>
          <Link to={`/monitors/${id}/edit`} className="btn-gold">
            Edit Config
          </Link>
        </div>
      </div>

      {/* NEW LAYOUT: Split Panels */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* LEFT PANEL: Live Health Metrics (2/3 Width) */}
        <div className="panel lg:col-span-2 flex flex-col justify-between min-h-40">
          <div>
            <div className="text-xs uppercase tracking-widest text-gold-dim mb-2">
              Current Status
            </div>
            <div
              className={cn(
                'text-5xl font-mono tracking-tight',
                isUp ? 'text-retro-green' : 'text-retro-red',
              )}
            >
              {monitor.status}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-8 mt-6 border-t border-gold-faint pt-4">
            <div>
              <div className="text-xs uppercase tracking-widest text-gold-dim mb-1">
                Uptime (30d)
              </div>
              <div className="text-2xl font-mono text-gold-primary">
                {stats ? `${stats.uptime}%` : '...'}
              </div>
            </div>
            <div>
              <div className="text-xs uppercase tracking-widest text-gold-dim mb-1">
                Avg Latency
              </div>
              <div className="text-2xl font-mono text-gold-primary">
                {stats ? `${stats.avgResponseTime}ms` : '...'}
              </div>
            </div>
          </div>
        </div>

        {/* RIGHT PANEL: Configuration Details (1/3 Width) */}
        <div className="panel flex flex-col gap-4 justify-center bg-active/5">
          <div className="text-xs uppercase tracking-widest text-gold-dim border-b border-gold-faint pb-2 mb-1">
            Configuration
          </div>

          <div className="flex justify-between items-center text-sm">
            <span className="text-gold-dim">Check Interval</span>
            <span className="font-mono text-gold-primary">
              {monitor.intervalSeconds}s
            </span>
          </div>

          <div className="flex justify-between items-center text-sm">
            <span className="text-gold-dim">Method</span>
            <span className="font-mono text-gold-primary bg-active/20 px-2 py-0.5 rounded text-xs border border-gold-faint">
              {monitor.method}
            </span>
          </div>

          <div className="flex justify-between items-center text-sm">
            <span className="text-gold-dim">Timeout</span>
            <span className="font-mono text-gold-primary">5s</span>{' '}
            {/* Default/Implied */}
          </div>

          <div className="flex justify-between items-center text-sm">
            <span className="text-gold-dim">Expected Code</span>
            <span className="font-mono text-retro-green">
              {monitor.expectedStatus}
            </span>
          </div>
        </div>
      </div>

      {/* Chart Section */}
      <div className="flex flex-col gap-2">
        <div className="text-xs uppercase tracking-widest text-gold-dim font-medium">
          Latency Visualization (Last 50 Checks)
        </div>
        <ResponseTimeChart checks={checks} />
      </div>

      {/* Incident History Table */}
      {incidents.length > 0 && (
        <div className="panel p-0 overflow-hidden">
          <div className="bg-active/50 px-4 py-2 border-b border-gold-faint text-xs uppercase text-gold-dim font-medium">
            Recorded Incidents (Last 10)
          </div>
          <table className="w-full text-left border-collapse text-sm font-mono">
            <thead>
              <tr className="border-b border-gold-faint text-gold-dim text-xs">
                <th className="p-3 font-normal">Severity</th>
                <th className="p-3 font-normal">Cause</th>
                <th className="p-3 font-normal">Started</th>
                <th className="p-3 font-normal text-right">Duration</th>
              </tr>
            </thead>
            <tbody>
              {incidents.map(inc => (
                <tr
                  key={inc.id}
                  className="border-b border-gold-faint/50 last:border-0 hover:bg-active/30"
                >
                  <td className="p-3">
                    <span
                      className={cn(
                        'text-xs px-1.5 py-0.5 border',
                        !inc.endedAt
                          ? 'text-retro-red border-retro-red bg-retro-red/10 animate-pulse'
                          : 'text-retro-green border-retro-green bg-retro-green/5',
                      )}
                    >
                      {!inc.endedAt ? 'OUTAGE' : 'RESOLVED'}
                    </span>
                  </td>
                  <td
                    className="p-3 text-gold-primary truncate max-w-50"
                    title={inc.cause || ''}
                  >
                    {inc.cause || 'Unknown'}
                  </td>
                  <td className="p-3 text-gold-dim">
                    {new Date(inc.startedAt).toLocaleString()}
                  </td>
                  <td className="p-3 text-right text-gold-dim">
                    {getDuration(inc.startedAt, inc.endedAt)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Recent Activity Log */}
      <div className="panel p-0 overflow-hidden">
        <div className="bg-active/50 px-4 py-2 border-b border-gold-faint text-xs uppercase text-gold-dim font-medium">
          Recent Activity Log
        </div>
        <div className="max-h-100 overflow-y-auto scrollable-activity-log">
          <table className="w-full text-left border-collapse text-sm font-mono">
            <thead>
              <tr className="border-b border-gold-faint text-gold-dim text-xs">
                <th className="p-3 font-normal">Time</th>
                <th className="p-3 font-normal">Status</th>
                <th className="p-3 font-normal">Code</th>
                <th className="p-3 font-normal text-right">Latency</th>
              </tr>
            </thead>
            <tbody>
              {checks.map(check => (
                <tr
                  key={check.id}
                  className="border-b border-gold-faint/50 last:border-0 hover:bg-active/30 transition-colors"
                >
                  <td
                    className="p-3 text-gold-dim cursor-help"
                    title={check.checkedAt}
                  >
                    {new Date(check.checkedAt).toLocaleTimeString()}
                  </td>
                  <td
                    className={cn(
                      'p-3',
                      check.status === 'UP'
                        ? 'text-retro-green'
                        : 'text-retro-red',
                    )}
                  >
                    {check.status}
                  </td>
                  <td className="p-3 text-gold-primary">
                    {check.statusCode ?? 'ERR'}
                  </td>
                  <td className="p-3 text-right text-gold-dim">
                    {check.responseTimeMs}ms
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
