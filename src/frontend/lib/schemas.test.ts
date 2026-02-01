import { describe, expect, it } from 'vitest';
import {
  channelSchema,
  HTTP_METHODS,
  monitorSchema,
  numberFromInput,
  webhookConfigSchema,
} from './schemas';

describe('monitorSchema', () => {
  const validMonitor = {
    name: 'Test Monitor',
    url: 'https://example.com/health',
    method: 'GET' as const,
    intervalSeconds: 60,
    timeoutMs: 5000,
    expectedStatus: '200',
    enabled: true,
  };

  it('accepts valid monitor config', () => {
    const result = monitorSchema.safeParse(validMonitor);
    expect(result.success).toBe(true);
  });

  it('requires name', () => {
    const result = monitorSchema.safeParse({ ...validMonitor, name: '' });
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues[0].path).toContain('name');
    }
  });

  it('requires valid URL', () => {
    const result = monitorSchema.safeParse({
      ...validMonitor,
      url: 'not-a-url',
    });
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues[0].path).toContain('url');
    }
  });

  describe('interval vs timeout validation', () => {
    it('accepts interval >= timeout (in ms)', () => {
      const result = monitorSchema.safeParse({
        ...validMonitor,
        intervalSeconds: 10,
        timeoutMs: 10000, // 10s timeout, 10s interval - equal is OK
      });
      expect(result.success).toBe(true);
    });

    it('rejects interval < timeout', () => {
      const result = monitorSchema.safeParse({
        ...validMonitor,
        intervalSeconds: 10, // 10 seconds = 10000ms
        timeoutMs: 15000, // 15 seconds - timeout is longer than interval
      });
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues[0].message).toContain(
          'Interval must be greater than or equal to timeout',
        );
      }
    });

    it('accepts when interval is much larger than timeout', () => {
      const result = monitorSchema.safeParse({
        ...validMonitor,
        intervalSeconds: 60,
        timeoutMs: 5000,
      });
      expect(result.success).toBe(true);
    });
  });

  describe('expected status validation', () => {
    it('accepts single status code', () => {
      const result = monitorSchema.safeParse({
        ...validMonitor,
        expectedStatus: '200',
      });
      expect(result.success).toBe(true);
    });

    it('accepts multiple status codes', () => {
      const result = monitorSchema.safeParse({
        ...validMonitor,
        expectedStatus: '200,201,204',
      });
      expect(result.success).toBe(true);
    });

    it('rejects invalid format with spaces', () => {
      const result = monitorSchema.safeParse({
        ...validMonitor,
        expectedStatus: '200, 201',
      });
      expect(result.success).toBe(false);
    });

    it('rejects non-numeric status', () => {
      const result = monitorSchema.safeParse({
        ...validMonitor,
        expectedStatus: 'OK',
      });
      expect(result.success).toBe(false);
    });

    it('rejects empty status', () => {
      const result = monitorSchema.safeParse({
        ...validMonitor,
        expectedStatus: '',
      });
      expect(result.success).toBe(false);
    });
  });

  describe('interval bounds', () => {
    it('rejects interval less than 10 seconds', () => {
      const result = monitorSchema.safeParse({
        ...validMonitor,
        intervalSeconds: 5,
      });
      expect(result.success).toBe(false);
    });

    it('rejects interval greater than 3600 seconds', () => {
      const result = monitorSchema.safeParse({
        ...validMonitor,
        intervalSeconds: 3601,
      });
      expect(result.success).toBe(false);
    });
  });

  describe('timeout bounds', () => {
    it('rejects timeout less than 100ms', () => {
      const result = monitorSchema.safeParse({
        ...validMonitor,
        timeoutMs: 50,
      });
      expect(result.success).toBe(false);
    });

    it('rejects timeout greater than 30000ms', () => {
      const result = monitorSchema.safeParse({
        ...validMonitor,
        timeoutMs: 31000,
      });
      expect(result.success).toBe(false);
    });
  });

  describe('HTTP methods', () => {
    it.each(HTTP_METHODS)('accepts %s method', method => {
      const result = monitorSchema.safeParse({
        ...validMonitor,
        method,
      });
      expect(result.success).toBe(true);
    });

    it('rejects invalid method', () => {
      const result = monitorSchema.safeParse({
        ...validMonitor,
        method: 'INVALID',
      });
      expect(result.success).toBe(false);
    });
  });

  describe('headers validation', () => {
    it('accepts valid headers object', () => {
      const result = monitorSchema.safeParse({
        ...validMonitor,
        headers: { Authorization: 'Bearer token', 'X-Custom': 'value' },
      });
      expect(result.success).toBe(true);
    });

    it('accepts empty headers object', () => {
      const result = monitorSchema.safeParse({
        ...validMonitor,
        headers: {},
      });
      expect(result.success).toBe(true);
    });

    it('accepts undefined headers', () => {
      const result = monitorSchema.safeParse({
        ...validMonitor,
        headers: undefined,
      });
      expect(result.success).toBe(true);
    });

    it('accepts monitor without headers field', () => {
      const { ...monitorWithoutHeaders } = validMonitor;
      const result = monitorSchema.safeParse(monitorWithoutHeaders);
      expect(result.success).toBe(true);
    });
  });

  describe('body validation', () => {
    it('accepts valid body string', () => {
      const result = monitorSchema.safeParse({
        ...validMonitor,
        method: 'POST',
        body: '{"key": "value"}',
      });
      expect(result.success).toBe(true);
    });

    it('accepts empty body string', () => {
      const result = monitorSchema.safeParse({
        ...validMonitor,
        body: '',
      });
      expect(result.success).toBe(true);
    });

    it('accepts undefined body', () => {
      const result = monitorSchema.safeParse({
        ...validMonitor,
        body: undefined,
      });
      expect(result.success).toBe(true);
    });

    it('accepts monitor without body field', () => {
      const { ...monitorWithoutBody } = validMonitor;
      const result = monitorSchema.safeParse(monitorWithoutBody);
      expect(result.success).toBe(true);
    });
  });
});

describe('webhookConfigSchema', () => {
  it('accepts valid webhook URL', () => {
    const result = webhookConfigSchema.safeParse({
      url: 'https://hooks.slack.com/services/xxx',
    });
    expect(result.success).toBe(true);
  });

  it('rejects invalid URL', () => {
    const result = webhookConfigSchema.safeParse({
      url: 'not-a-url',
    });
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues[0].path).toContain('url');
    }
  });

  it('rejects missing URL', () => {
    const result = webhookConfigSchema.safeParse({});
    expect(result.success).toBe(false);
  });

  it('rejects empty URL', () => {
    const result = webhookConfigSchema.safeParse({ url: '' });
    expect(result.success).toBe(false);
  });
});

describe('channelSchema', () => {
  const validChannel = {
    type: 'WEBHOOK' as const,
    config: { url: 'https://hooks.example.com/webhook' },
    enabled: true,
  };

  it('accepts valid channel config', () => {
    const result = channelSchema.safeParse(validChannel);
    expect(result.success).toBe(true);
  });

  it('accepts channel without enabled field', () => {
    const { enabled, ...channelWithoutEnabled } = validChannel;
    const result = channelSchema.safeParse(channelWithoutEnabled);
    expect(result.success).toBe(true);
  });

  it('rejects invalid type', () => {
    const result = channelSchema.safeParse({
      ...validChannel,
      type: 'INVALID',
    });
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues[0].path).toContain('type');
    }
  });

  it('rejects missing type', () => {
    const { type, ...channelWithoutType } = validChannel;
    const result = channelSchema.safeParse(channelWithoutType);
    expect(result.success).toBe(false);
  });

  it('rejects missing config', () => {
    const { config, ...channelWithoutConfig } = validChannel;
    const result = channelSchema.safeParse(channelWithoutConfig);
    expect(result.success).toBe(false);
  });

  it('rejects invalid config URL', () => {
    const result = channelSchema.safeParse({
      ...validChannel,
      config: { url: 'not-a-url' },
    });
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues[0].path).toContain('config');
    }
  });

  it('accepts enabled as false', () => {
    const result = channelSchema.safeParse({
      ...validChannel,
      enabled: false,
    });
    expect(result.success).toBe(true);
  });
});

describe('numberFromInput', () => {
  it('returns undefined for empty string', () => {
    expect(numberFromInput('')).toBeUndefined();
  });

  it('returns undefined for null', () => {
    expect(numberFromInput(null)).toBeUndefined();
  });

  it('returns undefined for undefined', () => {
    expect(numberFromInput(undefined)).toBeUndefined();
  });

  it('converts valid numeric string to number', () => {
    expect(numberFromInput('42')).toBe(42);
    expect(numberFromInput('3.14')).toBe(3.14);
    expect(numberFromInput('0')).toBe(0);
  });

  it('converts negative numeric string to number', () => {
    expect(numberFromInput('-10')).toBe(-10);
  });

  it('returns original value for non-numeric string', () => {
    expect(numberFromInput('abc')).toBe('abc');
    expect(numberFromInput('12abc')).toBe('12abc');
  });

  it('passes through numbers unchanged', () => {
    expect(numberFromInput(42)).toBe(42);
    expect(numberFromInput(0)).toBe(0);
    expect(numberFromInput(-5)).toBe(-5);
  });
});
