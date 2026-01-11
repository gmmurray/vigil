import { useQuery } from '@tanstack/react-query';
import { useNavigate, useParams } from 'react-router-dom';
import { api } from '../../lib/api';
import { cn } from '../../lib/utils';
import { ResponseTimeChart } from '../monitors/ResponseTimeChart';

export function MonitorDetailView() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  // 1. Fetch Monitor Config & Current Status
  const { data: monitor, isLoading: loadingMonitor } = useQuery({
    queryKey: ['monitor', id],
    queryFn: () => api.fetchMonitor(id!),
    enabled: !!id,
    refetchInterval: 5000,
  });

  // 2. Fetch Recent Checks History
  const { data: checkData, isLoading: loadingChecks } = useQuery({
    queryKey: ['monitor-checks', id],
    queryFn: () => api.fetchMonitorChecks(id!),
    enabled: !!id,
    refetchInterval: 5000,
  });

  if (loadingMonitor || loadingChecks) {
    return (
      <div className="panel animate-pulse text-gold-dim font-mono text-center p-8">
        :: ACQUIRING TARGET ::
      </div>
    );
  }

  if (!monitor) {
    return (
      <div className="panel border-retro-red text-center p-12">
        <div className="text-retro-red font-mono mb-4">
          ERROR: MONITOR NOT FOUND
        </div>
        <button onClick={() => navigate('/')} className="btn-gold">
          Return to Base
        </button>
      </div>
    );
  }

  const isUp = monitor.status === 'UP' || monitor.status === 'RECOVERING';
  const checks = checkData?.data || [];

  return (
    <div className="flex flex-col gap-6">
      {/* Header / Actions */}
      <div className="flex justify-between items-end">
        <div>
          <button
            onClick={() => navigate('/')}
            className="text-xs text-gold-dim hover:text-gold-primary mb-2 font-mono"
          >
            &lt; BACK TO DASHBOARD
          </button>
          <h1 className="text-2xl text-gold-primary font-medium">
            {monitor.name}
          </h1>
          <div className="font-mono text-gold-dim text-sm">{monitor.url}</div>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => navigate(`/monitors/${id}/edit`)}
            className="btn-gold"
          >
            Edit Config
          </button>
        </div>
      </div>

      {/* 1. Primary Status Card */}
      <div className="panel grid grid-cols-1 md:grid-cols-3 gap-8 items-center">
        <div className="md:col-span-1">
          <div className="text-xs uppercase tracking-widest text-gold-dim mb-2">
            Current Status
          </div>
          <div
            className={cn(
              'text-4xl font-mono',
              isUp ? 'text-retro-green' : 'text-retro-red',
            )}
          >
            {monitor.status}
          </div>
        </div>

        <div className="md:col-span-2 flex flex-col gap-2">
          <div className="flex justify-between text-sm border-b border-gold-faint pb-1">
            <span className="text-gold-dim">Interval</span>
            <span className="font-mono">{monitor.intervalSeconds}s</span>
          </div>
          <div className="flex justify-between text-sm border-b border-gold-faint pb-1">
            <span className="text-gold-dim">Method</span>
            <span className="font-mono">{monitor.method}</span>
          </div>
          <div className="flex justify-between text-sm border-b border-gold-faint pb-1">
            <span className="text-gold-dim">Expected</span>
            <span className="font-mono">{monitor.expectedStatus}</span>
          </div>
        </div>
      </div>

      {/* 2. Response Time Chart (Stacked Below) */}
      <div className="flex flex-col gap-2">
        <div className="text-xs uppercase tracking-widest text-gold-dim font-medium">
          Latency Visualization (Last 50 Checks)
        </div>
        <ResponseTimeChart checks={checks} />
      </div>

      {/* 3. Recent Activity Log */}
      <div className="panel p-0 overflow-hidden">
        <div className="bg-active/50 px-4 py-2 border-b border-gold-faint text-xs uppercase text-gold-dim font-medium">
          Recent Activity Log
        </div>
        <div className="max-h-[400px] overflow-y-auto">
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
                  {/* ADDED: title attribute for ISO timestamp on hover */}
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
              {checks.length === 0 && (
                <tr>
                  <td colSpan={4} className="p-8 text-center text-gold-dim">
                    NO DATA RECORDED
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
