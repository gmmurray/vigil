import { beforeEach, describe, expect, it, type Mock, vi } from 'vitest';

import { createDb } from '../db';
import { deliverWebhookWithRetry } from '../lib/webhook';
import app from './channels';

// Mock the createDb module
vi.mock('../db', () => ({
  createDb: vi.fn(),
}));

// Mock webhook delivery
vi.mock('../lib/webhook', () => ({
  deliverWebhookWithRetry: vi.fn(),
}));

// Mock ulid to return predictable IDs
vi.mock('ulid', () => ({
  ulid: vi.fn(() => 'TEST_CHANNEL_123'),
}));

// Type for the mock query chain
interface MockQueryChain {
  from: Mock;
  where: Mock;
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

// Sample channel data
const sampleChannel = {
  id: 'ch_123',
  type: 'WEBHOOK',
  config: { url: 'https://hooks.example.com/webhook' },
  enabled: 1,
  createdAt: '2024-01-01T00:00:00.000Z',
};

// Helper to create a select chain that returns data
function createSelectChain(data: { all?: unknown[]; get?: unknown }) {
  return {
    from: vi.fn().mockReturnValue({
      where: vi.fn().mockReturnValue({
        all: vi.fn().mockResolvedValue(data.all ?? []),
        get: vi.fn().mockResolvedValue(data.get ?? null),
      }),
      all: vi.fn().mockResolvedValue(data.all ?? []),
      get: vi.fn().mockResolvedValue(data.get ?? null),
    }),
  };
}

describe('channels routes', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('GET /', () => {
    it('returns empty array when no channels exist', async () => {
      const { env } = createMockEnv();

      const res = await app.request('/', {}, env);
      const data = (await res.json()) as unknown[];

      expect(res.status).toBe(200);
      expect(data).toEqual([]);
    });

    it('returns all channels', async () => {
      const { env, mockDb } = createMockEnv();

      mockDb.select = vi
        .fn()
        .mockReturnValue(createSelectChain({ all: [sampleChannel] }));

      const res = await app.request('/', {}, env);
      const data = (await res.json()) as Array<{ id: string; type: string }>;

      expect(res.status).toBe(200);
      expect(data).toHaveLength(1);
      expect(data[0].id).toBe('ch_123');
      expect(data[0].type).toBe('WEBHOOK');
    });

    it('returns multiple channels', async () => {
      const { env, mockDb } = createMockEnv();

      const channels = [
        sampleChannel,
        { ...sampleChannel, id: 'ch_456', type: 'SLACK' },
      ];

      mockDb.select = vi
        .fn()
        .mockReturnValue(createSelectChain({ all: channels }));

      const res = await app.request('/', {}, env);
      const data = (await res.json()) as unknown[];

      expect(res.status).toBe(200);
      expect(data).toHaveLength(2);
    });
  });

  describe('GET /:id', () => {
    it('returns channel when found', async () => {
      const { env, mockDb } = createMockEnv();

      mockDb.select = vi
        .fn()
        .mockReturnValue(createSelectChain({ get: sampleChannel }));

      const res = await app.request('/ch_123', {}, env);
      const data = (await res.json()) as {
        id: string;
        type: string;
        config: unknown;
      };

      expect(res.status).toBe(200);
      expect(data.id).toBe('ch_123');
      expect(data.type).toBe('WEBHOOK');
      expect(data.config).toEqual({ url: 'https://hooks.example.com/webhook' });
    });

    it('returns 404 when channel not found', async () => {
      const { env, mockDb } = createMockEnv();

      mockDb.select = vi.fn().mockReturnValue(createSelectChain({ get: null }));

      const res = await app.request('/nonexistent', {}, env);

      expect(res.status).toBe(404);
      const data = (await res.json()) as { error: string };
      expect(data.error).toBe('Channel not found');
    });
  });

  describe('POST /', () => {
    it('creates a new channel with required fields', async () => {
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
            type: 'WEBHOOK',
            config: { url: 'https://hooks.slack.com/services/xxx' },
          }),
        },
        env,
      );

      const data = (await res.json()) as {
        id: string;
        type: string;
        config: { url: string };
        enabled: number;
      };

      expect(res.status).toBe(201);
      expect(data.id).toBe('TEST_CHANNEL_123');
      expect(data.type).toBe('WEBHOOK');
      expect(data.config).toEqual({
        url: 'https://hooks.slack.com/services/xxx',
      });
      expect(data.enabled).toBe(1); // default
    });

    it('creates channel with enabled=0', async () => {
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
            type: 'WEBHOOK',
            config: { url: 'https://example.com/hook' },
            enabled: 0,
          }),
        },
        env,
      );

      const data = (await res.json()) as { enabled: number };

      expect(res.status).toBe(201);
      expect(data.enabled).toBe(0);
    });

    it('returns 400 when type is missing', async () => {
      const { env } = createMockEnv();

      const res = await app.request(
        '/',
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            config: { url: 'https://example.com' },
          }),
        },
        env,
      );

      expect(res.status).toBe(400);
      const data = (await res.json()) as { error: string };
      expect(data.error).toBe('Type and Config are required');
    });

    it('returns 400 when config is missing', async () => {
      const { env } = createMockEnv();

      const res = await app.request(
        '/',
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            type: 'WEBHOOK',
          }),
        },
        env,
      );

      expect(res.status).toBe(400);
      const data = (await res.json()) as { error: string };
      expect(data.error).toBe('Type and Config are required');
    });

    it('returns 400 when both type and config are missing', async () => {
      const { env } = createMockEnv();

      const res = await app.request(
        '/',
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({}),
        },
        env,
      );

      expect(res.status).toBe(400);
      const data = (await res.json()) as { error: string };
      expect(data.error).toBe('Type and Config are required');
    });
  });

  describe('PUT /:id', () => {
    it('updates channel type', async () => {
      const { env, mockDb } = createMockEnv();

      mockDb.select = vi
        .fn()
        .mockReturnValue(createSelectChain({ get: sampleChannel }));

      mockDb.update = vi.fn().mockReturnValue({
        set: vi.fn().mockReturnValue({
          where: vi.fn().mockReturnValue({
            run: vi.fn().mockResolvedValue(undefined),
          }),
        }),
      });

      const res = await app.request(
        '/ch_123',
        {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ type: 'SLACK' }),
        },
        env,
      );

      const data = (await res.json()) as { success: boolean; type: string };

      expect(res.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.type).toBe('SLACK');
    });

    it('updates channel config', async () => {
      const { env, mockDb } = createMockEnv();

      mockDb.select = vi
        .fn()
        .mockReturnValue(createSelectChain({ get: sampleChannel }));

      mockDb.update = vi.fn().mockReturnValue({
        set: vi.fn().mockReturnValue({
          where: vi.fn().mockReturnValue({
            run: vi.fn().mockResolvedValue(undefined),
          }),
        }),
      });

      const newConfig = { url: 'https://new-webhook.example.com' };

      const res = await app.request(
        '/ch_123',
        {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ config: newConfig }),
        },
        env,
      );

      const data = (await res.json()) as { success: boolean; config: unknown };

      expect(res.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.config).toEqual(newConfig);
    });

    it('updates channel enabled status', async () => {
      const { env, mockDb } = createMockEnv();

      mockDb.select = vi
        .fn()
        .mockReturnValue(createSelectChain({ get: sampleChannel }));

      mockDb.update = vi.fn().mockReturnValue({
        set: vi.fn().mockReturnValue({
          where: vi.fn().mockReturnValue({
            run: vi.fn().mockResolvedValue(undefined),
          }),
        }),
      });

      const res = await app.request(
        '/ch_123',
        {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ enabled: 0 }),
        },
        env,
      );

      const data = (await res.json()) as { success: boolean; enabled: number };

      expect(res.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.enabled).toBe(0);
    });

    it('updates multiple fields at once', async () => {
      const { env, mockDb } = createMockEnv();

      mockDb.select = vi
        .fn()
        .mockReturnValue(createSelectChain({ get: sampleChannel }));

      const setMock = vi.fn().mockReturnValue({
        where: vi.fn().mockReturnValue({
          run: vi.fn().mockResolvedValue(undefined),
        }),
      });

      mockDb.update = vi.fn().mockReturnValue({ set: setMock });

      const res = await app.request(
        '/ch_123',
        {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            type: 'DISCORD',
            config: { webhookUrl: 'https://discord.com/api/webhooks/xxx' },
            enabled: 0,
          }),
        },
        env,
      );

      const data = (await res.json()) as {
        success: boolean;
        type: string;
        config: unknown;
        enabled: number;
      };

      expect(res.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.type).toBe('DISCORD');
      expect(data.config).toEqual({
        webhookUrl: 'https://discord.com/api/webhooks/xxx',
      });
      expect(data.enabled).toBe(0);
    });

    it('returns 404 when channel not found', async () => {
      const { env, mockDb } = createMockEnv();

      mockDb.select = vi.fn().mockReturnValue(createSelectChain({ get: null }));

      const res = await app.request(
        '/nonexistent',
        {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ type: 'SLACK' }),
        },
        env,
      );

      expect(res.status).toBe(404);
      const data = (await res.json()) as { error: string };
      expect(data.error).toBe('Channel not found');
    });

    it('succeeds with empty update (no fields to update)', async () => {
      const { env, mockDb } = createMockEnv();

      mockDb.select = vi
        .fn()
        .mockReturnValue(createSelectChain({ get: sampleChannel }));

      const res = await app.request(
        '/ch_123',
        {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({}),
        },
        env,
      );

      const data = (await res.json()) as { success: boolean };

      expect(res.status).toBe(200);
      expect(data.success).toBe(true);
      // update should not be called when no fields provided
      expect(mockDb.update).not.toHaveBeenCalled();
    });
  });

  describe('POST /:id/test', () => {
    it('sends test notification successfully', async () => {
      const { env, mockDb } = createMockEnv();

      mockDb.select = vi
        .fn()
        .mockReturnValue(createSelectChain({ get: sampleChannel }));

      vi.mocked(deliverWebhookWithRetry).mockResolvedValue({
        success: true,
        error: null,
        attempts: 1,
      });

      const res = await app.request('/ch_123/test', { method: 'POST' }, env);
      const data = (await res.json()) as { success: boolean; error: null };

      expect(res.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.error).toBeNull();

      expect(deliverWebhookWithRetry).toHaveBeenCalledWith(
        {
          url: 'https://hooks.example.com/webhook',
          timeoutMs: 10000,
          maxRetries: 1,
        },
        expect.objectContaining({
          test: true,
          event: 'TEST',
          message: expect.stringContaining('test notification'),
        }),
      );
    });

    it('returns failure when webhook delivery fails', async () => {
      const { env, mockDb } = createMockEnv();

      mockDb.select = vi
        .fn()
        .mockReturnValue(createSelectChain({ get: sampleChannel }));

      vi.mocked(deliverWebhookWithRetry).mockResolvedValue({
        success: false,
        error: 'HTTP 500',
        attempts: 1,
      });

      const res = await app.request('/ch_123/test', { method: 'POST' }, env);
      const data = (await res.json()) as { success: boolean; error: string };

      expect(res.status).toBe(200);
      expect(data.success).toBe(false);
      expect(data.error).toBe('HTTP 500');
    });

    it('returns 404 when channel not found', async () => {
      const { env, mockDb } = createMockEnv();

      mockDb.select = vi.fn().mockReturnValue(createSelectChain({ get: null }));

      const res = await app.request(
        '/nonexistent/test',
        { method: 'POST' },
        env,
      );

      expect(res.status).toBe(404);
      const data = (await res.json()) as { error: string };
      expect(data.error).toBe('Channel not found');
    });

    it('returns 400 when channel has no URL configured', async () => {
      const { env, mockDb } = createMockEnv();

      const channelNoUrl = { ...sampleChannel, config: {} };
      mockDb.select = vi
        .fn()
        .mockReturnValue(createSelectChain({ get: channelNoUrl }));

      const res = await app.request('/ch_123/test', { method: 'POST' }, env);

      expect(res.status).toBe(400);
      const data = (await res.json()) as { error: string };
      expect(data.error).toBe('Channel has no webhook URL configured');
    });
  });

  describe('DELETE /:id', () => {
    it('deletes channel successfully', async () => {
      const { env, mockDb } = createMockEnv();

      mockDb.delete = vi.fn().mockReturnValue({
        where: vi.fn().mockReturnValue({
          run: vi.fn().mockResolvedValue({ meta: { changes: 1 } }),
        }),
      });

      const res = await app.request('/ch_123', { method: 'DELETE' }, env);

      const data = (await res.json()) as { success: boolean };

      expect(res.status).toBe(200);
      expect(data.success).toBe(true);
    });

    it('returns 404 when channel not found', async () => {
      const { env, mockDb } = createMockEnv();

      mockDb.delete = vi.fn().mockReturnValue({
        where: vi.fn().mockReturnValue({
          run: vi.fn().mockResolvedValue({ meta: { changes: 0 } }),
        }),
      });

      const res = await app.request('/nonexistent', { method: 'DELETE' }, env);

      expect(res.status).toBe(404);
      const data = (await res.json()) as { error: string };
      expect(data.error).toBe('Channel not found');
    });
  });
});
