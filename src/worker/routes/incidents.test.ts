import { beforeEach, describe, expect, it, type Mock, vi } from 'vitest';

import { createDb } from '../db';
import app from './incidents';

// Mock the createDb module
vi.mock('../db', () => ({
  createDb: vi.fn(),
}));

// Type for the mock query chain
interface MockQueryChain {
  from: Mock;
  where: Mock;
  orderBy: Mock;
  limit: Mock;
  offset: Mock;
  all: Mock;
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
  });

  return {
    select: vi.fn(() => createChain()),
  };
}

// Helper to create mock environment
function createMockEnv() {
  const mockDb = createMockDb();
  vi.mocked(createDb).mockReturnValue(mockDb as unknown as ReturnType<typeof createDb>);

  return {
    env: {
      DB: {} as D1Database,
    } as unknown as CloudflareBindings,
    mockDb,
  };
}

// Sample incident data
const sampleIncident = {
  id: 'inc_123',
  monitorId: 'mon_456',
  startedAt: '2024-01-01T00:00:00.000Z',
  endedAt: '2024-01-01T01:00:00.000Z',
  cause: 'Connection timeout',
};

const activeIncident = {
  id: 'inc_789',
  monitorId: 'mon_456',
  startedAt: '2024-01-02T00:00:00.000Z',
  endedAt: null,
  cause: 'Server error',
};

describe('incidents routes', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('GET /', () => {
    it('returns empty array when no incidents exist', async () => {
      const { env } = createMockEnv();

      const res = await app.request('/', {}, env);
      const data = (await res.json()) as {
        data: unknown[];
        meta: { limit: number; offset: number };
      };

      expect(res.status).toBe(200);
      expect(data.data).toEqual([]);
      expect(data.meta.limit).toBe(50);
      expect(data.meta.offset).toBe(0);
    });

    it('returns all incidents with default pagination', async () => {
      const { env, mockDb } = createMockEnv();

      mockDb.select = vi.fn().mockReturnValue({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockReturnValue({
            orderBy: vi.fn().mockReturnValue({
              limit: vi.fn().mockReturnValue({
                offset: vi.fn().mockReturnValue({
                  all: vi.fn().mockResolvedValue([sampleIncident, activeIncident]),
                }),
              }),
            }),
          }),
        }),
      });

      const res = await app.request('/', {}, env);
      const data = (await res.json()) as {
        data: Array<{ id: string }>;
        meta: { limit: number; offset: number };
      };

      expect(res.status).toBe(200);
      expect(data.data).toHaveLength(2);
      expect(data.data[0].id).toBe('inc_123');
      expect(data.meta.limit).toBe(50);
      expect(data.meta.offset).toBe(0);
    });

    it('filters active incidents when active=true', async () => {
      const { env, mockDb } = createMockEnv();

      const whereMock = vi.fn().mockReturnValue({
        orderBy: vi.fn().mockReturnValue({
          limit: vi.fn().mockReturnValue({
            offset: vi.fn().mockReturnValue({
              all: vi.fn().mockResolvedValue([activeIncident]),
            }),
          }),
        }),
      });

      mockDb.select = vi.fn().mockReturnValue({
        from: vi.fn().mockReturnValue({
          where: whereMock,
        }),
      });

      const res = await app.request('/?active=true', {}, env);
      const data = (await res.json()) as { data: Array<{ id: string; endedAt: null }> };

      expect(res.status).toBe(200);
      expect(data.data).toHaveLength(1);
      expect(data.data[0].id).toBe('inc_789');
      expect(data.data[0].endedAt).toBeNull();
      expect(whereMock).toHaveBeenCalled();
    });

    it('filters by monitorId', async () => {
      const { env, mockDb } = createMockEnv();

      const whereMock = vi.fn().mockReturnValue({
        orderBy: vi.fn().mockReturnValue({
          limit: vi.fn().mockReturnValue({
            offset: vi.fn().mockReturnValue({
              all: vi.fn().mockResolvedValue([sampleIncident]),
            }),
          }),
        }),
      });

      mockDb.select = vi.fn().mockReturnValue({
        from: vi.fn().mockReturnValue({
          where: whereMock,
        }),
      });

      const res = await app.request('/?monitorId=mon_456', {}, env);
      const data = (await res.json()) as { data: Array<{ monitorId: string }> };

      expect(res.status).toBe(200);
      expect(data.data).toHaveLength(1);
      expect(data.data[0].monitorId).toBe('mon_456');
      expect(whereMock).toHaveBeenCalled();
    });

    it('filters by both active and monitorId', async () => {
      const { env, mockDb } = createMockEnv();

      const whereMock = vi.fn().mockReturnValue({
        orderBy: vi.fn().mockReturnValue({
          limit: vi.fn().mockReturnValue({
            offset: vi.fn().mockReturnValue({
              all: vi.fn().mockResolvedValue([activeIncident]),
            }),
          }),
        }),
      });

      mockDb.select = vi.fn().mockReturnValue({
        from: vi.fn().mockReturnValue({
          where: whereMock,
        }),
      });

      const res = await app.request('/?active=true&monitorId=mon_456', {}, env);
      const data = (await res.json()) as { data: unknown[] };

      expect(res.status).toBe(200);
      expect(data.data).toHaveLength(1);
      expect(whereMock).toHaveBeenCalled();
    });

    it('respects custom limit parameter', async () => {
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

      const res = await app.request('/?limit=10', {}, env);
      const data = (await res.json()) as { meta: { limit: number } };

      expect(res.status).toBe(200);
      expect(data.meta.limit).toBe(10);
      expect(limitMock).toHaveBeenCalledWith(10);
    });

    it('respects custom offset parameter', async () => {
      const { env, mockDb } = createMockEnv();

      const offsetMock = vi.fn().mockReturnValue({
        all: vi.fn().mockResolvedValue([]),
      });

      mockDb.select = vi.fn().mockReturnValue({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockReturnValue({
            orderBy: vi.fn().mockReturnValue({
              limit: vi.fn().mockReturnValue({
                offset: offsetMock,
              }),
            }),
          }),
        }),
      });

      const res = await app.request('/?offset=100', {}, env);
      const data = (await res.json()) as { meta: { offset: number } };

      expect(res.status).toBe(200);
      expect(data.meta.offset).toBe(100);
      expect(offsetMock).toHaveBeenCalledWith(100);
    });

    it('handles combined limit and offset', async () => {
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

      const res = await app.request('/?limit=25&offset=50', {}, env);
      const data = (await res.json()) as { meta: { limit: number; offset: number } };

      expect(res.status).toBe(200);
      expect(data.meta.limit).toBe(25);
      expect(data.meta.offset).toBe(50);
    });

    it('handles invalid limit (parseInt returns NaN, serialized as null)', async () => {
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

      const res = await app.request('/?limit=invalid', {}, env);
      const data = (await res.json()) as { meta: { limit: number | null } };

      expect(res.status).toBe(200);
      // parseInt('invalid', 10) returns NaN, JSON.stringify(NaN) becomes null
      expect(data.meta.limit).toBeNull();
      // The actual call to db uses NaN
      expect(limitMock).toHaveBeenCalledWith(NaN);
    });

    it('returns incidents ordered by startedAt descending', async () => {
      const { env, mockDb } = createMockEnv();

      const olderIncident = { ...sampleIncident, startedAt: '2023-01-01T00:00:00.000Z' };
      const newerIncident = { ...activeIncident, startedAt: '2024-06-01T00:00:00.000Z' };

      mockDb.select = vi.fn().mockReturnValue({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockReturnValue({
            orderBy: vi.fn().mockReturnValue({
              limit: vi.fn().mockReturnValue({
                offset: vi.fn().mockReturnValue({
                  all: vi.fn().mockResolvedValue([newerIncident, olderIncident]),
                }),
              }),
            }),
          }),
        }),
      });

      const res = await app.request('/', {}, env);
      const data = (await res.json()) as { data: Array<{ startedAt: string }> };

      expect(res.status).toBe(200);
      expect(data.data).toHaveLength(2);
      // Newer incident should come first (descending order)
      expect(data.data[0].startedAt).toBe('2024-06-01T00:00:00.000Z');
      expect(data.data[1].startedAt).toBe('2023-01-01T00:00:00.000Z');
    });
  });
});
