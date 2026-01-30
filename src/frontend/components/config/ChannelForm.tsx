import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import { useNavigate } from 'react-router-dom';
import { useDeleteChannel } from '../../lib/queries';
import { type ChannelFormData, channelSchema } from '../../lib/schemas';
import { cn } from '../../lib/utils';
import type { Channel } from '../../types';
import { ErrorMsg, Input, Label } from '../ui/FormControls';

interface ChannelFormProps {
  defaultValues?: Channel;
  onSubmit: (data: ChannelFormData) => void;
  onCancel: () => void;
  isSubmitting: boolean;
}

export function ChannelForm({
  defaultValues,
  onSubmit,
  onCancel,
  isSubmitting,
}: ChannelFormProps) {
  const navigate = useNavigate();
  const deleteMutation = useDeleteChannel();

  const {
    register,
    handleSubmit,
    watch,
    formState: { errors },
  } = useForm<ChannelFormData>({
    resolver: zodResolver(channelSchema),
    defaultValues: defaultValues
      ? {
          type: defaultValues.type,
          config: defaultValues.config as { url: string },
          enabled: defaultValues.enabled === 1,
        }
      : {
          type: 'WEBHOOK',
          config: { url: '' },
          enabled: true,
        },
  });

  const channelType = watch('type');

  const handleDelete = () => {
    if (!defaultValues) {
      return;
    }
    if (confirm('Delete this notification channel?')) {
      deleteMutation.mutate(defaultValues.id, {
        onSuccess: () => navigate('/config/channels'),
      });
    }
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="panel space-y-6">
      <div className="text-lg font-medium text-gold-primary border-b border-gold-faint pb-2 mb-6 flex justify-between">
        <div>{defaultValues ? 'EDIT CHANNEL' : 'NEW CHANNEL'}</div>
        {defaultValues && (
          <div>
            <button
              type="button"
              onClick={handleDelete}
              className="text-xs uppercase hover:text-retro-red text-gold-dim transition-colors cursor-pointer"
            >
              Delete
            </button>
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div>
          <Label>Channel Type</Label>
          <select
            {...register('type')}
            className="bg-panel border border-gold-faint text-gold-primary px-3 py-2 text-sm font-mono w-full focus:outline-none focus:border-gold-primary"
          >
            <option value="WEBHOOK">Webhook</option>
          </select>
          <ErrorMsg>{errors.type?.message}</ErrorMsg>
        </div>

        <div className="flex items-end">
          <div className="flex items-center gap-2 pb-2">
            <input
              type="checkbox"
              id="enabled"
              {...register('enabled')}
              className="appearance-none w-4 h-4 border border-gold-faint bg-panel checked:bg-gold-primary checked:border-gold-primary cursor-pointer"
            />
            <label
              htmlFor="enabled"
              className="text-sm text-gold-dim cursor-pointer select-none"
            >
              Channel Enabled
            </label>
          </div>
        </div>
      </div>

      {channelType === 'WEBHOOK' && (
        <div>
          <Label>Webhook URL</Label>
          <Input
            {...register('config.url')}
            placeholder="https://hooks.example.com/webhook"
          />
          <ErrorMsg>{errors.config?.url?.message}</ErrorMsg>
          <p className="text-xs text-gold-dim mt-2">
            Receives POST requests with JSON payload when monitor status changes
          </p>
        </div>
      )}

      <div className="flex justify-end gap-3 pt-4 border-t border-gold-faint mt-4">
        <button type="button" onClick={onCancel} className="btn-gold">
          Cancel
        </button>
        <button
          type="submit"
          disabled={isSubmitting}
          className={cn('btn-gold active', isSubmitting && 'opacity-50')}
        >
          {isSubmitting ? 'Saving...' : 'Save Channel'}
        </button>
      </div>
    </form>
  );
}
