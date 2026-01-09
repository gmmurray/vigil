import { DurableObject } from 'cloudflare:workers';
import { eq } from 'drizzle-orm';
import { createDb } from './db';
import { monitors } from './schema';

interface MonitorConfig {
  id: string;
  url: string;
  method: string;
  intervalSeconds: number;
  timeoutMs: number;
  enabled: number;
}

export class MonitorObject extends DurableObject {
  private config: MonitorConfig | null = null;

  constructor(ctx: DurableObjectState, env: CloudflareBindings) {
    super(ctx, env);
  }

  async fetch(request: Request): Promise<Response> {
    const url = new URL(request.url);

    // 1. Initialize or Update Monitor
    // usage: await do.fetch("http://do/init", { method: "POST", body: JSON.stringify({ monitorId: "..." }) })
    if (url.pathname === '/init' && request.method === 'POST') {
      const { monitorId } = (await request.json()) as { monitorId: string };

      // Store ID persistently
      await this.ctx.storage.put('monitorId', monitorId);

      // Load config and start
      await this.refreshConfig(monitorId);
      await this.scheduleAlarm();

      return new Response('Monitor initialized and scheduled');
    }

    // 2. Trigger Manual Check (for UI button)
    if (url.pathname === '/check' && request.method === 'POST') {
      await this.check();
      return new Response('Check execution triggered');
    }

    // 3. Stop Monitor (e.g. when disabled/deleted)
    if (url.pathname === '/stop' && request.method === 'POST') {
      await this.ctx.storage.deleteAlarm();
      return new Response('Monitor stopped');
    }

    return new Response('Vigil Monitor DO', { status: 404 });
  }

  async alarm() {
    // Ensure we have config
    if (!this.config) {
      const monitorId = await this.ctx.storage.get<string>('monitorId');
      if (monitorId) {
        await this.refreshConfig(monitorId);
      } else {
        // Orphaned DO? Stop alarm loop.
        return;
      }
    }

    // Safety check: if disabled or deleted, stop loop
    if (!this.config || !this.config.enabled) {
      return;
    }

    // Execute Check (Stub for DEVG-55)
    await this.check();

    // Schedule next run
    await this.scheduleAlarm();
  }

  // --- Helpers ---

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
      };
    } else {
      // Monitor likely deleted
      this.config = null;
    }
  }

  async scheduleAlarm() {
    if (this.config && this.config.enabled) {
      const nextTime = Date.now() + this.config.intervalSeconds * 1000;
      await this.ctx.storage.setAlarm(nextTime);
    }
  }

  async check() {
    // Placeholder for DEVG-55
    console.log(`[${this.config?.id}] Checking ${this.config?.url}...`);
  }
}
