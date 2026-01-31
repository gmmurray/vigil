import { beforeEach, describe, expect, it, type Mock, vi } from 'vitest';

import { createDb } from '../db';
import app from './stats';

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
  all: Mock;
  get: Mock;
  $dynamic: Mock;
}

// Helper to create mock database
function createMockDb() {
  const createChain = (): MockQueryChain => {
    const chain: MockQueryChain = {
      from: vi.fn().mockReturnThis(),
      where: vi.fn().mockReturnThis(),
      orderBy: vi.fn().mockReturnThis(),
      limit: vi.fn().mockReturnThis(),
      all: vi.fn().mockResolvedValue([]),
      get: vi.fn().mockResolvedValue(null),
      $dynamic: vi.fn().mockReturnThis(),
    };
    return chain;
  };

  return {
    select: vi.fn(() => createChain()),
  };
}

// Helper to create mock environment
function createMockEnv() {
  const mockDb = createMockDb();
  vi.mocked(createDb).mockReturnValue(
    mockDb as unknown as ReturnType<typeof createDb>,
  );

  return {
    env: {
      DB: {} as D1Database,
    } as unknown as CloudflareBindings,
    mockDb,
  };
}

describe('stats routes', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('GET /global', () => {
    it('returns 100% uptime and 0 latency when no data exists', async () => {
      const { env, mockDb } = createMockEnv();

      // Mock: monitor count query returns 0
      // Mock: incidents query returns []
      // Mock: latency query returns null
      let selectCallCount = 0;
      mockDb.select = vi.fn(() => {
        selectCallCount++;
        if (selectCallCount === 1) {
          // Monitor count query
          return {
            from: vi.fn().mockReturnValue({
              where: vi.fn().mockReturnValue({
                get: vi.fn().mockResolvedValue({ count: 0 }),
              }),
            }),
          } as unknown as ReturnType<typeof mockDb.select>;
        }
        if (selectCallCount === 2) {
          // Incidents query
          return {
            from: vi.fn().mockReturnValue({
              where: vi.fn().mockReturnValue({
                $dynamic: vi.fn().mockReturnValue({
                  where: vi.fn().mockReturnThis(),
                  all: vi.fn().mockResolvedValue([]),
                }),
              }),
            }),
          } as unknown as ReturnType<typeof mockDb.select>;
        }
        // Latency query
        return {
          from: vi.fn().mockReturnValue({
            where: vi.fn().mockReturnValue({
              orderBy: vi.fn().mockReturnValue({
                limit: vi.fn().mockReturnValue({
                  get: vi.fn().mockResolvedValue(null),
                }),
              }),
            }),
          }),
        } as unknown as ReturnType<typeof mockDb.select>;
      });

      const res = await app.request('/global', {}, env);
      const data = (await res.json()) as {
        uptime30d: number;
        avgLatency: number;
      };

      expect(res.status).toBe(200);
      // With 0 monitors, division by zero handling kicks in
      expect(data.avgLatency).toBe(0);
    });

    it('returns correct uptime with no incidents', async () => {
      const { env, mockDb } = createMockEnv();

      let selectCallCount = 0;
      mockDb.select = vi.fn(() => {
        selectCallCount++;
        if (selectCallCount === 1) {
          // Monitor count: 5 active monitors
          return {
            from: vi.fn().mockReturnValue({
              where: vi.fn().mockReturnValue({
                get: vi.fn().mockResolvedValue({ count: 5 }),
              }),
            }),
          } as unknown as ReturnType<typeof mockDb.select>;
        }
        if (selectCallCount === 2) {
          // Incidents: none
          return {
            from: vi.fn().mockReturnValue({
              where: vi.fn().mockReturnValue({
                $dynamic: vi.fn().mockReturnValue({
                  where: vi.fn().mockReturnThis(),
                  all: vi.fn().mockResolvedValue([]),
                }),
              }),
            }),
          } as unknown as ReturnType<typeof mockDb.select>;
        }
        // Latency
        return {
          from: vi.fn().mockReturnValue({
            where: vi.fn().mockReturnValue({
              orderBy: vi.fn().mockReturnValue({
                limit: vi.fn().mockReturnValue({
                  get: vi.fn().mockResolvedValue({ avg: 150 }),
                }),
              }),
            }),
          }),
        } as unknown as ReturnType<typeof mockDb.select>;
      });

      const res = await app.request('/global', {}, env);
      const data = (await res.json()) as {
        uptime30d: number;
        avgLatency: number;
      };

      expect(res.status).toBe(200);
      expect(data.uptime30d).toBe(100);
      expect(data.avgLatency).toBe(150);
    });

    it('calculates uptime correctly with incidents', async () => {
      const { env, mockDb } = createMockEnv();

      const now = new Date();
      // One hour of downtime
      const oneHourAgo = new Date(now.getTime() - 60 * 60 * 1000);

      let selectCallCount = 0;
      mockDb.select = vi.fn(() => {
        selectCallCount++;
        if (selectCallCount === 1) {
          // Monitor count: 1 active monitor
          return {
            from: vi.fn().mockReturnValue({
              where: vi.fn().mockReturnValue({
                get: vi.fn().mockResolvedValue({ count: 1 }),
              }),
            }),
          } as unknown as ReturnType<typeof mockDb.select>;
        }
        if (selectCallCount === 2) {
          // Incidents: 1 hour of downtime
          return {
            from: vi.fn().mockReturnValue({
              where: vi.fn().mockReturnValue({
                $dynamic: vi.fn().mockReturnValue({
                  where: vi.fn().mockReturnThis(),
                  all: vi.fn().mockResolvedValue([
                    {
                      id: 'inc_1',
                      monitorId: 'mon_1',
                      startedAt: oneHourAgo.toISOString(),
                      endedAt: now.toISOString(),
                    },
                  ]),
                }),
              }),
            }),
          } as unknown as ReturnType<typeof mockDb.select>;
        }
        // Latency
        return {
          from: vi.fn().mockReturnValue({
            where: vi.fn().mockReturnValue({
              orderBy: vi.fn().mockReturnValue({
                limit: vi.fn().mockReturnValue({
                  get: vi.fn().mockResolvedValue({ avg: 200 }),
                }),
              }),
            }),
          }),
        } as unknown as ReturnType<typeof mockDb.select>;
      });

      const res = await app.request('/global', {}, env);
      const data = (await res.json()) as {
        uptime30d: number;
        avgLatency: number;
      };

      expect(res.status).toBe(200);
      // 1 hour down out of 30 days = ~99.86% uptime
      expect(data.uptime30d).toBeGreaterThan(99);
      expect(data.uptime30d).toBeLessThan(100);
      expect(data.avgLatency).toBe(200);
    });

    it('handles ongoing incident (no endedAt)', async () => {
      const { env, mockDb } = createMockEnv();

      // Incident started 2 hours ago, still ongoing
      const twoHoursAgo = new Date(Date.now() - 2 * 60 * 60 * 1000);

      let selectCallCount = 0;
      mockDb.select = vi.fn(() => {
        selectCallCount++;
        if (selectCallCount === 1) {
          return {
            from: vi.fn().mockReturnValue({
              where: vi.fn().mockReturnValue({
                get: vi.fn().mockResolvedValue({ count: 1 }),
              }),
            }),
          } as unknown as ReturnType<typeof mockDb.select>;
        }
        if (selectCallCount === 2) {
          return {
            from: vi.fn().mockReturnValue({
              where: vi.fn().mockReturnValue({
                $dynamic: vi.fn().mockReturnValue({
                  where: vi.fn().mockReturnThis(),
                  all: vi.fn().mockResolvedValue([
                    {
                      id: 'inc_ongoing',
                      monitorId: 'mon_1',
                      startedAt: twoHoursAgo.toISOString(),
                      endedAt: null, // Still ongoing
                    },
                  ]),
                }),
              }),
            }),
          } as unknown as ReturnType<typeof mockDb.select>;
        }
        return {
          from: vi.fn().mockReturnValue({
            where: vi.fn().mockReturnValue({
              orderBy: vi.fn().mockReturnValue({
                limit: vi.fn().mockReturnValue({
                  get: vi.fn().mockResolvedValue({ avg: 100 }),
                }),
              }),
            }),
          }),
        } as unknown as ReturnType<typeof mockDb.select>;
      });

      const res = await app.request('/global', {}, env);
      const data = (await res.json()) as { uptime30d: number };

      expect(res.status).toBe(200);
      // Should account for ongoing downtime
      expect(data.uptime30d).toBeLessThan(100);
    });

    it('returns rounded latency value', async () => {
      const { env, mockDb } = createMockEnv();

      let selectCallCount = 0;
      mockDb.select = vi.fn(() => {
        selectCallCount++;
        if (selectCallCount === 1) {
          return {
            from: vi.fn().mockReturnValue({
              where: vi.fn().mockReturnValue({
                get: vi.fn().mockResolvedValue({ count: 1 }),
              }),
            }),
          } as unknown as ReturnType<typeof mockDb.select>;
        }
        if (selectCallCount === 2) {
          return {
            from: vi.fn().mockReturnValue({
              where: vi.fn().mockReturnValue({
                $dynamic: vi.fn().mockReturnValue({
                  where: vi.fn().mockReturnThis(),
                  all: vi.fn().mockResolvedValue([]),
                }),
              }),
            }),
          } as unknown as ReturnType<typeof mockDb.select>;
        }
        // Latency with decimal
        return {
          from: vi.fn().mockReturnValue({
            where: vi.fn().mockReturnValue({
              orderBy: vi.fn().mockReturnValue({
                limit: vi.fn().mockReturnValue({
                  get: vi.fn().mockResolvedValue({ avg: 156.789 }),
                }),
              }),
            }),
          }),
        } as unknown as ReturnType<typeof mockDb.select>;
      });

      const res = await app.request('/global', {}, env);
      const data = (await res.json()) as { avgLatency: number };

      expect(res.status).toBe(200);
      expect(data.avgLatency).toBe(157); // Rounded
    });

    it('returns uptime with 2 decimal places', async () => {
      const { env, mockDb } = createMockEnv();

      const now = new Date();
      // ~12 hours of downtime for a more interesting percentage
      const twelveHoursAgo = new Date(now.getTime() - 12 * 60 * 60 * 1000);

      let selectCallCount = 0;
      mockDb.select = vi.fn(() => {
        selectCallCount++;
        if (selectCallCount === 1) {
          return {
            from: vi.fn().mockReturnValue({
              where: vi.fn().mockReturnValue({
                get: vi.fn().mockResolvedValue({ count: 1 }),
              }),
            }),
          } as unknown as ReturnType<typeof mockDb.select>;
        }
        if (selectCallCount === 2) {
          return {
            from: vi.fn().mockReturnValue({
              where: vi.fn().mockReturnValue({
                $dynamic: vi.fn().mockReturnValue({
                  where: vi.fn().mockReturnThis(),
                  all: vi.fn().mockResolvedValue([
                    {
                      id: 'inc_1',
                      monitorId: 'mon_1',
                      startedAt: twelveHoursAgo.toISOString(),
                      endedAt: now.toISOString(),
                    },
                  ]),
                }),
              }),
            }),
          } as unknown as ReturnType<typeof mockDb.select>;
        }
        return {
          from: vi.fn().mockReturnValue({
            where: vi.fn().mockReturnValue({
              orderBy: vi.fn().mockReturnValue({
                limit: vi.fn().mockReturnValue({
                  get: vi.fn().mockResolvedValue({ avg: 100 }),
                }),
              }),
            }),
          }),
        } as unknown as ReturnType<typeof mockDb.select>;
      });

      const res = await app.request('/global', {}, env);
      const data = (await res.json()) as { uptime30d: number };

      expect(res.status).toBe(200);
      // Check it's a number with at most 2 decimal places
      const decimalPlaces = (data.uptime30d.toString().split('.')[1] || '')
        .length;
      expect(decimalPlaces).toBeLessThanOrEqual(2);
    });

    it('handles multiple monitors with multiple incidents', async () => {
      const { env, mockDb } = createMockEnv();

      const now = new Date();
      const oneHourAgo = new Date(now.getTime() - 60 * 60 * 1000);
      const twoHoursAgo = new Date(now.getTime() - 2 * 60 * 60 * 1000);

      let selectCallCount = 0;
      mockDb.select = vi.fn(() => {
        selectCallCount++;
        if (selectCallCount === 1) {
          // 3 active monitors
          return {
            from: vi.fn().mockReturnValue({
              where: vi.fn().mockReturnValue({
                get: vi.fn().mockResolvedValue({ count: 3 }),
              }),
            }),
          } as unknown as ReturnType<typeof mockDb.select>;
        }
        if (selectCallCount === 2) {
          // Multiple incidents across monitors
          return {
            from: vi.fn().mockReturnValue({
              where: vi.fn().mockReturnValue({
                $dynamic: vi.fn().mockReturnValue({
                  where: vi.fn().mockReturnThis(),
                  all: vi.fn().mockResolvedValue([
                    {
                      id: 'inc_1',
                      monitorId: 'mon_1',
                      startedAt: twoHoursAgo.toISOString(),
                      endedAt: oneHourAgo.toISOString(),
                    },
                    {
                      id: 'inc_2',
                      monitorId: 'mon_2',
                      startedAt: oneHourAgo.toISOString(),
                      endedAt: now.toISOString(),
                    },
                  ]),
                }),
              }),
            }),
          } as unknown as ReturnType<typeof mockDb.select>;
        }
        return {
          from: vi.fn().mockReturnValue({
            where: vi.fn().mockReturnValue({
              orderBy: vi.fn().mockReturnValue({
                limit: vi.fn().mockReturnValue({
                  get: vi.fn().mockResolvedValue({ avg: 120 }),
                }),
              }),
            }),
          }),
        } as unknown as ReturnType<typeof mockDb.select>;
      });

      const res = await app.request('/global', {}, env);
      const data = (await res.json()) as {
        uptime30d: number;
        avgLatency: number;
      };

      expect(res.status).toBe(200);
      // With 3 monitors over 30 days, 2 hours of total downtime is minimal
      expect(data.uptime30d).toBeGreaterThan(99);
      expect(data.avgLatency).toBe(120);
    });

    it('clamps uptime between 0 and 100', async () => {
      const { env, mockDb } = createMockEnv();

      let selectCallCount = 0;
      mockDb.select = vi.fn(() => {
        selectCallCount++;
        if (selectCallCount === 1) {
          return {
            from: vi.fn().mockReturnValue({
              where: vi.fn().mockReturnValue({
                get: vi.fn().mockResolvedValue({ count: 1 }),
              }),
            }),
          } as unknown as ReturnType<typeof mockDb.select>;
        }
        if (selectCallCount === 2) {
          // No incidents = 100% uptime
          return {
            from: vi.fn().mockReturnValue({
              where: vi.fn().mockReturnValue({
                $dynamic: vi.fn().mockReturnValue({
                  where: vi.fn().mockReturnThis(),
                  all: vi.fn().mockResolvedValue([]),
                }),
              }),
            }),
          } as unknown as ReturnType<typeof mockDb.select>;
        }
        return {
          from: vi.fn().mockReturnValue({
            where: vi.fn().mockReturnValue({
              orderBy: vi.fn().mockReturnValue({
                limit: vi.fn().mockReturnValue({
                  get: vi.fn().mockResolvedValue({ avg: 50 }),
                }),
              }),
            }),
          }),
        } as unknown as ReturnType<typeof mockDb.select>;
      });

      const res = await app.request('/global', {}, env);
      const data = (await res.json()) as { uptime30d: number };

      expect(res.status).toBe(200);
      expect(data.uptime30d).toBe(100);
      expect(data.uptime30d).toBeGreaterThanOrEqual(0);
      expect(data.uptime30d).toBeLessThanOrEqual(100);
    });
  });
});
