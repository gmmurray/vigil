import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import { useNavigate } from 'react-router-dom';
import { useDeleteConfig } from '../../lib/queries';
import { type MonitorFormData, monitorSchema } from '../../lib/schemas';
import { cn } from '../../lib/utils';
import type { Monitor } from '../../types';
import { ErrorMsg, FormAlert, Input, Label } from '../ui/FormControls';

interface MonitorFormProps {
  defaultValues?: Monitor;
  onSubmit: (data: MonitorFormData) => void;
  onCancel: () => void;
  isSubmitting: boolean;
  submitError?: Error | null;
}

export function MonitorForm({
  defaultValues,
  onSubmit,
  onCancel,
  isSubmitting,
  submitError,
}: MonitorFormProps) {
  const navigate = useNavigate();
  const deleteMutation = useDeleteConfig();

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm({
    resolver: zodResolver(monitorSchema),
    mode: 'onTouched',
    defaultValues: defaultValues
      ? ({
          ...defaultValues,
          enabled: defaultValues.enabled === 1,
        } as MonitorFormData)
      : {
          method: 'GET',
          intervalSeconds: 60,
          timeoutMs: 5000,
          expectedStatus: '200',
          enabled: true,
        },
  });

  const handleDelete = () => {
    if (!defaultValues) {
      return;
    }
    if (confirm('Are you sure? This deletes all history.')) {
      deleteMutation.mutate(defaultValues.id, {
        onSuccess: () => navigate('/config'),
      });
    }
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="panel space-y-6">
      <div className="text-lg font-medium text-gold-primary border-b border-gold-faint pb-2 mb-6 flex justify-between">
        <div>{defaultValues ? 'EDIT MONITOR' : 'NEW MONITOR'}</div>
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
          <Label>Friendly Name</Label>
          <Input {...register('name')} placeholder="Production API" autoFocus />
          <ErrorMsg>{errors.name?.message}</ErrorMsg>
        </div>

        <div>
          <Label>Endpoint URL</Label>
          <Input
            {...register('url')}
            placeholder="https://api.example.com/health"
          />
          <ErrorMsg>{errors.url?.message}</ErrorMsg>
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
        <div>
          <Label>Method</Label>
          <select
            {...register('method')}
            className="bg-panel border border-gold-faint text-gold-primary px-3 py-2 text-sm font-mono w-full focus:outline-none focus:border-gold-primary"
          >
            <option value="GET">GET</option>
            <option value="POST">POST</option>
            <option value="HEAD">HEAD</option>
          </select>
        </div>

        <div>
          <Label>Interval (sec)</Label>
          <Input type="number" {...register('intervalSeconds')} />
          <ErrorMsg>{errors.intervalSeconds?.message}</ErrorMsg>
        </div>

        <div>
          <Label>Timeout (ms)</Label>
          <Input type="number" {...register('timeoutMs')} />
          <ErrorMsg>{errors.timeoutMs?.message}</ErrorMsg>
        </div>

        <div>
          <Label>Expected Status</Label>
          <Input {...register('expectedStatus')} />
          <ErrorMsg>{errors.expectedStatus?.message}</ErrorMsg>
        </div>
      </div>

      <div className="flex items-center gap-2 pt-2">
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
          Monitor Enabled
        </label>
      </div>

      <div className="flex justify-end gap-3 pt-4 border-t border-gold-faint mt-4">
        <button type="button" onClick={onCancel} className="btn-gold">
          Cancel
        </button>
        <button
          type="submit"
          disabled={isSubmitting}
          className={cn('btn-gold active', isSubmitting && 'opacity-50')}
        >
          {isSubmitting ? 'Saving...' : 'Save Monitor'}
        </button>
      </div>
    </form>
  );
}
