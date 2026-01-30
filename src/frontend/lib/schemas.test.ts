import { describe, expect, it } from 'vitest';
import { monitorSchema } from './schemas';

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
});
