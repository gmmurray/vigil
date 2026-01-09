import { DurableObject } from 'cloudflare:workers';
import { eq } from 'drizzle-orm';
import { ulid } from 'ulid';
import { createDb } from './db';
import { checkResults, monitors } from './schema';

interface MonitorConfig {
  id: string;
  url: string;
  method: string;
  intervalSeconds: number;
  timeoutMs: number;
  enabled: number;
  expectedStatus: string;
  headers: Record<string, string> | null;
  body: string | null;
  name: string;
  status: string; // Track current status in config
}

export interface CheckResult {
  monitorId: string;
  status: 'UP' | 'DOWN';
  responseTimeMs: number;
  statusCode: number | null;
  error: string | null;
  checkedAt: string;
}

export class MonitorObject extends DurableObject {
  private config: MonitorConfig | null = null;

  // State Machine Counters
  private consecutiveFailures = 0;
  private consecutiveSuccesses = 0;
  private readonly THRESHOLD = 3;

  constructor(ctx: DurableObjectState, env: CloudflareBindings) {
    super(ctx, env);
  }

  async fetch(request: Request): Promise<Response> {
    const url = new URL(request.url);

    if (url.pathname === '/init' && request.method === 'POST') {
      const { monitorId } = (await request.json()) as { monitorId: string };
      await this.ctx.storage.put('monitorId', monitorId);
      await this.refreshConfig(monitorId);
      await this.scheduleAlarm();
      return new Response('Monitor initialized');
    }

    if (url.pathname === '/check' && request.method === 'POST') {
      const result = await this.check();
      return new Response(JSON.stringify(result), {
        headers: { 'Content-Type': 'application/json' },
      });
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

  async alarm() {
    if (!this.config) {
      const monitorId = await this.ctx.storage.get<string>('monitorId');
      if (monitorId) await this.refreshConfig(monitorId);
      else return;
    }

    if (!this.config || !this.config.enabled) return;

    // 1. Execute Check
    const result = await this.check();

    // 2. Persist Result
    const db = createDb(this.env.DB);
    await db.insert(checkResults).values({
      id: ulid(),
      monitorId: result.monitorId,
      status: result.status,
      responseTimeMs: result.responseTimeMs,
      statusCode: result.statusCode,
      error: result.error,
      checkedAt: result.checkedAt,
    });

    // 3. Update State Machine
    await this.updateState(result, db);

    // 4. Schedule next
    await this.scheduleAlarm();
  }

  async updateState(result: CheckResult, db: ReturnType<typeof createDb>) {
    if (!this.config) return;

    let newStatus = this.config.status;
    const currentStatus = this.config.status;

    if (result.status === 'DOWN') {
      this.consecutiveSuccesses = 0;
      this.consecutiveFailures++;

      if (currentStatus === 'UP' || currentStatus === 'RECOVERING') {
        newStatus = 'DEGRADED';
      } else if (
        currentStatus === 'DEGRADED' &&
        this.consecutiveFailures >= this.THRESHOLD
      ) {
        newStatus = 'DOWN';
      } else if (currentStatus === 'DOWN') {
        // Stay DOWN
        newStatus = 'DOWN';
      }
    } else {
      // Result is UP
      this.consecutiveFailures = 0;
      this.consecutiveSuccesses++;

      if (currentStatus === 'DOWN') {
        newStatus = 'RECOVERING';
      } else if (
        currentStatus === 'RECOVERING' &&
        this.consecutiveSuccesses >= this.THRESHOLD
      ) {
        newStatus = 'UP';
      } else if (currentStatus === 'DEGRADED') {
        // Instant recovery from degraded if 1 success (or we can enforce threshold here too)
        // For now, let's say 1 success clears DEGRADED.
        newStatus = 'UP';
      }
    }

    // Persist State Change
    if (newStatus !== currentStatus) {
      console.log(
        `[${this.config.name}] State change: ${currentStatus} -> ${newStatus}`,
      );

      await db
        .update(monitors)
        .set({
          status: newStatus,
          updatedAt: new Date().toISOString(),
        })
        .where(eq(monitors.id, this.config.id));

      // Update local config cache
      this.config.status = newStatus;
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
        id: result.id,
        url: result.url,
        method: result.method,
        intervalSeconds: result.intervalSeconds,
        timeoutMs: result.timeoutMs,
        enabled: result.enabled,
        expectedStatus: result.expectedStatus,
        headers: result.headers as Record<string, string> | null,
        body: result.body,
        status: result.status, // Load persisted status
        name: result.name,
      };
    } else {
      this.config = null;
    }
  }

  async scheduleAlarm() {
    if (this.config && this.config.enabled) {
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

      const validCodes = this.config.expectedStatus
        .split(',')
        .map(s => parseInt(s.trim()));

      if (validCodes.includes(statusCode)) {
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
    };
  }
}
