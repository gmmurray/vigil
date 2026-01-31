import { beforeEach, describe, expect, it, type Mock, vi } from 'vitest';

import { createDb } from '../db';
import app from './notifications';

// Mock the createDb module
vi.mock('../db', () => ({
  createDb: vi.fn(),
}));

// Type for the mock query chain
interface MockQueryChain {
  from: Mock;
  leftJoin: Mock;
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
    leftJoin: vi.fn().mockReturnThis(),
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

// Sample notification log data
const sampleNotification = {
  id: 'notif_123',
  channelId: 'ch_456',
  monitorId: 'mon_789',
  event: 'DOWN',
  success: 1,
  error: null,
  createdAt: '2024-01-01T00:00:00.000Z',
  monitorName: 'API Health Check',
  channelType: 'WEBHOOK',
};

const failedNotification = {
  id: 'notif_456',
  channelId: 'ch_456',
  monitorId: 'mon_789',
  event: 'UP',
  success: 0,
  error: 'Connection refused',
  createdAt: '2024-01-01T01:00:00.000Z',
  monitorName: 'API Health Check',
  channelType: 'WEBHOOK',
};

describe('notifications routes', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('GET /', () => {
    it('returns empty array when no notifications exist', async () => {
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

    it('returns notifications with joined monitor and channel data', async () => {
      const { env, mockDb } = createMockEnv();

      mockDb.select = vi.fn().mockReturnValue({
        from: vi.fn().mockReturnValue({
          leftJoin: vi.fn().mockReturnValue({
            leftJoin: vi.fn().mockReturnValue({
              where: vi.fn().mockReturnValue({
                orderBy: vi.fn().mockReturnValue({
                  limit: vi.fn().mockReturnValue({
                    offset: vi.fn().mockReturnValue({
                      all: vi.fn().mockResolvedValue([sampleNotification]),
                    }),
                  }),
                }),
              }),
            }),
          }),
        }),
      });

      const res = await app.request('/', {}, env);
      const data = (await res.json()) as {
        data: Array<{
          id: string;
          monitorName: string;
          channelType: string;
          event: string;
        }>;
      };

      expect(res.status).toBe(200);
      expect(data.data).toHaveLength(1);
      expect(data.data[0].id).toBe('notif_123');
      expect(data.data[0].monitorName).toBe('API Health Check');
      expect(data.data[0].channelType).toBe('WEBHOOK');
      expect(data.data[0].event).toBe('DOWN');
    });

    it('filters by channelId', async () => {
      const { env, mockDb } = createMockEnv();

      const whereMock = vi.fn().mockReturnValue({
        orderBy: vi.fn().mockReturnValue({
          limit: vi.fn().mockReturnValue({
            offset: vi.fn().mockReturnValue({
              all: vi.fn().mockResolvedValue([sampleNotification]),
            }),
          }),
        }),
      });

      mockDb.select = vi.fn().mockReturnValue({
        from: vi.fn().mockReturnValue({
          leftJoin: vi.fn().mockReturnValue({
            leftJoin: vi.fn().mockReturnValue({
              where: whereMock,
            }),
          }),
        }),
      });

      const res = await app.request('/?channelId=ch_456', {}, env);
      const data = (await res.json()) as { data: Array<{ channelId: string }> };

      expect(res.status).toBe(200);
      expect(data.data).toHaveLength(1);
      expect(data.data[0].channelId).toBe('ch_456');
      expect(whereMock).toHaveBeenCalled();
    });

    it('filters by monitorId', async () => {
      const { env, mockDb } = createMockEnv();

      const whereMock = vi.fn().mockReturnValue({
        orderBy: vi.fn().mockReturnValue({
          limit: vi.fn().mockReturnValue({
            offset: vi.fn().mockReturnValue({
              all: vi.fn().mockResolvedValue([sampleNotification]),
            }),
          }),
        }),
      });

      mockDb.select = vi.fn().mockReturnValue({
        from: vi.fn().mockReturnValue({
          leftJoin: vi.fn().mockReturnValue({
            leftJoin: vi.fn().mockReturnValue({
              where: whereMock,
            }),
          }),
        }),
      });

      const res = await app.request('/?monitorId=mon_789', {}, env);
      const data = (await res.json()) as { data: Array<{ monitorId: string }> };

      expect(res.status).toBe(200);
      expect(data.data).toHaveLength(1);
      expect(data.data[0].monitorId).toBe('mon_789');
      expect(whereMock).toHaveBeenCalled();
    });

    it('filters by success=true', async () => {
      const { env, mockDb } = createMockEnv();

      const whereMock = vi.fn().mockReturnValue({
        orderBy: vi.fn().mockReturnValue({
          limit: vi.fn().mockReturnValue({
            offset: vi.fn().mockReturnValue({
              all: vi.fn().mockResolvedValue([sampleNotification]),
            }),
          }),
        }),
      });

      mockDb.select = vi.fn().mockReturnValue({
        from: vi.fn().mockReturnValue({
          leftJoin: vi.fn().mockReturnValue({
            leftJoin: vi.fn().mockReturnValue({
              where: whereMock,
            }),
          }),
        }),
      });

      const res = await app.request('/?success=true', {}, env);
      const data = (await res.json()) as { data: Array<{ success: number }> };

      expect(res.status).toBe(200);
      expect(data.data).toHaveLength(1);
      expect(data.data[0].success).toBe(1);
      expect(whereMock).toHaveBeenCalled();
    });

    it('filters by success=false', async () => {
      const { env, mockDb } = createMockEnv();

      const whereMock = vi.fn().mockReturnValue({
        orderBy: vi.fn().mockReturnValue({
          limit: vi.fn().mockReturnValue({
            offset: vi.fn().mockReturnValue({
              all: vi.fn().mockResolvedValue([failedNotification]),
            }),
          }),
        }),
      });

      mockDb.select = vi.fn().mockReturnValue({
        from: vi.fn().mockReturnValue({
          leftJoin: vi.fn().mockReturnValue({
            leftJoin: vi.fn().mockReturnValue({
              where: whereMock,
            }),
          }),
        }),
      });

      const res = await app.request('/?success=false', {}, env);
      const data = (await res.json()) as {
        data: Array<{ success: number; error: string }>;
      };

      expect(res.status).toBe(200);
      expect(data.data).toHaveLength(1);
      expect(data.data[0].success).toBe(0);
      expect(data.data[0].error).toBe('Connection refused');
      expect(whereMock).toHaveBeenCalled();
    });

    it('combines multiple filters', async () => {
      const { env, mockDb } = createMockEnv();

      const whereMock = vi.fn().mockReturnValue({
        orderBy: vi.fn().mockReturnValue({
          limit: vi.fn().mockReturnValue({
            offset: vi.fn().mockReturnValue({
              all: vi.fn().mockResolvedValue([sampleNotification]),
            }),
          }),
        }),
      });

      mockDb.select = vi.fn().mockReturnValue({
        from: vi.fn().mockReturnValue({
          leftJoin: vi.fn().mockReturnValue({
            leftJoin: vi.fn().mockReturnValue({
              where: whereMock,
            }),
          }),
        }),
      });

      const res = await app.request(
        '/?channelId=ch_456&monitorId=mon_789&success=true',
        {},
        env,
      );
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
          leftJoin: vi.fn().mockReturnValue({
            leftJoin: vi.fn().mockReturnValue({
              where: vi.fn().mockReturnValue({
                orderBy: vi.fn().mockReturnValue({
                  limit: limitMock,
                }),
              }),
            }),
          }),
        }),
      });

      const res = await app.request('/?limit=25', {}, env);
      const data = (await res.json()) as { meta: { limit: number } };

      expect(res.status).toBe(200);
      expect(data.meta.limit).toBe(25);
      expect(limitMock).toHaveBeenCalledWith(25);
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
          leftJoin: vi.fn().mockReturnValue({
            leftJoin: vi.fn().mockReturnValue({
              where: vi.fn().mockReturnValue({
                orderBy: vi.fn().mockReturnValue({
                  limit: limitMock,
                }),
              }),
            }),
          }),
        }),
      });

      const res = await app.request('/?limit=1000', {}, env);
      const data = (await res.json()) as { meta: { limit: number } };

      expect(res.status).toBe(200);
      expect(data.meta.limit).toBe(500);
      expect(limitMock).toHaveBeenCalledWith(500);
    });

    it('respects custom offset parameter', async () => {
      const { env, mockDb } = createMockEnv();

      const offsetMock = vi.fn().mockReturnValue({
        all: vi.fn().mockResolvedValue([]),
      });

      mockDb.select = vi.fn().mockReturnValue({
        from: vi.fn().mockReturnValue({
          leftJoin: vi.fn().mockReturnValue({
            leftJoin: vi.fn().mockReturnValue({
              where: vi.fn().mockReturnValue({
                orderBy: vi.fn().mockReturnValue({
                  limit: vi.fn().mockReturnValue({
                    offset: offsetMock,
                  }),
                }),
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
          leftJoin: vi.fn().mockReturnValue({
            leftJoin: vi.fn().mockReturnValue({
              where: vi.fn().mockReturnValue({
                orderBy: vi.fn().mockReturnValue({
                  limit: limitMock,
                }),
              }),
            }),
          }),
        }),
      });

      const res = await app.request('/?limit=25&offset=50', {}, env);
      const data = (await res.json()) as {
        meta: { limit: number; offset: number };
      };

      expect(res.status).toBe(200);
      expect(data.meta.limit).toBe(25);
      expect(data.meta.offset).toBe(50);
    });

    it('returns notifications ordered by createdAt descending', async () => {
      const { env, mockDb } = createMockEnv();

      const olderNotification = {
        ...sampleNotification,
        id: 'notif_old',
        createdAt: '2023-01-01T00:00:00.000Z',
      };
      const newerNotification = {
        ...sampleNotification,
        id: 'notif_new',
        createdAt: '2024-06-01T00:00:00.000Z',
      };

      mockDb.select = vi.fn().mockReturnValue({
        from: vi.fn().mockReturnValue({
          leftJoin: vi.fn().mockReturnValue({
            leftJoin: vi.fn().mockReturnValue({
              where: vi.fn().mockReturnValue({
                orderBy: vi.fn().mockReturnValue({
                  limit: vi.fn().mockReturnValue({
                    offset: vi.fn().mockReturnValue({
                      all: vi
                        .fn()
                        .mockResolvedValue([
                          newerNotification,
                          olderNotification,
                        ]),
                    }),
                  }),
                }),
              }),
            }),
          }),
        }),
      });

      const res = await app.request('/', {}, env);
      const data = (await res.json()) as {
        data: Array<{ id: string; createdAt: string }>;
      };

      expect(res.status).toBe(200);
      expect(data.data).toHaveLength(2);
      expect(data.data[0].id).toBe('notif_new');
      expect(data.data[1].id).toBe('notif_old');
    });

    it('returns multiple notifications with different events', async () => {
      const { env, mockDb } = createMockEnv();

      const downNotification = { ...sampleNotification, event: 'DOWN' };
      const upNotification = {
        ...sampleNotification,
        id: 'notif_up',
        event: 'UP',
      };

      mockDb.select = vi.fn().mockReturnValue({
        from: vi.fn().mockReturnValue({
          leftJoin: vi.fn().mockReturnValue({
            leftJoin: vi.fn().mockReturnValue({
              where: vi.fn().mockReturnValue({
                orderBy: vi.fn().mockReturnValue({
                  limit: vi.fn().mockReturnValue({
                    offset: vi.fn().mockReturnValue({
                      all: vi
                        .fn()
                        .mockResolvedValue([downNotification, upNotification]),
                    }),
                  }),
                }),
              }),
            }),
          }),
        }),
      });

      const res = await app.request('/', {}, env);
      const data = (await res.json()) as { data: Array<{ event: string }> };

      expect(res.status).toBe(200);
      expect(data.data).toHaveLength(2);
      expect(data.data[0].event).toBe('DOWN');
      expect(data.data[1].event).toBe('UP');
    });
  });
});
