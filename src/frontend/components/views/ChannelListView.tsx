import { useQuery } from '@tanstack/react-query';
import { useState } from 'react';
import { Link } from 'react-router-dom';
import { getChannelsQueryOptions, useDeleteChannel } from '../../lib/queries';
import { cn } from '../../lib/utils';
import type { Channel } from '../../types';
import { SearchInput } from '../ui/SearchInput';

export function ChannelListView() {
  const [search, setSearch] = useState('');
  const { data: channels, isLoading } = useQuery(getChannelsQueryOptions());

  const deleteMutation = useDeleteChannel();

  if (isLoading) {
    return (
      <div className="panel animate-pulse text-gold-dim font-mono text-center p-8">
        :: ACCESSING ::
      </div>
    );
  }

  const filteredChannels =
    channels?.filter(c => {
      const configUrl = (c.config as { url?: string })?.url || '';
      return (
        c.type.toLowerCase().includes(search.toLowerCase()) ||
        configUrl.toLowerCase().includes(search.toLowerCase())
      );
    }) || [];

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col md:flex-row justify-between md:items-end gap-4">
        <SearchInput
          value={search}
          onChange={setSearch}
          placeholder="Search channels..."
        />

        <div className="flex gap-3">
          <Link to="/config" className="btn-gold no-underline">
            &lt; Back to Config
          </Link>
          <Link
            to="/config/channels/add"
            className="btn-gold active no-underline"
          >
            + Add Channel
          </Link>
        </div>
      </div>

      <div className="panel p-0 overflow-x-auto overflow-y-visible theme-table-scroll">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="border-b border-gold-faint bg-active/50 text-xs uppercase text-gold-dim">
              <th className="p-4 font-normal">Type</th>
              <th className="p-4 font-normal">Endpoint</th>
              <th className="p-4 font-normal text-right">Actions</th>
            </tr>
          </thead>
          <tbody>
            {filteredChannels?.map(channel => (
              <ChannelRow
                key={channel.id}
                channel={channel}
                onDelete={() => {
                  if (confirm('Delete this notification channel?')) {
                    deleteMutation.mutate(channel.id);
                  }
                }}
              />
            ))}
            {filteredChannels.length === 0 && (
              <tr>
                <td colSpan={3} className="p-8 text-center text-gold-dim">
                  NO CHANNELS CONFIGURED
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function ChannelRow({
  channel,
  onDelete,
}: {
  channel: Channel;
  onDelete: () => void;
}) {
  const configUrl = (channel.config as { url?: string })?.url || 'N/A';

  return (
    <tr className="border-b border-gold-faint last:border-0 hover:bg-active/30 transition-colors">
      <td className="p-4 font-medium text-gold-primary">
        <div className="flex items-center gap-2">
          <div
            className={cn(
              'w-2 h-2',
              channel.enabled ? 'bg-retro-green' : 'bg-retro-off',
            )}
          />
          {channel.type}
        </div>
      </td>
      <td className="p-4 font-mono text-xs text-gold-dim truncate max-w-xs">
        {configUrl}
      </td>
      <td className="flex p-4 justify-end gap-3">
        <Link
          to={`/config/channels/${channel.id}/edit`}
          className="text-xs uppercase hover:text-gold-primary text-gold-dim transition-colors"
        >
          Edit
        </Link>
        <span className="text-gold-faint text-xs">|</span>
        <button
          type="button"
          onClick={onDelete}
          className="text-xs uppercase hover:text-retro-red text-gold-dim transition-colors cursor-pointer"
        >
          Delete
        </button>
      </td>
    </tr>
  );
}
