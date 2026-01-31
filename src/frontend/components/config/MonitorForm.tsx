import { zodResolver } from '@hookform/resolvers/zod';
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { useNavigate } from 'react-router-dom';
import { api } from '../../lib/api';
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
    watch,
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

  const watchedUrl = watch('url') || '';
  const watchedMethod = watch('method') || 'GET';
  const watchedTimeout = watch('timeoutMs') || 5000;
  const watchedExpectedStatus = watch('expectedStatus') || '200';

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
          <div className="flex gap-2">
            <Input
              {...register('url')}
              placeholder="https://api.example.com/health"
              className="flex-1"
            />
            <UrlTestButton
              url={watchedUrl}
              method={watchedMethod}
              timeoutMs={Number(watchedTimeout)}
              expectedStatus={watchedExpectedStatus}
            />
          </div>
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

type TestResult = {
  success: boolean;
  statusCode: number | null;
  responseTime: number;
  error: string | null;
};

function UrlTestButton(props: {
  url: string;
  method: string;
  timeoutMs: number;
  expectedStatus: string;
}) {
  const [result, setResult] = useState<TestResult | null>(null);
  const [isTesting, setIsTesting] = useState(false);

  const isDisabled = !props.url || isTesting;

  const handleTest = async () => {
    if (isDisabled) return;

    setIsTesting(true);
    setResult(null);

    try {
      setResult(
        await api.testMonitorUrl({
          url: props.url,
          method: props.method,
          timeoutMs: Number(props.timeoutMs) || 5000,
          expectedStatus: props.expectedStatus || '200',
        }),
      );
    } catch {
      setResult({
        success: false,
        statusCode: null,
        responseTime: 0,
        error: 'Failed',
      });
    } finally {
      setIsTesting(false);
    }
  };

  const label = isTesting
    ? 'Testing...'
    : result
      ? result.success
        ? `✓ ${result.statusCode} · ${result.responseTime}ms`
        : `✗ ${result.error}`
      : 'Test';

  const style = !result
    ? 'btn-gold'
    : result.success
      ? 'border border-retro-green bg-retro-green/10 text-retro-green hover:bg-retro-green/20'
      : 'border border-retro-red bg-retro-red/10 text-retro-red hover:bg-retro-red/20';

  return (
    <button
      type="button"
      onClick={handleTest}
      disabled={isDisabled}
      title={result ? 'Click to test again' : 'Test endpoint'}
      className={cn(
        'px-3 py-2 text-xs font-mono whitespace-nowrap transition-colors shrink-0',
        style,
        isDisabled && 'opacity-50 cursor-not-allowed',
        !isDisabled && 'cursor-pointer',
      )}
    >
      {label}
    </button>
  );
}
