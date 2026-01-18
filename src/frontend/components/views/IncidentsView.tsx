import { useQuery } from '@tanstack/react-query';
import { useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../../lib/api';
import { cn, getDuration } from '../../lib/utils';
import type { Monitor } from '../../types';

export function IncidentsView() {
  const [showHistory, setShowHistory] = useState(false);

  const { data: incidentData, isLoading: loadingIncidents } = useQuery({
    queryKey: ['incidents', showHistory ? 'all' : 'active'],
    queryFn: () => api.fetchIncidents({ active: !showHistory, limit: 100 }),
    refetchInterval: 10000,
  });

  const { data: monitors } = useQuery<Monitor[]>({
    queryKey: ['monitors'],
    queryFn: api.fetchMonitors,
    staleTime: 60000,
  });

  const getMonitorName = (id: string) => {
    return monitors?.find(m => m.id === id)?.name || id;
  };

  const incidents = incidentData?.data || [];

  return (
    <div className="flex flex-col gap-6">
      {/* Header & Filter */}
      <div className="flex flex-col md:flex-row justify-between md:items-end border-b border-gold-faint pb-4 gap-4">
        <div>
          <h1 className="text-2xl text-gold-primary font-medium uppercase tracking-wide">
            Incident Log
          </h1>
          <div className="font-mono text-gold-dim text-xs mt-1">
            System Events & Outage Reports
          </div>
        </div>

        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => setShowHistory(false)}
            className={cn('btn-gold', !showHistory && 'active')}
          >
            Active
          </button>
          <button
            type="button"
            onClick={() => setShowHistory(true)}
            className={cn('btn-gold', showHistory && 'active')}
          >
            History
          </button>
        </div>
      </div>

      {/* Incident List */}
      <div className="panel p-0 overflow-x-auto overflow-y-visible theme-table-scroll">
        {loadingIncidents ? (
          <div className="p-8 text-center text-gold-dim font-mono animate-pulse">
            :: ACCESSING ::
          </div>
        ) : (
          <table className="w-full min-w-max text-left border-collapse">
            <thead>
              <tr className="border-b border-gold-faint bg-active/50 text-xs uppercase text-gold-dim">
                <th className="p-4 font-normal">Severity</th>
                <th className="p-4 font-normal">Monitor</th>
                <th className="p-4 font-normal">Cause</th>
                <th className="p-4 font-normal">Started</th>
                <th className="p-4 font-normal text-right">Duration</th>
              </tr>
            </thead>
            <tbody>
              {incidents.map(incident => {
                const isOngoing = !incident.endedAt;
                return (
                  <tr
                    key={incident.id}
                    className="border-b border-gold-faint last:border-0 hover:bg-active/30 transition-colors"
                  >
                    <td className="p-4">
                      <span
                        className={cn(
                          'text-xs font-mono px-2 py-1 border',
                          isOngoing
                            ? 'text-retro-red border-retro-red bg-retro-red/10 animate-pulse'
                            : 'text-retro-green border-retro-green bg-retro-green/5',
                        )}
                      >
                        {isOngoing ? 'OUTAGE' : 'RESOLVED'}
                      </span>
                    </td>
                    <td className="p-4 font-medium text-gold-primary">
                      <Link
                        to={`/monitors/${incident.monitorId}`}
                        className="hover:text-retro-warn transition-colors"
                      >
                        {getMonitorName(incident.monitorId)}
                      </Link>
                    </td>
                    <td
                      className="p-4 text-sm text-gold-dim font-mono max-w-75 truncate"
                      title={incident.cause || ''}
                    >
                      {incident.cause || 'Unknown Error'}
                    </td>
                    <td className="p-4 text-sm text-gold-dim font-mono">
                      {new Date(incident.startedAt).toLocaleString()}
                    </td>
                    <td className="p-4 text-right text-sm font-mono text-gold-primary">
                      {getDuration(incident.startedAt, incident.endedAt)}
                    </td>
                  </tr>
                );
              })}

              {incidents.length === 0 && (
                <tr>
                  <td
                    colSpan={5}
                    className="p-12 text-center text-gold-dim font-mono"
                  >
                    {showHistory
                      ? 'NO INCIDENT HISTORY FOUND'
                      : 'ALL SYSTEMS OPERATIONAL'}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
