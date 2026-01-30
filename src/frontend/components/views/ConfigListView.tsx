import { useQuery } from '@tanstack/react-query';
import { useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../../lib/api';
import { useDeleteConfig } from '../../lib/queries';
import { cn } from '../../lib/utils';
import type { Monitor } from '../../types';
import { SearchInput } from '../ui/SearchInput';

export function ConfigListView() {
  const [search, setSearch] = useState('');
  const { data: monitors, isLoading } = useQuery<Monitor[]>({
    queryKey: ['monitors'],
    queryFn: api.fetchMonitors,
  });

  const deleteMutation = useDeleteConfig();

  if (isLoading) {
    return (
      <div className="panel animate-pulse text-gold-dim font-mono text-center p-8">
        :: ACCESSING ::
      </div>
    );
  }

  const filteredMonitors =
    monitors?.filter(
      m =>
        m.name.toLowerCase().includes(search.toLowerCase()) ||
        m.url.toLowerCase().includes(search.toLowerCase()),
    ) || [];

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col md:flex-row justify-between md:items-end gap-4">
        <SearchInput
          value={search}
          onChange={setSearch}
          placeholder="Search config..."
        />

        <div>
          <Link to="/config/add" className="btn-gold active no-underline">
            + Add Monitor
          </Link>
        </div>
      </div>

      <div className="panel p-0 overflow-x-auto overflow-y-visible theme-table-scroll">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="border-b border-gold-faint bg-active/50 text-xs uppercase text-gold-dim">
              <th className="p-4 font-normal">Name</th>
              <th className="p-4 font-normal">Endpoint</th>
              <th className="p-4 font-normal text-right">Actions</th>
            </tr>
          </thead>
          <tbody>
            {filteredMonitors?.map(monitor => (
              <tr
                key={monitor.id}
                className="border-b border-gold-faint last:border-0 hover:bg-active/30 transition-colors"
              >
                <td className="p-4 font-medium text-gold-primary">
                  <div className="flex items-center gap-2">
                    <div
                      className={cn(
                        'w-2 h-2',
                        monitor.enabled ? 'bg-retro-green' : 'bg-retro-off',
                      )}
                    />
                    {monitor.name}
                  </div>
                </td>
                <td className="p-4 font-mono text-xs text-gold-dim">
                  {monitor.url}
                </td>
                <td className="flex p-4 justify-end gap-3">
                  <Link
                    to={`/monitors/${monitor.id}`}
                    className="text-xs uppercase hover:text-gold-primary text-gold-dim transition-colors"
                  >
                    View
                  </Link>
                  <span className="text-gold-faint text-xs">|</span>
                  <Link
                    to={`/monitors/${monitor.id}/edit`}
                    className="text-xs uppercase hover:text-gold-primary text-gold-dim transition-colors"
                  >
                    Edit
                  </Link>
                  <span className="text-gold-faint text-xs">|</span>
                  <button
                    type="button"
                    onClick={() => {
                      if (confirm('Are you sure? This deletes all history.')) {
                        deleteMutation.mutate(monitor.id);
                      }
                    }}
                    className="text-xs uppercase hover:text-retro-red text-gold-dim transition-colors cursor-pointer"
                  >
                    Delete
                  </button>
                </td>
              </tr>
            ))}
            {filteredMonitors.length === 0 && (
              <tr>
                <td colSpan={3} className="p-8 text-center text-gold-dim">
                  NO MATCHES
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
