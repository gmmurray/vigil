import { describe, expect, it, vi } from 'vitest';
import {
  calculateBackoffDelay,
  deliverWebhookWithRetry,
  type WebhookConfig,
} from './webhook';

describe('calculateBackoffDelay', () => {
  it('returns 1000ms for attempt 1', () => {
    expect(calculateBackoffDelay(1)).toBe(1000);
  });

  it('returns 2000ms for attempt 2', () => {
    expect(calculateBackoffDelay(2)).toBe(2000);
  });

  it('returns 4000ms for attempt 3', () => {
    expect(calculateBackoffDelay(3)).toBe(4000);
  });

  it('returns 8000ms for attempt 4', () => {
    expect(calculateBackoffDelay(4)).toBe(8000);
  });
});

describe('deliverWebhookWithRetry', () => {
  const defaultConfig: WebhookConfig = {
    url: 'https://example.com/webhook',
    timeoutMs: 5000,
    maxRetries: 3,
  };

  const payload = { event: 'DOWN', monitor: { id: 'test' } };

  it('returns success on first attempt when fetch succeeds', async () => {
    const mockFetch = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
    });

    const result = await deliverWebhookWithRetry(
      defaultConfig,
      payload,
      mockFetch as unknown as typeof fetch,
    );

    expect(result.success).toBe(true);
    expect(result.error).toBeNull();
    expect(result.attempts).toBe(1);
    expect(mockFetch).toHaveBeenCalledTimes(1);
  });

  it('retries on HTTP error and succeeds on second attempt', async () => {
    const mockFetch = vi
      .fn()
      .mockResolvedValueOnce({ ok: false, status: 500 })
      .mockResolvedValueOnce({ ok: true, status: 200 });

    const result = await deliverWebhookWithRetry(
      { ...defaultConfig, maxRetries: 3 },
      payload,
      mockFetch as unknown as typeof fetch,
    );

    expect(result.success).toBe(true);
    expect(result.error).toBeNull();
    expect(result.attempts).toBe(2);
    expect(mockFetch).toHaveBeenCalledTimes(2);
  });

  it('returns failure after exhausting all retries', async () => {
    const mockFetch = vi.fn().mockResolvedValue({ ok: false, status: 503 });

    const result = await deliverWebhookWithRetry(
      { ...defaultConfig, maxRetries: 3 },
      payload,
      mockFetch as unknown as typeof fetch,
    );

    expect(result.success).toBe(false);
    expect(result.error).toBe('HTTP 503');
    expect(result.attempts).toBe(3);
    expect(mockFetch).toHaveBeenCalledTimes(3);
  });

  it('handles network errors with retry', async () => {
    const mockFetch = vi
      .fn()
      .mockRejectedValueOnce(new Error('Connection refused'))
      .mockResolvedValueOnce({ ok: true, status: 200 });

    const result = await deliverWebhookWithRetry(
      defaultConfig,
      payload,
      mockFetch as unknown as typeof fetch,
    );

    expect(result.success).toBe(true);
    expect(result.attempts).toBe(2);
  });

  it('reports network error after exhausting retries', async () => {
    const mockFetch = vi
      .fn()
      .mockRejectedValue(new Error('Connection refused'));

    const result = await deliverWebhookWithRetry(
      { ...defaultConfig, maxRetries: 2 },
      payload,
      mockFetch as unknown as typeof fetch,
    );

    expect(result.success).toBe(false);
    expect(result.error).toBe('Connection refused');
    expect(result.attempts).toBe(2);
  });

  it('handles AbortError as Timeout', async () => {
    const abortError = new Error('Aborted');
    abortError.name = 'AbortError';

    const mockFetch = vi.fn().mockRejectedValue(abortError);

    const result = await deliverWebhookWithRetry(
      { ...defaultConfig, maxRetries: 1 },
      payload,
      mockFetch as unknown as typeof fetch,
    );

    expect(result.success).toBe(false);
    expect(result.error).toBe('Timeout');
    expect(result.attempts).toBe(1);
  });

  it('handles unknown error types', async () => {
    const mockFetch = vi.fn().mockRejectedValue('string error');

    const result = await deliverWebhookWithRetry(
      { ...defaultConfig, maxRetries: 1 },
      payload,
      mockFetch as unknown as typeof fetch,
    );

    expect(result.success).toBe(false);
    expect(result.error).toBe('Unknown error');
  });

  it('sends correct request format', async () => {
    const mockFetch = vi.fn().mockResolvedValue({ ok: true, status: 200 });

    await deliverWebhookWithRetry(
      defaultConfig,
      payload,
      mockFetch as unknown as typeof fetch,
    );

    expect(mockFetch).toHaveBeenCalledWith(
      'https://example.com/webhook',
      expect.objectContaining({
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      }),
    );
  });

  it('respects maxRetries=1 (no retries)', async () => {
    const mockFetch = vi.fn().mockResolvedValue({ ok: false, status: 500 });

    const result = await deliverWebhookWithRetry(
      { ...defaultConfig, maxRetries: 1 },
      payload,
      mockFetch as unknown as typeof fetch,
    );

    expect(result.success).toBe(false);
    expect(result.attempts).toBe(1);
    expect(mockFetch).toHaveBeenCalledTimes(1);
  });

  it('clears timeout on successful response', async () => {
    vi.useFakeTimers();

    const mockFetch = vi.fn().mockImplementation(() => {
      return Promise.resolve({ ok: true, status: 200 });
    });

    const resultPromise = deliverWebhookWithRetry(
      defaultConfig,
      payload,
      mockFetch as unknown as typeof fetch,
    );

    await vi.runAllTimersAsync();
    const result = await resultPromise;

    expect(result.success).toBe(true);

    vi.useRealTimers();
  });
});
