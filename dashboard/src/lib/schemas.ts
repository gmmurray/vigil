import { z } from 'zod';

export const monitorSchema = z.object({
  name: z.string().min(1, 'Name is required'),
  url: z.string().url('Must be a valid URL'),
  method: z.enum(['GET', 'POST', 'HEAD']),
  intervalSeconds: z.number().min(10, 'Minimum 10 seconds').max(3600),
  timeoutMs: z.number().min(100).max(30000),
  expectedStatus: z.string().regex(/^(\d{3})(,\d{3})*$/, 'e.g. 200 or 200,201'),
  enabled: z.boolean().optional(),
});

export type MonitorFormData = z.infer<typeof monitorSchema>;
