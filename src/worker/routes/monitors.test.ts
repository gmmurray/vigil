import { beforeEach, describe, expect, it, type Mock, vi } from 'vitest';

import { createDb } from '../db';
import app from './monitors';

// Mock the createDb module
vi.mock('../db', () => ({
  createDb: vi.fn(),
}));

// Mock ulid to return predictable IDs
vi.mock('ulid', () => ({
  ulid: vi.fn(() => 'TEST_ULID_123'),
}));

// Type for the mock query chain
interface MockQueryChain {
  from: Mock;
  where: Mock;
  orderBy: Mock;
  limit: Mock;
  offset: Mock;
  all: Mock;
  get: Mock;
  run: Mock;
  values: Mock;
  set: Mock;
}

// Helper to create mock database
function createMockDb() {
  const createChain = (): MockQueryChain => ({
    from: vi.fn().mockReturnThis(),
    where: vi.fn().mockReturnThis(),
    orderBy: vi.fn().mockReturnThis(),
    limit: vi.fn().mockReturnThis(),
    offset: vi.fn().mockReturnThis(),
    all: vi.fn().mockResolvedValue([]),
    get: vi.fn().mockResolvedValue(null),
    run: vi.fn().mockResolvedValue({ meta: { changes: 1 } }),
    values: vi.fn().mockReturnThis(),
    set: vi.fn().mockReturnThis(),
  });

  return {
    select: vi.fn(() => createChain()),
    insert: vi.fn(() => ({ values: vi.fn().mockResolvedValue(undefined) })),
    update: vi.fn(() => createChain()),
    delete: vi.fn(() => createChain()),
  };
}

type MockDb = ReturnType<typeof createMockDb>;

// Helper to create mock Durable Object stub
function createMockDurableObjectStub(
  fetchResponse: Response = new Response(JSON.stringify({ success: true })),
) {
  return {
    fetch: vi.fn().mockResolvedValue(fetchResponse),
  };
}

// Helper to create mock environment
function createMockEnv(stubResponse?: Response) {
  const mockDb = createMockDb();
  vi.mocked(createDb).mockReturnValue(
    mockDb as unknown as ReturnType<typeof createDb>,
  );

  const mockStub = createMockDurableObjectStub(stubResponse);

  return {
    env: {
      DB: {} as D1Database,
      MONITOR: {
        idFromName: vi.fn().mockReturnValue({ toString: () => 'mock-do-id' }),
        get: vi.fn().mockReturnValue(mockStub),
      },
    } as unknown as CloudflareBindings,
    mockDb,
    mockStub,
  };
}

// Sample monitor data
const sampleMonitor = {
  id: 'mon_123',
  name: 'Test Monitor',
  url: 'https://example.com',
  method: 'GET',
  intervalSeconds: 60,
  timeoutMs: 5000,
  expectedStatus: '200',
  headers: null,
  body: null,
  status: 'UP',
  enabled: 1,
  createdAt: '2024-01-01T00:00:00.000Z',
  updatedAt: '2024-01-01T00:00:00.000Z',
};

const sampleCheckResult = {
  id: 'chk_123',
  monitorId: 'mon_123',
  status: 'UP',
  responseTimeMs: 150,
  statusCode: 200,
  error: null,
  checkedAt: '2024-01-01T00:01:00.000Z',
};

// Helper to setup select mock with chained returns
function setupSelectMock(mockDb: MockDb, returnValues: unknown[]) {
  let callIndex = 0;
  mockDb.select = vi.fn(() => {
    const value =
      returnValues[callIndex] ?? returnValues[returnValues.length - 1];
    callIndex++;
    return value as ReturnType<MockDb['select']>;
  });
}

// Helper to create a select chain that returns data
function createSelectChain(data: { all?: unknown[]; get?: unknown }) {
  return {
    from: vi.fn().mockReturnValue({
      where: vi.fn().mockReturnValue({
        orderBy: vi.fn().mockReturnValue({
          limit: vi.fn().mockReturnValue({
            offset: vi.fn().mockReturnValue({
              all: vi.fn().mockResolvedValue(data.all ?? []),
            }),
            get: vi.fn().mockResolvedValue(data.get ?? null),
          }),
        }),
        all: vi.fn().mockResolvedValue(data.all ?? []),
        get: vi.fn().mockResolvedValue(data.get ?? null),
      }),
      all: vi.fn().mockResolvedValue(data.all ?? []),
      get: vi.fn().mockResolvedValue(data.get ?? null),
    }),
  };
}

describe('monitors routes', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('GET /', () => {
    it('returns empty array when no monitors exist', async () => {
      const { env } = createMockEnv();

      const res = await app.request('/', {}, env);
      const data = (await res.json()) as unknown[];

      expect(res.status).toBe(200);
      expect(data).toEqual([]);
    });

    it('returns monitors with recent checks', async () => {
      const { env, mockDb } = createMockEnv();

      // First call returns monitors list, second returns checks
      let callCount = 0;
      mockDb.select = vi.fn(() => {
        callCount++;
        if (callCount === 1) {
          return {
            from: vi.fn().mockReturnValue({
              all: vi.fn().mockResolvedValue([sampleMonitor]),
            }),
          } as unknown as ReturnType<MockDb['select']>;
        }
        return {
          from: vi.fn().mockReturnValue({
            where: vi.fn().mockReturnValue({
              orderBy: vi.fn().mockReturnValue({
                limit: vi.fn().mockReturnValue({
                  all: vi.fn().mockResolvedValue([sampleCheckResult]),
                }),
              }),
            }),
          }),
        } as unknown as ReturnType<MockDb['select']>;
      });

      const res = await app.request('/', {}, env);
      const data = (await res.json()) as Array<{
        name: string;
        recentChecks: unknown[];
      }>;

      expect(res.status).toBe(200);
      expect(data).toHaveLength(1);
      expect(data[0].name).toBe('Test Monitor');
      expect(data[0].recentChecks).toHaveLength(1);
    });
  });

  describe('POST /', () => {
    it('creates a new monitor with required fields', async () => {
      const { env, mockDb, mockStub } = createMockEnv();

      mockDb.insert = vi.fn().mockReturnValue({
        values: vi.fn().mockResolvedValue(undefined),
      });

      const res = await app.request(
        '/',
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            name: 'New Monitor',
            url: 'https://api.example.com',
          }),
        },
        env,
      );

      const data = (await res.json()) as {
        name: string;
        url: string;
        id: string;
        method: string;
        intervalSeconds: number;
        status: string;
      };

      expect(res.status).toBe(201);
      expect(data.name).toBe('New Monitor');
      expect(data.url).toBe('https://api.example.com');
      expect(data.id).toBe('TEST_ULID_123');
      expect(data.method).toBe('GET');
      expect(data.intervalSeconds).toBe(60);
      expect(data.status).toBe('UP');
      expect(mockStub.fetch).toHaveBeenCalledWith(
        'http://do/init',
        expect.objectContaining({ method: 'POST' }),
      );
    });

    it('creates monitor with custom fields', async () => {
      const { env, mockDb } = createMockEnv();

      mockDb.insert = vi.fn().mockReturnValue({
        values: vi.fn().mockResolvedValue(undefined),
      });

      const res = await app.request(
        '/',
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            name: 'Custom Monitor',
            url: 'https://api.example.com/health',
            method: 'POST',
            intervalSeconds: 120,
            timeoutMs: 10000,
            expectedStatus: '200,201',
            headers: { Authorization: 'Bearer token' },
            body: '{"ping": true}',
          }),
        },
        env,
      );

      const data = (await res.json()) as {
        method: string;
        intervalSeconds: number;
        timeoutMs: number;
        expectedStatus: string;
        headers: Record<string, string>;
        body: string;
      };

      expect(res.status).toBe(201);
      expect(data.method).toBe('POST');
      expect(data.intervalSeconds).toBe(120);
      expect(data.timeoutMs).toBe(10000);
      expect(data.expectedStatus).toBe('200,201');
      expect(data.headers).toEqual({ Authorization: 'Bearer token' });
      expect(data.body).toBe('{"ping": true}');
    });

    it('returns 400 when name is missing', async () => {
      const { env } = createMockEnv();

      const res = await app.request(
        '/',
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ url: 'https://example.com' }),
        },
        env,
      );

      expect(res.status).toBe(400);
      const data = (await res.json()) as { error: string };
      expect(data.error).toBe('Name and URL are required');
    });

    it('returns 400 when url is missing', async () => {
      const { env } = createMockEnv();

      const res = await app.request(
        '/',
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ name: 'Test' }),
        },
        env,
      );

      expect(res.status).toBe(400);
      const data = (await res.json()) as { error: string };
      expect(data.error).toBe('Name and URL are required');
    });

    it('handles enabled=0 explicitly', async () => {
      const { env, mockDb } = createMockEnv();

      mockDb.insert = vi.fn().mockReturnValue({
        values: vi.fn().mockResolvedValue(undefined),
      });

      const res = await app.request(
        '/',
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            name: 'Disabled Monitor',
            url: 'https://example.com',
            enabled: 0,
          }),
        },
        env,
      );

      const data = (await res.json()) as { enabled: number };

      expect(res.status).toBe(201);
      expect(data.enabled).toBe(0);
    });
  });

  describe('POST /test', () => {
    it('returns 400 when URL is missing', async () => {
      const { env } = createMockEnv();

      const res = await app.request(
        '/test',
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({}),
        },
        env,
      );

      expect(res.status).toBe(400);
      const data = (await res.json()) as { error: string };
      expect(data.error).toBe('URL is required');
    });

    it('returns 400 for invalid URL format', async () => {
      const { env } = createMockEnv();

      const res = await app.request(
        '/test',
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ url: 'not-a-valid-url' }),
        },
        env,
      );

      expect(res.status).toBe(400);
      const data = (await res.json()) as { success: boolean; error: string };
      expect(data.success).toBe(false);
      expect(data.error).toBe('Invalid URL format');
    });

    it('returns success when endpoint responds with expected status', async () => {
      const { env } = createMockEnv();

      const mockFetch = vi
        .spyOn(globalThis, 'fetch')
        .mockResolvedValue(new Response('OK', { status: 200 }));

      const res = await app.request(
        '/test',
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            url: 'https://httpbin.org/status/200',
            expectedStatus: '200',
          }),
        },
        env,
      );

      const data = (await res.json()) as {
        success: boolean;
        statusCode: number;
        responseTime: number;
        error: string | null;
      };

      expect(res.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.statusCode).toBe(200);
      expect(data.responseTime).toBeGreaterThanOrEqual(0);
      expect(data.error).toBeNull();

      mockFetch.mockRestore();
    });

    it('returns failure when status does not match expected', async () => {
      const { env } = createMockEnv();

      const mockFetch = vi
        .spyOn(globalThis, 'fetch')
        .mockResolvedValue(new Response('Not Found', { status: 404 }));

      const res = await app.request(
        '/test',
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            url: 'https://httpbin.org/status/404',
            expectedStatus: '200',
          }),
        },
        env,
      );

      const data = (await res.json()) as {
        success: boolean;
        statusCode: number;
        error: string;
      };

      expect(res.status).toBe(200);
      expect(data.success).toBe(false);
      expect(data.statusCode).toBe(404);
      expect(data.error).toBe('Expected 200, got 404');

      mockFetch.mockRestore();
    });

    it('handles multiple expected status codes', async () => {
      const { env } = createMockEnv();

      const mockFetch = vi
        .spyOn(globalThis, 'fetch')
        .mockResolvedValue(new Response('Created', { status: 201 }));

      const res = await app.request(
        '/test',
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            url: 'https://api.example.com',
            expectedStatus: '200,201,204',
          }),
        },
        env,
      );

      const data = (await res.json()) as {
        success: boolean;
        statusCode: number;
      };

      expect(data.success).toBe(true);
      expect(data.statusCode).toBe(201);

      mockFetch.mockRestore();
    });

    it('handles network errors', async () => {
      const { env } = createMockEnv();

      const mockFetch = vi
        .spyOn(globalThis, 'fetch')
        .mockRejectedValue(new Error('Network error'));

      const res = await app.request(
        '/test',
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ url: 'https://unreachable.example.com' }),
        },
        env,
      );

      const data = (await res.json()) as {
        success: boolean;
        statusCode: number | null;
        error: string;
      };

      expect(res.status).toBe(200);
      expect(data.success).toBe(false);
      expect(data.statusCode).toBeNull();
      expect(data.error).toBe('Network error');

      mockFetch.mockRestore();
    });

    it('handles timeout (AbortError)', async () => {
      const { env } = createMockEnv();

      const abortError = new Error('Aborted');
      abortError.name = 'AbortError';
      const mockFetch = vi
        .spyOn(globalThis, 'fetch')
        .mockRejectedValue(abortError);

      const res = await app.request(
        '/test',
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            url: 'https://slow.example.com',
            timeoutMs: 1000,
          }),
        },
        env,
      );

      const data = (await res.json()) as { success: boolean; error: string };

      expect(data.success).toBe(false);
      expect(data.error).toBe('Timeout after 1000ms');

      mockFetch.mockRestore();
    });

    it('uses custom method when provided', async () => {
      const { env } = createMockEnv();

      const mockFetch = vi
        .spyOn(globalThis, 'fetch')
        .mockResolvedValue(new Response('OK', { status: 200 }));

      await app.request(
        '/test',
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            url: 'https://api.example.com',
            method: 'HEAD',
          }),
        },
        env,
      );

      expect(mockFetch).toHaveBeenCalledWith(
        'https://api.example.com',
        expect.objectContaining({ method: 'HEAD' }),
      );

      mockFetch.mockRestore();
    });
  });

  describe('GET /:id', () => {
    it('returns monitor when found', async () => {
      const { env, mockDb } = createMockEnv();

      mockDb.select = vi
        .fn()
        .mockReturnValue(createSelectChain({ get: sampleMonitor }));

      const res = await app.request('/mon_123', {}, env);
      const data = (await res.json()) as { id: string; name: string };

      expect(res.status).toBe(200);
      expect(data.id).toBe('mon_123');
      expect(data.name).toBe('Test Monitor');
    });

    it('returns 404 when monitor not found', async () => {
      const { env, mockDb } = createMockEnv();

      mockDb.select = vi.fn().mockReturnValue(createSelectChain({ get: null }));

      const res = await app.request('/nonexistent', {}, env);

      expect(res.status).toBe(404);
      const data = (await res.json()) as { error: string };
      expect(data.error).toBe('Monitor not found');
    });
  });

  describe('POST /:id/check', () => {
    it('triggers a check on the Durable Object', async () => {
      const { env, mockStub } = createMockEnv(
        new Response(JSON.stringify({ status: 'UP', responseTimeMs: 100 })),
      );

      const res = await app.request('/mon_123/check', { method: 'POST' }, env);

      expect(res.status).toBe(200);
      expect(mockStub.fetch).toHaveBeenCalledWith('http://do/check', {
        method: 'POST',
      });
    });

    it('passes force=true query parameter', async () => {
      const { env, mockStub } = createMockEnv(
        new Response(JSON.stringify({ status: 'UP' })),
      );

      await app.request('/mon_123/check?force=true', { method: 'POST' }, env);

      expect(mockStub.fetch).toHaveBeenCalledWith(
        'http://do/check?force=true',
        {
          method: 'POST',
        },
      );
    });

    it('returns 500 when Durable Object check fails', async () => {
      const { env } = createMockEnv(new Response('Error', { status: 500 }));

      const res = await app.request('/mon_123/check', { method: 'POST' }, env);

      expect(res.status).toBe(500);
      const data = (await res.json()) as { error: string };
      expect(data.error).toBe('Check failed execution');
    });
  });

  describe('GET /:id/sub', () => {
    it('returns 426 when Upgrade header is missing', async () => {
      const { env } = createMockEnv();

      const res = await app.request('/mon_123/sub', {}, env);

      expect(res.status).toBe(426);
      const text = await res.text();
      expect(text).toBe('Expected Upgrade: websocket');
    });

    it('returns 426 when Upgrade header is not websocket', async () => {
      const { env } = createMockEnv();

      const res = await app.request(
        '/mon_123/sub',
        { headers: { Upgrade: 'http/2' } },
        env,
      );

      expect(res.status).toBe(426);
    });
  });

  describe('GET /:id/checks', () => {
    it('returns paginated check results', async () => {
      const { env, mockDb } = createMockEnv();

      mockDb.select = vi.fn().mockReturnValue({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockReturnValue({
            orderBy: vi.fn().mockReturnValue({
              limit: vi.fn().mockReturnValue({
                offset: vi.fn().mockReturnValue({
                  all: vi.fn().mockResolvedValue([sampleCheckResult]),
                }),
              }),
            }),
          }),
        }),
      });

      const res = await app.request('/mon_123/checks', {}, env);
      const data = (await res.json()) as {
        data: unknown[];
        meta: { monitorId: string; limit: number; offset: number };
      };

      expect(res.status).toBe(200);
      expect(data.data).toHaveLength(1);
      expect(data.meta.monitorId).toBe('mon_123');
      expect(data.meta.limit).toBe(100);
      expect(data.meta.offset).toBe(0);
    });

    it('respects limit and offset parameters', async () => {
      const { env, mockDb } = createMockEnv();

      const limitMock = vi.fn().mockReturnValue({
        offset: vi.fn().mockReturnValue({
          all: vi.fn().mockResolvedValue([]),
        }),
      });

      mockDb.select = vi.fn().mockReturnValue({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockReturnValue({
            orderBy: vi.fn().mockReturnValue({
              limit: limitMock,
            }),
          }),
        }),
      });

      const res = await app.request(
        '/mon_123/checks?limit=50&offset=100',
        {},
        env,
      );
      const data = (await res.json()) as {
        meta: { limit: number; offset: number };
      };

      expect(data.meta.limit).toBe(50);
      expect(data.meta.offset).toBe(100);
      expect(limitMock).toHaveBeenCalledWith(50);
    });

    it('caps limit at 500', async () => {
      const { env, mockDb } = createMockEnv();

      const limitMock = vi.fn().mockReturnValue({
        offset: vi.fn().mockReturnValue({
          all: vi.fn().mockResolvedValue([]),
        }),
      });

      mockDb.select = vi.fn().mockReturnValue({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockReturnValue({
            orderBy: vi.fn().mockReturnValue({
              limit: limitMock,
            }),
          }),
        }),
      });

      const res = await app.request('/mon_123/checks?limit=1000', {}, env);
      const data = (await res.json()) as { meta: { limit: number } };

      expect(data.meta.limit).toBe(500);
      expect(limitMock).toHaveBeenCalledWith(500);
    });
  });

  describe('GET /:id/incidents', () => {
    it('returns paginated incidents', async () => {
      const sampleIncident = {
        id: 'inc_123',
        monitorId: 'mon_123',
        startedAt: '2024-01-01T00:00:00.000Z',
        endedAt: '2024-01-01T01:00:00.000Z',
        cause: 'Connection timeout',
      };

      const { env, mockDb } = createMockEnv();

      mockDb.select = vi.fn().mockReturnValue({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockReturnValue({
            orderBy: vi.fn().mockReturnValue({
              limit: vi.fn().mockReturnValue({
                offset: vi.fn().mockReturnValue({
                  all: vi.fn().mockResolvedValue([sampleIncident]),
                }),
              }),
            }),
          }),
        }),
      });

      const res = await app.request('/mon_123/incidents', {}, env);
      const data = (await res.json()) as {
        data: Array<{ id: string }>;
        meta: { monitorId: string };
      };

      expect(res.status).toBe(200);
      expect(data.data).toHaveLength(1);
      expect(data.data[0].id).toBe('inc_123');
      expect(data.meta.monitorId).toBe('mon_123');
    });

    it('filters active incidents when active=true', async () => {
      const { env, mockDb } = createMockEnv();

      const whereMock = vi.fn().mockReturnValue({
        orderBy: vi.fn().mockReturnValue({
          limit: vi.fn().mockReturnValue({
            offset: vi.fn().mockReturnValue({
              all: vi.fn().mockResolvedValue([]),
            }),
          }),
        }),
      });

      mockDb.select = vi.fn().mockReturnValue({
        from: vi.fn().mockReturnValue({
          where: whereMock,
        }),
      });

      await app.request('/mon_123/incidents?active=true', {}, env);

      expect(whereMock).toHaveBeenCalled();
    });
  });

  describe('GET /:id/stats', () => {
    it('returns uptime and latency stats', async () => {
      const { env, mockDb } = createMockEnv();

      setupSelectMock(mockDb, [
        // Incidents query (no incidents = 100% uptime)
        createSelectChain({ all: [] }),
        // Latency query
        {
          from: vi.fn().mockReturnValue({
            where: vi.fn().mockReturnValue({
              orderBy: vi.fn().mockReturnValue({
                limit: vi.fn().mockReturnValue({
                  get: vi.fn().mockResolvedValue({ avg: 150 }),
                }),
              }),
            }),
          }),
        },
      ]);

      const res = await app.request('/mon_123/stats', {}, env);
      const data = (await res.json()) as {
        monitorId: string;
        period: string;
        uptime: number;
        avgResponseTime: number;
      };

      expect(res.status).toBe(200);
      expect(data.monitorId).toBe('mon_123');
      expect(data.period).toBe('30d');
      expect(data.uptime).toBe(100);
      expect(data.avgResponseTime).toBe(150);
    });

    it('calculates uptime based on incident duration', async () => {
      const { env, mockDb } = createMockEnv();

      const now = new Date();
      const oneHourAgo = new Date(now.getTime() - 60 * 60 * 1000);

      setupSelectMock(mockDb, [
        // One hour of downtime
        createSelectChain({
          all: [
            {
              id: 'inc_1',
              monitorId: 'mon_123',
              startedAt: oneHourAgo.toISOString(),
              endedAt: now.toISOString(),
            },
          ],
        }),
        // Latency
        {
          from: vi.fn().mockReturnValue({
            where: vi.fn().mockReturnValue({
              orderBy: vi.fn().mockReturnValue({
                limit: vi.fn().mockReturnValue({
                  get: vi.fn().mockResolvedValue({ avg: 100 }),
                }),
              }),
            }),
          }),
        },
      ]);

      const res = await app.request('/mon_123/stats', {}, env);
      const data = (await res.json()) as { uptime: number };

      // 1 hour down out of 30 days = ~99.86% uptime
      expect(data.uptime).toBeGreaterThan(99);
      expect(data.uptime).toBeLessThan(100);
    });

    it('handles null latency (no checks)', async () => {
      const { env, mockDb } = createMockEnv();

      setupSelectMock(mockDb, [
        createSelectChain({ all: [] }),
        {
          from: vi.fn().mockReturnValue({
            where: vi.fn().mockReturnValue({
              orderBy: vi.fn().mockReturnValue({
                limit: vi.fn().mockReturnValue({
                  get: vi.fn().mockResolvedValue(null),
                }),
              }),
            }),
          }),
        },
      ]);

      const res = await app.request('/mon_123/stats', {}, env);
      const data = (await res.json()) as { avgResponseTime: number };

      expect(data.avgResponseTime).toBe(0);
    });
  });

  describe('PUT /:id', () => {
    it('updates monitor fields', async () => {
      const { env, mockDb, mockStub } = createMockEnv();

      mockDb.select = vi
        .fn()
        .mockReturnValue(createSelectChain({ get: sampleMonitor }));

      mockDb.update = vi.fn().mockReturnValue({
        set: vi.fn().mockReturnValue({
          where: vi.fn().mockReturnValue({
            run: vi.fn().mockResolvedValue(undefined),
          }),
        }),
      });

      const res = await app.request(
        '/mon_123',
        {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            name: 'Updated Monitor',
            intervalSeconds: 120,
          }),
        },
        env,
      );

      const data = (await res.json()) as {
        success: boolean;
        name: string;
        intervalSeconds: number;
      };

      expect(res.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.name).toBe('Updated Monitor');
      expect(data.intervalSeconds).toBe(120);
      expect(mockStub.fetch).toHaveBeenCalledWith(
        'http://do/init',
        expect.objectContaining({ method: 'POST' }),
      );
    });

    it('returns 404 when monitor not found', async () => {
      const { env, mockDb } = createMockEnv();

      mockDb.select = vi.fn().mockReturnValue(createSelectChain({ get: null }));

      const res = await app.request(
        '/nonexistent',
        {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ name: 'Updated' }),
        },
        env,
      );

      expect(res.status).toBe(404);
    });

    it('allows setting headers to null', async () => {
      const { env, mockDb } = createMockEnv();

      mockDb.select = vi
        .fn()
        .mockReturnValue(
          createSelectChain({
            get: { ...sampleMonitor, headers: { foo: 'bar' } },
          }),
        );

      mockDb.update = vi.fn().mockReturnValue({
        set: vi.fn().mockReturnValue({
          where: vi.fn().mockReturnValue({
            run: vi.fn().mockResolvedValue(undefined),
          }),
        }),
      });

      const res = await app.request(
        '/mon_123',
        {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ headers: null }),
        },
        env,
      );

      const data = (await res.json()) as { headers: null };

      expect(res.status).toBe(200);
      expect(data.headers).toBeNull();
    });

    it('updates enabled status', async () => {
      const { env, mockDb } = createMockEnv();

      mockDb.select = vi
        .fn()
        .mockReturnValue(createSelectChain({ get: sampleMonitor }));

      mockDb.update = vi.fn().mockReturnValue({
        set: vi.fn().mockReturnValue({
          where: vi.fn().mockReturnValue({
            run: vi.fn().mockResolvedValue(undefined),
          }),
        }),
      });

      const res = await app.request(
        '/mon_123',
        {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ enabled: 0 }),
        },
        env,
      );

      const data = (await res.json()) as { enabled: number };

      expect(res.status).toBe(200);
      expect(data.enabled).toBe(0);
    });
  });

  describe('DELETE /:id', () => {
    it('deletes monitor and cleans up Durable Object', async () => {
      const { env, mockDb, mockStub } = createMockEnv();

      mockDb.delete = vi.fn().mockReturnValue({
        where: vi.fn().mockReturnValue({
          run: vi.fn().mockResolvedValue({ meta: { changes: 1 } }),
        }),
      });

      const res = await app.request('/mon_123', { method: 'DELETE' }, env);

      const data = (await res.json()) as { success: boolean };

      expect(res.status).toBe(200);
      expect(data.success).toBe(true);
      expect(mockStub.fetch).toHaveBeenCalledWith('http://do/delete', {
        method: 'POST',
      });
    });

    it('returns 404 when monitor not found', async () => {
      const { env, mockDb } = createMockEnv();

      mockDb.delete = vi.fn().mockReturnValue({
        where: vi.fn().mockReturnValue({
          run: vi.fn().mockResolvedValue({ meta: { changes: 0 } }),
        }),
      });

      const res = await app.request('/nonexistent', { method: 'DELETE' }, env);

      expect(res.status).toBe(404);
      const data = (await res.json()) as { error: string };
      expect(data.error).toBe('Monitor not found');
    });
  });

  describe('PATCH /bulk', () => {
    it('updates specific monitors by IDs', async () => {
      const { env, mockDb, mockStub } = createMockEnv();

      mockDb.update = vi.fn().mockReturnValue({
        set: vi.fn().mockReturnValue({
          where: vi.fn().mockReturnValue({
            run: vi.fn().mockResolvedValue(undefined),
          }),
        }),
      });

      const res = await app.request(
        '/bulk',
        {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            ids: ['mon_1', 'mon_2', 'mon_3'],
            update: { enabled: 0 },
          }),
        },
        env,
      );

      const data = (await res.json()) as { success: boolean; affected: number };

      expect(res.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.affected).toBe(3);
      expect(mockStub.fetch).toHaveBeenCalledTimes(3);
    });

    it('updates all monitors when ids is null', async () => {
      const { env, mockDb, mockStub } = createMockEnv();

      mockDb.select = vi.fn().mockReturnValue({
        from: vi.fn().mockReturnValue({
          all: vi.fn().mockResolvedValue([{ id: 'mon_1' }, { id: 'mon_2' }]),
        }),
      });

      mockDb.update = vi.fn().mockReturnValue({
        set: vi.fn().mockReturnValue({
          run: vi.fn().mockResolvedValue(undefined),
        }),
      });

      const res = await app.request(
        '/bulk',
        {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            ids: null,
            update: { enabled: 1 },
          }),
        },
        env,
      );

      const data = (await res.json()) as { affected: number };

      expect(res.status).toBe(200);
      expect(data.affected).toBe(2);
      expect(mockStub.fetch).toHaveBeenCalledTimes(2);
    });

    it('returns 400 when no update fields provided', async () => {
      const { env } = createMockEnv();

      const res = await app.request(
        '/bulk',
        {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            ids: ['mon_1'],
            update: {},
          }),
        },
        env,
      );

      expect(res.status).toBe(400);
      const data = (await res.json()) as { error: string };
      expect(data.error).toBe('No update fields provided');
    });

    it('treats empty ids array as update all (same as null)', async () => {
      const { env, mockDb, mockStub } = createMockEnv();

      mockDb.select = vi.fn().mockReturnValue({
        from: vi.fn().mockReturnValue({
          all: vi.fn().mockResolvedValue([{ id: 'mon_1' }, { id: 'mon_2' }]),
        }),
      });

      mockDb.update = vi.fn().mockReturnValue({
        set: vi.fn().mockReturnValue({
          run: vi.fn().mockResolvedValue(undefined),
        }),
      });

      const res = await app.request(
        '/bulk',
        {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            ids: [],
            update: { enabled: 0 },
          }),
        },
        env,
      );

      const data = (await res.json()) as { affected: number };

      expect(res.status).toBe(200);
      expect(data.affected).toBe(2);
      expect(mockStub.fetch).toHaveBeenCalledTimes(2);
    });
  });
});
