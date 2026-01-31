import { useQuery } from '@tanstack/react-query';
import { useEffect, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import {
  getChannelsQueryOptions,
  getNotificationLogsQueryOptions,
} from '../../lib/queries';
import { cn } from '../../lib/utils';
import { TableEmptyRow } from '../ui/EmptyState';

type FilterMode = 'all' | 'success' | 'failed';

export function NotificationsView() {
  const [searchParams, setSearchParams] = useSearchParams();
  const channelIdFromUrl = searchParams.get('channelId') || undefined;

  const [filterMode, setFilterMode] = useState<FilterMode>('all');
  const [selectedChannelId, setSelectedChannelId] = useState<
    string | undefined
  >(channelIdFromUrl);

  const { data: channels } = useQuery(getChannelsQueryOptions());

  // Validate channelId from URL against actual channels
  useEffect(() => {
    if (!channels) return;

    const validChannelIds = new Set(channels.map(ch => ch.id));

    if (channelIdFromUrl && !validChannelIds.has(channelIdFromUrl)) {
      // Invalid channel ID in URL - clear it
      setSearchParams(
        params => {
          params.delete('channelId');
          return params;
        },
        { replace: true },
      );
      setSelectedChannelId(undefined);
    }
  }, [channels, channelIdFromUrl, setSearchParams]);

  // Sync URL when dropdown selection changes
  const handleChannelChange = (channelId: string | undefined) => {
    setSelectedChannelId(channelId);
    setSearchParams(
      params => {
        if (channelId) {
          params.set('channelId', channelId);
        } else {
          params.delete('channelId');
        }
        return params;
      },
      { replace: true },
    );
  };

  const successFilter =
    filterMode === 'all' ? undefined : filterMode === 'success';

  const {
    data: logsData,
    isLoading,
    isError,
    refetch,
  } = useQuery(
    getNotificationLogsQueryOptions({
      channelId: selectedChannelId,
      success: successFilter,
    }),
  );

  const logs = logsData?.data || [];

  return (
    <div className="flex flex-col gap-6">
      {/* Header & Filters */}
      <div className="flex flex-col md:flex-row justify-between md:items-end border-b border-gold-faint pb-4 gap-4">
        <div>
          <h1 className="text-2xl text-gold-primary font-medium uppercase tracking-wide">
            Notification History
          </h1>
          <div className="font-mono text-gold-dim text-xs mt-1">
            Delivery Logs & Debug Info
          </div>
        </div>

        <div className="flex flex-wrap gap-2">
          <Link to="/notifications/channels" className="btn-gold no-underline">
            Manage Channels
          </Link>
          <button
            type="button"
            onClick={() => setFilterMode('all')}
            className={cn('btn-gold', filterMode === 'all' && 'active')}
          >
            All
          </button>
          <button
            type="button"
            onClick={() => setFilterMode('success')}
            className={cn('btn-gold', filterMode === 'success' && 'active')}
          >
            Success
          </button>
          <button
            type="button"
            onClick={() => setFilterMode('failed')}
            className={cn('btn-gold', filterMode === 'failed' && 'active')}
          >
            Failed
          </button>
        </div>
      </div>

      {/* Channel Filter */}
      {channels && channels.length > 0 && (
        <div className="flex items-center gap-3">
          <span className="text-xs text-gold-dim font-mono uppercase">
            Channel:
          </span>
          <select
            value={selectedChannelId || ''}
            onChange={e => handleChannelChange(e.target.value || undefined)}
            className="bg-black/50 border border-gold-faint text-gold-primary text-sm px-3 py-1.5 font-mono focus:outline-none focus:border-gold-primary"
          >
            <option value="">All Channels</option>
            {channels.map(ch => (
              <option key={ch.id} value={ch.id}>
                {ch.type} - {(ch.config as { url?: string }).url?.slice(0, 40)}
                ...
              </option>
            ))}
          </select>
        </div>
      )}

      {/* Logs Table */}
      <div className="panel p-0 overflow-x-auto overflow-y-visible theme-table-scroll">
        {isLoading ? (
          <div className="p-8 text-center text-gold-dim font-mono animate-pulse">
            :: ACCESSING ::
          </div>
        ) : isError ? (
          <div className="p-8 flex flex-col items-center justify-center font-mono text-retro-red gap-3">
            <span>:: FAILED TO LOAD LOGS ::</span>
            <button
              type="button"
              onClick={() => refetch()}
              className="text-xs uppercase text-gold-dim hover:text-gold-primary transition-colors"
            >
              &gt; Retry
            </button>
          </div>
        ) : (
          <table className="w-full min-w-max text-left border-collapse">
            <thead>
              <tr className="border-b border-gold-faint bg-active/50 text-xs uppercase text-gold-dim">
                <th className="p-4 font-normal">Status</th>
                <th className="p-4 font-normal">Event</th>
                <th className="p-4 font-normal">Monitor</th>
                <th className="p-4 font-normal">Channel</th>
                <th className="p-4 font-normal">Error</th>
                <th className="p-4 font-normal text-right">Timestamp</th>
              </tr>
            </thead>
            <tbody>
              {logs.map(log => {
                const isSuccess = log.success === 1;
                return (
                  <tr
                    key={log.id}
                    className="border-b border-gold-faint last:border-0 hover:bg-active/30 transition-colors"
                  >
                    <td className="p-4">
                      <span
                        className={cn(
                          'text-xs font-mono px-2 py-1 border',
                          isSuccess
                            ? 'text-retro-green border-retro-green bg-retro-green/5'
                            : 'text-retro-red border-retro-red bg-retro-red/10',
                        )}
                      >
                        {isSuccess ? 'DELIVERED' : 'FAILED'}
                      </span>
                    </td>
                    <td className="p-4">
                      <span
                        className={cn(
                          'text-xs font-mono px-2 py-1 border',
                          log.event === 'DOWN'
                            ? 'text-retro-red border-retro-red/50'
                            : 'text-retro-green border-retro-green/50',
                        )}
                      >
                        {log.event}
                      </span>
                    </td>
                    <td className="p-4 font-medium text-gold-primary">
                      <Link
                        to={`/monitors/${log.monitorId}`}
                        className="hover:text-retro-warn transition-colors"
                      >
                        {log.monitorName || log.monitorId}
                      </Link>
                    </td>
                    <td className="p-4 text-sm text-gold-dim font-mono">
                      {log.channelType || 'WEBHOOK'}
                    </td>
                    <td
                      className="p-4 text-sm text-gold-dim font-mono max-w-50 truncate"
                      title={log.error || ''}
                    >
                      {log.error || '-'}
                    </td>
                    <td className="p-4 text-right text-sm font-mono text-gold-primary">
                      {new Date(log.createdAt).toLocaleString()}
                    </td>
                  </tr>
                );
              })}

              {logs.length === 0 && (
                <TableEmptyRow colSpan={6}>
                  NO NOTIFICATION LOGS FOUND
                </TableEmptyRow>
              )}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
