import { describe, expect, it, vi } from 'vitest';
import { type CheckEndpointParams, checkEndpoint } from './check-endpoint';

describe('checkEndpoint', () => {
  const defaultParams: CheckEndpointParams = {
    url: 'https://example.com/health',
    method: 'GET',
    headers: null,
    body: null,
    timeoutMs: 5000,
    expectedStatus: '200',
  };

  describe('successful requests', () => {
    it('returns UP when response matches expected status code', async () => {
      const mockFetch = vi.fn().mockResolvedValue({
        status: 200,
      });

      const result = await checkEndpoint(
        defaultParams,
        mockFetch as unknown as typeof fetch,
      );

      expect(result.status).toBe('UP');
      expect(result.statusCode).toBe(200);
      expect(result.error).toBeNull();
      expect(result.responseTimeMs).toBeGreaterThanOrEqual(0);
    });

    it('returns UP for any status in comma-separated list', async () => {
      const mockFetch = vi.fn().mockResolvedValue({ status: 201 });

      const result = await checkEndpoint(
        { ...defaultParams, expectedStatus: '200,201,204' },
        mockFetch as unknown as typeof fetch,
      );

      expect(result.status).toBe('UP');
      expect(result.statusCode).toBe(201);
    });

    it('returns UP for 404 when explicitly expected', async () => {
      const mockFetch = vi.fn().mockResolvedValue({ status: 404 });

      const result = await checkEndpoint(
        { ...defaultParams, expectedStatus: '404' },
        mockFetch as unknown as typeof fetch,
      );

      expect(result.status).toBe('UP');
      expect(result.statusCode).toBe(404);
    });
  });

  describe('failed requests', () => {
    it('returns DOWN with error when status code is unexpected', async () => {
      const mockFetch = vi.fn().mockResolvedValue({ status: 500 });

      const result = await checkEndpoint(
        defaultParams,
        mockFetch as unknown as typeof fetch,
      );

      expect(result.status).toBe('DOWN');
      expect(result.statusCode).toBe(500);
      expect(result.error).toBe('Unexpected status code: 500');
    });

    it('returns DOWN with Timeout error on AbortError', async () => {
      const abortError = new Error('Aborted');
      abortError.name = 'AbortError';
      const mockFetch = vi.fn().mockRejectedValue(abortError);

      const result = await checkEndpoint(
        defaultParams,
        mockFetch as unknown as typeof fetch,
      );

      expect(result.status).toBe('DOWN');
      expect(result.statusCode).toBeNull();
      expect(result.error).toBe('Timeout');
    });

    it('returns DOWN with error message on network failure', async () => {
      const mockFetch = vi
        .fn()
        .mockRejectedValue(new Error('Connection refused'));

      const result = await checkEndpoint(
        defaultParams,
        mockFetch as unknown as typeof fetch,
      );

      expect(result.status).toBe('DOWN');
      expect(result.statusCode).toBeNull();
      expect(result.error).toBe('Connection refused');
    });

    it('returns DOWN with Network Error for non-Error throws', async () => {
      const mockFetch = vi.fn().mockRejectedValue('string error');

      const result = await checkEndpoint(
        defaultParams,
        mockFetch as unknown as typeof fetch,
      );

      expect(result.status).toBe('DOWN');
      expect(result.error).toBe('Network Error');
    });
  });

  describe('request configuration', () => {
    it('sends GET request to correct URL', async () => {
      const mockFetch = vi.fn().mockResolvedValue({ status: 200 });

      await checkEndpoint(defaultParams, mockFetch as unknown as typeof fetch);

      expect(mockFetch).toHaveBeenCalledWith(
        'https://example.com/health',
        expect.objectContaining({
          method: 'GET',
        }),
      );
    });

    it('sends POST request with body', async () => {
      const mockFetch = vi.fn().mockResolvedValue({ status: 200 });
      const params: CheckEndpointParams = {
        ...defaultParams,
        method: 'POST',
        body: '{"test": true}',
      };

      await checkEndpoint(params, mockFetch as unknown as typeof fetch);

      expect(mockFetch).toHaveBeenCalledWith(
        'https://example.com/health',
        expect.objectContaining({
          method: 'POST',
          body: '{"test": true}',
        }),
      );
    });

    it('includes custom headers when provided', async () => {
      const mockFetch = vi.fn().mockResolvedValue({ status: 200 });
      const params: CheckEndpointParams = {
        ...defaultParams,
        headers: {
          Authorization: 'Bearer token123',
          'X-Custom-Header': 'value',
        },
      };

      await checkEndpoint(params, mockFetch as unknown as typeof fetch);

      expect(mockFetch).toHaveBeenCalledWith(
        'https://example.com/health',
        expect.objectContaining({
          headers: {
            Authorization: 'Bearer token123',
            'X-Custom-Header': 'value',
          },
        }),
      );
    });

    it('omits headers when null', async () => {
      const mockFetch = vi.fn().mockResolvedValue({ status: 200 });

      await checkEndpoint(defaultParams, mockFetch as unknown as typeof fetch);

      const callArgs = mockFetch.mock.calls[0][1];
      expect(callArgs.headers).toBeUndefined();
    });

    it('omits body when null', async () => {
      const mockFetch = vi.fn().mockResolvedValue({ status: 200 });

      await checkEndpoint(defaultParams, mockFetch as unknown as typeof fetch);

      const callArgs = mockFetch.mock.calls[0][1];
      expect(callArgs.body).toBeUndefined();
    });

    it('passes abort signal for timeout', async () => {
      const mockFetch = vi.fn().mockResolvedValue({ status: 200 });

      await checkEndpoint(defaultParams, mockFetch as unknown as typeof fetch);

      const callArgs = mockFetch.mock.calls[0][1];
      expect(callArgs.signal).toBeInstanceOf(AbortSignal);
    });
  });

  describe('response timing', () => {
    it('measures response time in milliseconds', async () => {
      const mockFetch = vi.fn().mockImplementation(async () => {
        await new Promise(resolve => setTimeout(resolve, 50));
        return { status: 200 };
      });

      const result = await checkEndpoint(
        defaultParams,
        mockFetch as unknown as typeof fetch,
      );

      expect(result.responseTimeMs).toBeGreaterThanOrEqual(50);
      expect(result.responseTimeMs).toBeLessThan(200);
    });

    it('includes response time even on failure', async () => {
      const mockFetch = vi
        .fn()
        .mockRejectedValue(new Error('Connection refused'));

      const result = await checkEndpoint(
        defaultParams,
        mockFetch as unknown as typeof fetch,
      );

      expect(result.responseTimeMs).toBeGreaterThanOrEqual(0);
    });
  });

  describe('expected status parsing edge cases', () => {
    it('handles spaces in expected status list', async () => {
      const mockFetch = vi.fn().mockResolvedValue({ status: 201 });

      const result = await checkEndpoint(
        { ...defaultParams, expectedStatus: '200, 201, 204' },
        mockFetch as unknown as typeof fetch,
      );

      expect(result.status).toBe('UP');
    });

    it('returns DOWN when expectedStatus is empty', async () => {
      const mockFetch = vi.fn().mockResolvedValue({ status: 200 });

      const result = await checkEndpoint(
        { ...defaultParams, expectedStatus: '' },
        mockFetch as unknown as typeof fetch,
      );

      expect(result.status).toBe('DOWN');
      expect(result.error).toBe('Unexpected status code: 200');
    });

    it('returns DOWN when expectedStatus is invalid', async () => {
      const mockFetch = vi.fn().mockResolvedValue({ status: 200 });

      const result = await checkEndpoint(
        { ...defaultParams, expectedStatus: 'invalid' },
        mockFetch as unknown as typeof fetch,
      );

      expect(result.status).toBe('DOWN');
    });
  });
});
