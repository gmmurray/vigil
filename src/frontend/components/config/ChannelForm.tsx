import { zodResolver } from '@hookform/resolvers/zod';
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { useNavigate } from 'react-router-dom';
import { useDeleteChannel } from '../../lib/queries';
import { type ChannelFormData, channelSchema } from '../../lib/schemas';
import { cn } from '../../lib/utils';
import type { Channel } from '../../types';
import { ErrorMsg, FormAlert, Input, Label } from '../ui/FormControls';

const SAMPLE_WEBHOOK_PAYLOAD = {
  monitor: {
    id: '01ABC123...',
    name: 'Production API',
    url: 'https://api.example.com/health',
  },
  event: 'DOWN',
  incident_id: '01XYZ789...',
  timestamp: '2025-01-15T10:30:00.000Z',
  details: {
    status_code: 500,
    error: 'Connection timeout',
    response_time: 5000,
  },
};

interface ChannelFormProps {
  defaultValues?: Channel;
  onSubmit: (data: ChannelFormData) => void;
  onCancel: () => void;
  isSubmitting: boolean;
  submitError?: Error | null;
}

export function ChannelForm({
  defaultValues,
  onSubmit,
  onCancel,
  isSubmitting,
  submitError,
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
    mode: 'onTouched',
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

      <FormAlert error={submitError} />

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
        <WebhookFields register={register} errors={errors} />
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

function WebhookFields({
  register,
  errors,
}: {
  register: ReturnType<typeof useForm<ChannelFormData>>['register'];
  errors: ReturnType<typeof useForm<ChannelFormData>>['formState']['errors'];
}) {
  const [showPayload, setShowPayload] = useState(false);

  return (
    <div className="space-y-4">
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

      <div className="border border-gold-faint">
        <button
          type="button"
          onClick={() => setShowPayload(!showPayload)}
          className="w-full px-3 py-2 text-left text-xs uppercase text-gold-dim hover:text-gold-primary hover:bg-active/30 cursor-pointer transition-colors flex justify-between items-center"
        >
          <span>Sample Payload</span>
          <span className="font-mono">{showPayload ? '[-]' : '[+]'}</span>
        </button>
        {showPayload && (
          <pre className="p-3 text-xs font-mono text-gold-dim bg-active/20 overflow-x-auto border-t border-gold-faint">
            {JSON.stringify(SAMPLE_WEBHOOK_PAYLOAD, null, 2)}
          </pre>
        )}
      </div>
    </div>
  );
}
