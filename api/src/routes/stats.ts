import { desc, eq, gt, isNotNull, sql } from 'drizzle-orm';
import { Hono } from 'hono';
import { createDb } from '../db';
import { checkResults, incidents, monitors } from '../schema';

const app = new Hono<{ Bindings: CloudflareBindings }>();

async function calculateUptime(
  db: ReturnType<typeof createDb>,
  monitorId: string | null,
  days = 30,
) {
  const now = new Date();
  const startWindow = new Date(now.getTime() - days * 24 * 60 * 60 * 1000);

  // 1. Get total active monitors count (for global) or 1 (for single)
  let monitorCount = 1;
  if (!monitorId) {
    const m = await db
      .select({ count: sql<number>`count(*)` })
      .from(monitors)
      .where(eq(monitors.enabled, 1))
      .get();
    monitorCount = m?.count ?? 0;
  }

  const totalSeconds = days * 24 * 60 * 60 * monitorCount;

  // 2. Fetch incidents in the window
  let query = db
    .select()
    .from(incidents)
    .where(gt(incidents.startedAt, startWindow.toISOString()))
    .$dynamic();
  if (monitorId) {
    query = query.where(eq(incidents.monitorId, monitorId));
  }
  const recentIncidents = await query.all();

  // 3. Sum downtime
  let downSeconds = 0;
  for (const inc of recentIncidents) {
    const start =
      new Date(inc.startedAt).getTime() < startWindow.getTime()
        ? startWindow.getTime()
        : new Date(inc.startedAt).getTime();
    const end = inc.endedAt ? new Date(inc.endedAt).getTime() : now.getTime();
    downSeconds += (end - start) / 1000;
  }

  const uptime = ((totalSeconds - downSeconds) / totalSeconds) * 100;
  return Math.max(0, Math.min(100, uptime)); // Clamp between 0-100
}

// Global Stats (Dashboard)
app.get('/global', async c => {
  const db = createDb(c.env.DB);

  // Uptime (30d) via Incidents strategy
  const uptime = await calculateUptime(db, null, 30);

  // Latency (Avg of last 1000 checks globally - decent sample size)
  // Optimization: Don't scan everything, just grab a sample
  const latencyResult = await db
    .select({ avg: sql<number>`avg(response_time_ms)` })
    .from(checkResults)
    .where(isNotNull(checkResults.responseTimeMs))
    .orderBy(desc(checkResults.checkedAt))
    .limit(1000)
    .get();

  return c.json({
    uptime30d: Number(uptime.toFixed(2)),
    avgLatency: Math.round(latencyResult?.avg || 0),
  });
});

export default app;
