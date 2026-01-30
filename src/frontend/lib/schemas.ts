import { z } from 'zod';

const numberFromInput = (val: unknown) => {
  if (val === '' || val === null || val === undefined) {
    return undefined;
  }
  const num = Number(val);
  return Number.isNaN(num) ? val : num;
};

export const monitorSchema = z.object({
  name: z.string().min(1, 'Name is required'),
  url: z.string().url('Must be a valid URL'),
  method: z.enum(['GET', 'POST', 'HEAD']),
  intervalSeconds: z.preprocess(
    numberFromInput,
    z
      .number({
        required_error: 'Interval is required',
        invalid_type_error: 'Interval must be a number',
      })
      .min(10, 'Minimum 10 seconds')
      .max(3600),
  ),
  timeoutMs: z.preprocess(
    numberFromInput,
    z
      .number({
        required_error: 'Timeout is required',
        invalid_type_error: 'Timeout must be a number',
      })
      .min(100)
      .max(30000),
  ),
  expectedStatus: z.string().regex(/^(\d{3})(,\d{3})*$/, 'e.g. 200 or 200,201'),
  enabled: z.boolean().optional(),
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
