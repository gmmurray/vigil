import { DurableObject } from 'cloudflare:workers';
import { and, desc, eq, isNull } from 'drizzle-orm';
import { ulid } from 'ulid';
import { createDb } from './db';
import {
  calculateNextState,
  isStatusCodeValid,
  parseExpectedStatusCodes,
  shouldNotify,
} from './lib/state-machine';
import { deliverWebhookWithRetry } from './lib/webhook';
import {
  checkResults,
  incidents,
  monitors,
  notificationChannels,
  notificationLogs,
} from './schema';
import type {
  CheckResult,
  MonitorBroadcast,
  MonitorConfig,
  MonitorStatus,
} from './types';

export class MonitorObject extends DurableObject {
  private config: MonitorConfig | null = null;
  private sessions: WebSocket[] = [];

  private consecutiveFailures = 0;
  private consecutiveSuccesses = 0;
  private readonly THRESHOLD = 3;

  private readonly WEBHOOK_TIMEOUT_MS = 5000;
  private readonly MAX_RETRIES = 3;

  async fetch(request: Request): Promise<Response> {
    const url = new URL(request.url);

    if (request.headers.get('Upgrade') === 'websocket') {
      await this.ensureConfig();
      const pair = new WebSocketPair();
      const [client, server] = Object.values(pair);

      this.handleConnection(server);

      return new Response(null, { status: 101, webSocket: client });
    }

    if (url.pathname === '/init' && request.method === 'POST') {
      const { monitorId } = (await request.json()) as { monitorId: string };
      await this.ctx.storage.put('monitorId', monitorId);
      await this.refreshConfig(monitorId);
      await this.scheduleAlarm();
      return new Response('Monitor initialized');
    }

    if (url.pathname === '/check' && request.method === 'POST') {
      await this.ensureConfig();
      if (!this.config) {
        return new Response('Monitor not initialized', { status: 400 });
      }
      const force = url.searchParams.get('force') === 'true';

      if (force) {
        // Full lifecycle: check endpoint, record result, update state
        await this.loadCounters();
        const result = await this.performCheckLifecycle();
        return new Response(JSON.stringify(result), {
          headers: { 'Content-Type': 'application/json' },
        });
      } else {
        // Probe-only: check endpoint without persisting
        const result = await this.check();
        return new Response(JSON.stringify(result), {
          headers: { 'Content-Type': 'application/json' },
        });
      }
    }

    if (url.pathname === '/delete' && request.method === 'POST') {
      await this.ctx.storage.deleteAlarm();
      await this.ctx.storage.deleteAll();
      return new Response('Monitor deleted');
    }

    if (url.pathname === '/stop' && request.method === 'POST') {
      await this.ctx.storage.deleteAlarm();
      return new Response('Monitor stopped');
    }

    return new Response('Vigil Monitor DO', { status: 404 });
  }

  handleConnection(webSocket: WebSocket) {
    webSocket.accept();
    this.sessions.push(webSocket);

    webSocket.send(
      JSON.stringify({
        type: 'STATUS_UPDATE',
        payload: {
          monitorStatus: this.config?.status ?? 'DOWN',
        },
      }),
    );

    webSocket.addEventListener('close', () => {
      this.sessions = this.sessions.filter(s => s !== webSocket);
    });
  }

  broadcast(message: MonitorBroadcast) {
    const payload = JSON.stringify(message);
    this.sessions = this.sessions.filter(session => {
      try {
        session.send(payload);
        return true;
      } catch {
        // If send fails, assume client disconnected
        return false;
      }
    });
  }

  async alarm() {
    try {
      if (!this.config) {
        const monitorId = await this.ctx.storage.get<string>('monitorId');
        if (monitorId) await this.refreshConfig(monitorId);
        else return;
      }

      if (this.config?.enabled) {
        await this.loadCounters();
        await this.performCheckLifecycle();
      }
    } catch (err) {
      console.error('Alarm failed:', err);
    } finally {
      await this.scheduleAlarm();
    }
  }

  async loadCounters() {
    this.consecutiveFailures =
      (await this.ctx.storage.get<number>('consecutiveFailures')) ?? 0;
    this.consecutiveSuccesses =
      (await this.ctx.storage.get<number>('consecutiveSuccesses')) ?? 0;
  }

  async saveCounters() {
    await this.ctx.storage.put('consecutiveFailures', this.consecutiveFailures);
    await this.ctx.storage.put(
      'consecutiveSuccesses',
      this.consecutiveSuccesses,
    );
  }

  async performCheckLifecycle(): Promise<CheckResult> {
    const result = await this.check();

    const prevStatus = this.config?.status || 'DOWN';
    const newStatus = this.calculateState(result);

    this.broadcast({
      type: 'CHECK_COMPLETED',
      payload: {
        check: result,
        monitorStatus: newStatus,
      },
    });

    this.ctx.waitUntil(this.handleSideEffects(result, newStatus, prevStatus));

    return result;
  }

  calculateState(result: CheckResult): MonitorStatus {
    if (!this.config) return 'DOWN';

    const { newStatus, counters } = calculateNextState(
      this.config.status,
      result.status === 'UP',
      {
        consecutiveFailures: this.consecutiveFailures,
        consecutiveSuccesses: this.consecutiveSuccesses,
      },
      this.THRESHOLD,
    );

    this.consecutiveFailures = counters.consecutiveFailures;
    this.consecutiveSuccesses = counters.consecutiveSuccesses;
    this.config.status = newStatus;

    return newStatus;
  }

  async handleSideEffects(
    result: CheckResult,
    newStatus: MonitorStatus,
    prevStatus: MonitorStatus,
  ) {
    const db = createDb(this.env.DB);
    const tasks: Promise<unknown>[] = [];

    tasks.push(
      db.insert(checkResults).values({
        id: result.id,
        monitorId: result.monitorId,
        status: result.status,
        responseTimeMs: result.responseTimeMs,
        statusCode: result.statusCode,
        error: result.error,
        checkedAt: result.checkedAt,
      }),
    );

    tasks.push(this.saveCounters());

    if (newStatus !== prevStatus) {
      tasks.push(
        db
          .update(monitors)
          .set({ status: newStatus, updatedAt: new Date().toISOString() })
          .where(eq(monitors.id, this.config!.id)),
      );

      tasks.push(
        (async () => {
          let incidentId: string | null = null;

          if (newStatus === 'DOWN') {
            incidentId = ulid();
            await db.insert(incidents).values({
              id: incidentId,
              monitorId: this.config!.id,
              startedAt: new Date().toISOString(),
              cause: result.error || `Status Code: ${result.statusCode}`,
            });
          } else if (
            newStatus === 'UP' &&
            (prevStatus === 'DOWN' || prevStatus === 'RECOVERING')
          ) {
            const openIncident = await db
              .select()
              .from(incidents)
              .where(
                and(
                  eq(incidents.monitorId, this.config!.id),
                  isNull(incidents.endedAt),
                ),
              )
              .orderBy(desc(incidents.startedAt))
              .limit(1)
              .get();

            if (openIncident) {
              incidentId = openIncident.id;
              await db
                .update(incidents)
                .set({ endedAt: new Date().toISOString() })
                .where(eq(incidents.id, incidentId));
            }
          }

          if (shouldNotify(prevStatus, newStatus)) {
            await this.notify(newStatus, incidentId, result, db);
          }
        })(),
      );
    }

    await Promise.allSettled(tasks);
  }

  async notify(
    event: MonitorStatus,
    incidentId: string | null,
    result: CheckResult,
    db: ReturnType<typeof createDb>,
  ) {
    const channels = await db
      .select()
      .from(notificationChannels)
      .where(eq(notificationChannels.enabled, 1))
      .all();

    if (channels.length === 0) return;

    const payload = {
      monitor: {
        id: this.config?.id,
        name: this.config?.name,
        url: this.config?.url,
      },
      event: event,
      incident_id: incidentId,
      timestamp: new Date().toISOString(),
      details: {
        status_code: result.statusCode,
        error: result.error,
        response_time: result.responseTimeMs,
      },
    };

    await Promise.allSettled(
      channels.map(channel =>
        this.deliverWebhook(channel, payload, db, result.monitorId),
      ),
    );
  }

  private async deliverWebhook(
    channel: { id: string; type: string; config: unknown },
    payload: object,
    db: ReturnType<typeof createDb>,
    monitorId: string,
  ) {
    const config = channel.config as { url?: string };
    if (channel.type !== 'WEBHOOK' || !config.url) return;

    const result = await deliverWebhookWithRetry(
      {
        url: config.url,
        timeoutMs: this.WEBHOOK_TIMEOUT_MS,
        maxRetries: this.MAX_RETRIES,
      },
      payload,
    );

    await this.logNotification(
      db,
      channel.id,
      monitorId,
      (payload as { event: string }).event,
      result.success,
      result.error,
    );
  }

  private async logNotification(
    db: ReturnType<typeof createDb>,
    channelId: string,
    monitorId: string,
    event: string,
    success: boolean,
    error: string | null,
  ) {
    try {
      await db.insert(notificationLogs).values({
        id: ulid(),
        channelId,
        monitorId,
        event,
        success: success ? 1 : 0,
        error,
        createdAt: new Date().toISOString(),
      });
    } catch (err) {
      console.error('Failed to log notification:', err);
    }
  }

  async refreshConfig(monitorId: string) {
    const db = createDb(this.env.DB);
    const result = await db
      .select()
      .from(monitors)
      .where(eq(monitors.id, monitorId))
      .get();

    if (result) {
      this.config = {
        ...result,
        headers: result.headers as Record<string, string> | null,
        status: result.status as MonitorStatus,
      };
    } else {
      this.config = null;
    }
  }

  async scheduleAlarm() {
    if (this.config?.enabled) {
      const nextTime = Date.now() + this.config.intervalSeconds * 1000;
      await this.ctx.storage.setAlarm(nextTime);
    }
  }

  async check(): Promise<CheckResult> {
    if (!this.config) throw new Error('Config missing');

    const start = Date.now();
    let status: 'UP' | 'DOWN' = 'DOWN';
    let statusCode: number | null = null;
    let error: string | null = null;

    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(
        () => controller.abort(),
        this.config.timeoutMs,
      );

      const resp = await fetch(this.config.url, {
        method: this.config.method,
        headers: this.config.headers || undefined,
        body: this.config.body || undefined,
        signal: controller.signal,
      });

      clearTimeout(timeoutId);
      statusCode = resp.status;

      const validCodes = parseExpectedStatusCodes(this.config.expectedStatus);

      if (isStatusCodeValid(statusCode, validCodes)) {
        status = 'UP';
      } else {
        error = `Unexpected status code: ${statusCode}`;
      }
    } catch (e: unknown) {
      if (e instanceof Error) {
        error = e.name === 'AbortError' ? 'Timeout' : e.message;
      } else {
        error = 'Network Error';
      }
    }

    const responseTimeMs = Date.now() - start;

    return {
      monitorId: this.config.id,
      status,
      responseTimeMs,
      statusCode,
      error,
      checkedAt: new Date().toISOString(),
      id: ulid(),
    };
  }

  private async ensureConfig() {
    if (this.config) return;

    const monitorId = await this.ctx.storage.get<string>('monitorId');
    if (!monitorId) return;

    await this.refreshConfig(monitorId);

    if (!this.config) {
      console.warn(`Monitor ${monitorId} missing from DB`);
    }
  }
}
