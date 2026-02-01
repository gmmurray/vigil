import { z } from 'zod';

export const numberFromInput = (val: unknown) => {
  if (val === '' || val === null || val === undefined) {
    return undefined;
  }
  const num = Number(val);
  return Number.isNaN(num) ? val : num;
};

export const HTTP_METHODS = [
  'GET',
  'POST',
  'PUT',
  'PATCH',
  'DELETE',
  'HEAD',
  'OPTIONS',
] as const;

export type HttpMethod = (typeof HTTP_METHODS)[number];

export const monitorSchema = z
  .object({
    name: z.string().min(1, 'Name is required'),
    url: z.string().url('Must be a valid URL'),
    method: z.enum(HTTP_METHODS),
    intervalSeconds: z.preprocess(
      numberFromInput,
      z
        .number({
          required_error: 'Interval is required',
          invalid_type_error: 'Interval must be a number',
        })
        .min(10, 'Minimum 10 seconds')
        .max(3600, 'Maximum 1 hour'),
    ),
    timeoutMs: z.preprocess(
      numberFromInput,
      z
        .number({
          required_error: 'Timeout is required',
          invalid_type_error: 'Timeout must be a number',
        })
        .min(100, 'Minimum 100ms')
        .max(30000, 'Maximum 30 seconds'),
    ),
    expectedStatus: z
      .string()
      .min(1, 'Expected status is required')
      .regex(/^(\d{3})(,\d{3})*$/, 'Use format: 200 or 200,201,204'),
    headers: z.record(z.string(), z.string()).optional(),
    body: z.string().optional(),
    enabled: z.boolean().optional(),
  })
  .refine(data => data.intervalSeconds * 1000 >= data.timeoutMs, {
    message: 'Interval must be greater than or equal to timeout',
    path: ['intervalSeconds'],
  });

export type MonitorFormData = z.infer<typeof monitorSchema>;

export const webhookConfigSchema = z.object({
  url: z.string().url('Must be a valid URL'),
});

export const channelSchema = z.object({
  type: z.enum(['WEBHOOK']),
  config: webhookConfigSchema,
  enabled: z.boolean().optional(),
});

export type ChannelFormData = z.infer<typeof channelSchema>;
