import { useMutation, useQuery } from '@tanstack/react-query';
import { useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { api, queryClient } from '../../lib/api';
import { getChannelQueryOptions } from '../../lib/queries';
import type { ChannelFormData } from '../../lib/schemas';
import type { Channel } from '../../types';
import { ChannelForm } from '../config/ChannelForm';

export function ChannelFormView() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const isEditMode = !!id;
  const [isSaved, setIsSaved] = useState(false);

  const { data: channel, isLoading } = useQuery({
    ...getChannelQueryOptions(id),
    enabled: isEditMode,
    retry: 1,
  });

  const createMutation = useMutation({
    mutationFn: api.createChannel,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['channels'] });
      navigate('/config/channels');
    },
  });

  const updateMutation = useMutation({
    mutationFn: (data: { id: string; payload: Partial<Channel> }) =>
      api.updateChannel(data.id, data.payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['channels'] });
      queryClient.invalidateQueries({ queryKey: ['channel', id] });
      setIsSaved(true);
      setTimeout(() => setIsSaved(false), 3000);
    },
  });

  const handleSubmit = (data: ChannelFormData) => {
    setIsSaved(false);
    const payload = { ...data, enabled: data.enabled ? 1 : 0 };

    if (isEditMode && id) {
      updateMutation.mutate({ id, payload });
    } else {
      createMutation.mutate(payload);
    }
  };

  if (isEditMode && isLoading) {
    return (
      <div className="panel animate-pulse text-gold-dim font-mono text-center p-8">
        :: ACCESSING ::
      </div>
    );
  }

  if (isEditMode && !channel) {
    return (
      <div className="panel text-retro-red font-mono text-center p-8">
        :: ERROR: CHANNEL NOT FOUND ::
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex justify-between items-center">
        <div className="text-gold-dim font-mono text-xs uppercase">
          {isEditMode
            ? `Editing: ${channel?.type} Channel`
            : 'New Notification Channel'}
        </div>
        <div className="flex gap-4 items-center">
          {isSaved && (
            <span className="text-retro-green font-mono text-sm animate-pulse">
              :: CONFIG SAVED ::
            </span>
          )}
          <Link
            to="/config/channels"
            className="text-xs uppercase hover:text-gold-primary text-gold-dim transition-colors font-mono"
          >
            &lt; Back to Channels
          </Link>
        </div>
      </div>

      <ChannelForm
        defaultValues={channel}
        onSubmit={handleSubmit}
        onCancel={() => navigate('/config/channels')}
        isSubmitting={createMutation.isPending || updateMutation.isPending}
      />
    </div>
  );
}
