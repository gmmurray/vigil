import { DurableObject } from 'cloudflare:workers';
import { and, desc, eq, isNull } from 'drizzle-orm';
import { ulid } from 'ulid';
import { createDb } from './db';
import { checkResults, incidents, monitors } from './schema';
import type { CheckResult, MonitorConfig, MonitorStatus } from './types';

export class MonitorObject extends DurableObject {
  private config: MonitorConfig | null = null;

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

    const result = await this.check();

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

    await this.updateState(result, db);
    await this.scheduleAlarm();
  }

  async updateState(result: CheckResult, db: ReturnType<typeof createDb>) {
    if (!this.config) return;

    let newStatus: MonitorStatus = this.config.status;
    const currentStatus = this.config.status;

    // State Machine Logic (Same as before)
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
        newStatus = 'DOWN';
      }
    } else {
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
        newStatus = 'UP';
      }
    }

    // Handle State Transition
    if (newStatus !== currentStatus) {
      console.log(
        `[${this.config.name}] State change: ${currentStatus} -> ${newStatus}`,
      );

      // 1. Update Monitor Status
      await db
        .update(monitors)
        .set({
          status: newStatus,
          updatedAt: new Date().toISOString(),
        })
        .where(eq(monitors.id, this.config.id));

      // 2. Manage Incidents
      if (newStatus === 'DOWN') {
        // OPEN new incident
        await db.insert(incidents).values({
          id: ulid(),
          monitorId: this.config.id,
          startedAt: new Date().toISOString(),
          cause: result.error || `Status Code: ${result.statusCode}`,
        });
      } else if (
        newStatus === 'UP' &&
        (currentStatus === 'DOWN' || currentStatus === 'RECOVERING')
      ) {
        // CLOSE active incident
        // Find the most recent open incident for this monitor
        const openIncident = await db
          .select()
          .from(incidents)
          .where(
            and(
              eq(incidents.monitorId, this.config.id),
              isNull(incidents.endedAt),
            ),
          )
          .orderBy(desc(incidents.startedAt))
          .limit(1)
          .get();

        if (openIncident) {
          await db
            .update(incidents)
            .set({ endedAt: new Date().toISOString() })
            .where(eq(incidents.id, openIncident.id));
        }
      }

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
      // Drizzle returns 'unknown' for JSON columns and 'string' for text columns
      // We cast them to our strict MonitorConfig types
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
      id: ulid(),
    };
  }
}
