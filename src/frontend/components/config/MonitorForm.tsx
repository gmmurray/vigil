import { zodResolver } from '@hookform/resolvers/zod';
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { useNavigate } from 'react-router-dom';
import { api } from '../../lib/api';
import { useDeleteConfig } from '../../lib/queries';
import {
  HTTP_METHODS,
  type MonitorFormData,
  monitorSchema,
} from '../../lib/schemas';
import { cn } from '../../lib/utils';
import type { Monitor } from '../../types';
import { ErrorMsg, FormAlert, Input, Label } from '../ui/FormControls';

const METHODS_WITH_BODY = ['POST', 'PUT', 'PATCH'] as const;

interface MonitorFormProps {
  defaultValues?: Monitor;
  onSubmit: (data: MonitorFormData) => void;
  onCancel: () => void;
  isSubmitting: boolean;
  submitError?: Error | null;
}

type HeaderRow = { key: string; value: string };

function parseHeaders(
  headers: Record<string, string> | null | undefined,
): HeaderRow[] {
  if (!headers || Object.keys(headers).length === 0) {
    return [{ key: '', value: '' }];
  }
  return Object.entries(headers).map(([key, value]) => ({ key, value }));
}

function headersToRecord(rows: HeaderRow[]): Record<string, string> {
  const result: Record<string, string> = {};
  for (const row of rows) {
    if (row.key.trim()) {
      result[row.key.trim()] = row.value;
    }
  }
  return result;
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
  const [advancedOpen, setAdvancedOpen] = useState(
    () =>
      !!defaultValues?.headers && Object.keys(defaultValues.headers).length > 0,
  );
  const [headerRows, setHeaderRows] = useState<HeaderRow[]>(() =>
    parseHeaders(defaultValues?.headers),
  );

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    formState: { errors },
  } = useForm({
    resolver: zodResolver(monitorSchema),
    mode: 'onTouched',
    defaultValues: defaultValues
      ? ({
          ...defaultValues,
          enabled: defaultValues.enabled === 1,
          headers: defaultValues.headers ?? undefined,
          body: defaultValues.body ?? undefined,
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
  const watchedBody = watch('body') || '';

  const showBodyField = METHODS_WITH_BODY.includes(
    watchedMethod as (typeof METHODS_WITH_BODY)[number],
  );

  const updateHeader = (index: number, field: 'key' | 'value', val: string) => {
    const newRows = [...headerRows];
    newRows[index] = { ...newRows[index], [field]: val };
    setHeaderRows(newRows);
    setValue('headers', headersToRecord(newRows));
  };

  const addHeaderRow = () => {
    setHeaderRows([...headerRows, { key: '', value: '' }]);
  };

  const removeHeaderRow = (index: number) => {
    const newRows = headerRows.filter((_, i) => i !== index);
    if (newRows.length === 0) {
      newRows.push({ key: '', value: '' });
    }
    setHeaderRows(newRows);
    setValue('headers', headersToRecord(newRows));
  };

  const currentHeaders = headersToRecord(headerRows);

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
              headers={currentHeaders}
              body={watchedBody}
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
            {HTTP_METHODS.map(method => (
              <option key={method} value={method}>
                {method}
              </option>
            ))}
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

      {/* Advanced Options */}
      <div className="border border-gold-faint">
        <button
          type="button"
          onClick={() => setAdvancedOpen(!advancedOpen)}
          className="w-full flex items-center gap-2 px-4 py-3 text-sm text-gold-dim hover:text-gold-primary transition-colors cursor-pointer"
        >
          <span
            className={cn(
              'transition-transform',
              advancedOpen ? 'rotate-90' : '',
            )}
          >
            ▸
          </span>
          Advanced Options
          {Object.keys(currentHeaders).length > 0 && (
            <span className="text-xs text-gold-faint ml-2">
              ({Object.keys(currentHeaders).length} header
              {Object.keys(currentHeaders).length !== 1 ? 's' : ''})
            </span>
          )}
        </button>

        {advancedOpen && (
          <div className="px-4 pb-4 space-y-4 border-t border-gold-faint">
            {/* Headers Editor */}
            <div className="pt-4">
              <Label>
                Headers
                <span
                  className="ml-2 text-xs text-gold-faint font-normal"
                  title="Headers containing secrets (API keys, tokens) are stored in plaintext in your Cloudflare D1 database."
                >
                  ⚠ stored in plaintext
                </span>
              </Label>
              <div className="space-y-2">
                {headerRows.map((row, index) => (
                  <div key={index} className="flex gap-2">
                    <Input
                      placeholder="Header name"
                      value={row.key}
                      onChange={e => updateHeader(index, 'key', e.target.value)}
                      className="flex-1"
                    />
                    <Input
                      placeholder="Value"
                      value={row.value}
                      onChange={e =>
                        updateHeader(index, 'value', e.target.value)
                      }
                      className="flex-1"
                    />
                    <button
                      type="button"
                      onClick={() => removeHeaderRow(index)}
                      className="px-3 py-2 text-gold-dim hover:text-retro-red transition-colors cursor-pointer"
                      title="Remove header"
                    >
                      ✕
                    </button>
                  </div>
                ))}
              </div>
              <button
                type="button"
                onClick={addHeaderRow}
                className="mt-2 text-xs text-gold-dim hover:text-gold-primary transition-colors cursor-pointer"
              >
                + Add Header
              </button>
            </div>

            {/* Body (for POST/PUT/PATCH) */}
            {showBodyField && (
              <div>
                <Label>Request Body</Label>
                <textarea
                  {...register('body')}
                  placeholder='{"key": "value"}'
                  className="bg-panel border border-gold-faint text-gold-primary px-3 py-2 text-sm font-mono w-full focus:outline-none focus:border-gold-primary min-h-25 resize-y"
                />
                <p className="text-xs text-gold-faint mt-1">
                  Raw request body sent as-is. For JSON, include a Content-Type:
                  application/json header above.
                </p>
              </div>
            )}
          </div>
        )}
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
  headers?: Record<string, string>;
  body?: string;
}) {
  const [result, setResult] = useState<TestResult | null>(null);
  const [isTesting, setIsTesting] = useState(false);

  const isDisabled = !props.url || isTesting;

  const handleTest = async () => {
    if (isDisabled) return;

    setIsTesting(true);
    setResult(null);

    try {
      const config: Parameters<typeof api.testMonitorUrl>[0] = {
        url: props.url,
        method: props.method,
        timeoutMs: Number(props.timeoutMs) || 5000,
        expectedStatus: props.expectedStatus || '200',
      };

      // Only include headers if there are any
      if (props.headers && Object.keys(props.headers).length > 0) {
        config.headers = props.headers;
      }

      // Only include body for methods that support it
      if (props.body && ['POST', 'PUT', 'PATCH'].includes(props.method)) {
        config.body = props.body;
      }

      setResult(await api.testMonitorUrl(config));
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
