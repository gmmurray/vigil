import { useMutation, useQuery } from '@tanstack/react-query';
import { RefreshCcw } from 'lucide-react';
import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { api, queryClient } from '../../lib/api';
import {
  getMonitorChecksQueryOptions,
  getMonitorIncidentsQueryOptions,
  getMonitorQueryOptions,
  getMonitorStatsQueryOptions,
} from '../../lib/queries';
import { cn, getDuration } from '../../lib/utils';
import type { CheckResult, MonitorBroadcast, MonitorStatus } from '../../types';
import { ResponseTimeChart } from '../monitors/ResponseTimeChart';
import TablePanel from '../ui/TablePanel';

const INCIDENT_LIMIT = 10;
const CHECK_LIMIT = 50;

export function MonitorDetailView() {
  const { id } = useParams<{ id: string }>();
  const [currentStatus, setCurrentStatus] = useState<MonitorStatus | null>(
    null,
  );

  const { data: monitor, isLoading: loadingMonitor } = useQuery(
    getMonitorQueryOptions(id),
  );

  const { data: checkData, isLoading: loadingChecks } = useQuery(
    getMonitorChecksQueryOptions(id, CHECK_LIMIT),
  );

  const { data: incidentData } = useQuery(
    getMonitorIncidentsQueryOptions(id, INCIDENT_LIMIT),
  );

  const { data: stats } = useQuery(getMonitorStatsQueryOptions(id));

  const checkMutation = useMutation({
    mutationFn: api.checkMonitor,
    onSuccess: () => {
      setTimeout(() => {
        queryClient.invalidateQueries(
          getMonitorChecksQueryOptions(id, CHECK_LIMIT),
        );
        queryClient.invalidateQueries(getMonitorStatsQueryOptions(id));
      }, 1000);
    },
  });

  const handleManualCheck = () => {
    if (!id) {
      return;
    }

    return checkMutation.mutate(id);
  };

  // biome-ignore lint/correctness/useExhaustiveDependencies: cleanup
  useEffect(() => {
    setCurrentStatus(null);
  }, [id]);

  useEffect(() => {
    if (!id) return;

    const ws = api.subscribeToMonitor(id);
    let alive = true;

    ws.onmessage = event => {
      if (!alive) return;

      let message: MonitorBroadcast;
      try {
        message = JSON.parse(event.data);
      } catch {
        return;
      }

      const nextStatus = message.payload.monitorStatus;

      setCurrentStatus(prevStatus => {
        if (prevStatus && prevStatus !== nextStatus) {
          const startsIncident = nextStatus === 'DOWN';
          const endsIncident =
            nextStatus === 'UP' &&
            (prevStatus === 'DOWN' || prevStatus === 'RECOVERING');

          if (startsIncident || endsIncident) {
            setTimeout(() => {
              queryClient.invalidateQueries(
                getMonitorIncidentsQueryOptions(id),
              );
            }, 500);
          }
        }

        return nextStatus;
      });

      if (message.type === 'CHECK_COMPLETED') {
        queryClient.setQueryData(
          getMonitorChecksQueryOptions(id, CHECK_LIMIT).queryKey,
          (old: { data: CheckResult[] } | undefined) => {
            const prev = old?.data ?? [];

            const next = [...prev, message.payload.check]
              .sort(
                (a, b) =>
                  new Date(b.checkedAt).getTime() -
                  new Date(a.checkedAt).getTime(),
              )
              .slice(0, CHECK_LIMIT);

            return old ? { ...old, data: next } : { data: next };
          },
        );
      }
    };

    ws.onerror = () => {
      console.warn('WS error', id);
    };

    return () => {
      alive = false;
      ws.close();
    };
  }, [id]);

  useEffect(() => {
    const onVisibility = () => {
      if (document.visibilityState === 'visible') {
        queryClient.invalidateQueries(
          getMonitorChecksQueryOptions(id, CHECK_LIMIT),
        );
      }
    };

    document.addEventListener('visibilitychange', onVisibility);
    return () => document.removeEventListener('visibilitychange', onVisibility);
  }, [id]);

  if (loadingMonitor || loadingChecks) {
    return (
      <div className="panel animate-pulse text-gold-dim font-mono text-center p-8">
        :: ACCESSING ::
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

  const status = currentStatus ?? monitor.status;
  const isUp = status === 'UP' || status === 'RECOVERING';

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

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="panel lg:col-span-2 flex flex-col justify-between min-h-40">
          <div className="flex justify-between items-start mb-2">
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
                {status}
              </div>
            </div>

            <button
              type="button"
              onClick={handleManualCheck}
              disabled={checkMutation.isPending}
              className="group flex items-center gap-2 text-xs font-mono text-gold-dim hover:text-gold-primary disabled:opacity-50 transition-colors cursor-pointer"
              title="Trigger Manual Check"
            >
              <span className="opacity-0 group-hover:opacity-100 transition-opacity uppercase text-[10px]">
                {checkMutation.isPending ? 'PINGING...' : 'RUN CHECK'}
              </span>
              <RefreshCcw
                size={14}
                className={cn(
                  checkMutation.isPending && 'animate-spin text-retro-green',
                )}
              />
            </button>
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
            <span className="font-mono text-gold-primary">
              {monitor.timeoutMs / 1000}s
            </span>
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

      {incidents.length > 0 && (
        <TablePanel title={`Recorded Incidents (Last ${INCIDENT_LIMIT})`}>
          <table className="text-left border-collapse text-sm font-mono w-full">
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
        </TablePanel>
      )}

      <TablePanel title={`Recent Activity Log (Last ${CHECK_LIMIT})`}>
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
      </TablePanel>
    </div>
  );
}
