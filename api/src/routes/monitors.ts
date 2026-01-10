import { and, desc, eq, isNull, sql } from 'drizzle-orm';
import { Hono } from 'hono';
import { ulid } from 'ulid';
import { createDb } from '../db';
import { checkResults, incidents, monitors } from '../schema';
import type { MonitorConfig } from '../types';

const app = new Hono<{ Bindings: CloudflareBindings }>();

// List all monitors
app.get('/', async c => {
  const db = createDb(c.env.DB);
  const result = await db.select().from(monitors).all();
  return c.json(result);
});

// Create a monitor
app.post('/', async c => {
  const db = createDb(c.env.DB);
  const body = await c.req.json();

  // Basic validation (can be expanded later with Zod if desired)
  if (!body.name || !body.url) {
    return c.json({ error: 'Name and URL are required' }, 400);
  }

  const newMonitor = {
    id: ulid(),
    name: body.name,
    url: body.url,
    method: body.method || 'GET',
    intervalSeconds: body.intervalSeconds || 60,
    timeoutMs: body.timeoutMs || 5000,
    expectedStatus: body.expectedStatus || '200',
    headers: body.headers || null,
    body: body.body || null,
    status: 'UP', // Default state
    enabled: 1,
  };

  await db.insert(monitors).values(newMonitor);

  // Initialize the Durable Object
  const id = c.env.MONITOR.idFromName(newMonitor.id);
  const stub = c.env.MONITOR.get(id);

  // Fire and forget (awaiting ensures it's received, but we don't need the response body)
  await stub.fetch('http://do/init', {
    method: 'POST',
    body: JSON.stringify({ monitorId: newMonitor.id }),
  });

  return c.json(newMonitor, 201);
});

// Get a single monitor
app.get('/:id', async c => {
  const id = c.req.param('id');
  const db = createDb(c.env.DB);

  const result = await db
    .select()
    .from(monitors)
    .where(eq(monitors.id, id))
    .get();

  if (!result) {
    return c.json({ error: 'Monitor not found' }, 404);
  }

  return c.json(result);
});

app.post('/:id/check', async c => {
  const id = c.req.param('id');
  const { force } = c.req.query(); // Get query param

  const doId = c.env.MONITOR.idFromName(id);
  const stub = c.env.MONITOR.get(doId);

  // Pass it along to the DO
  const doUrl =
    force === 'true' ? 'http://do/check?force=true' : 'http://do/check';

  const response = await stub.fetch(doUrl, {
    method: 'POST',
  });

  if (!response.ok) {
    return c.json({ error: 'Check failed execution' }, 500);
  }

  const result = await response.json();
  return c.json(result);
});

app.get('/:id/checks', async c => {
  const id = c.req.param('id');
  const { limit, offset } = c.req.query();
  const db = createDb(c.env.DB);

  const limitVal = Math.min(parseInt(limit || '100'), 500); // Cap at 500
  const offsetVal = parseInt(offset || '0');

  // Verify monitor exists first (optional, but good for 404s)
  // Skipped for performance to just return empty list if ID invalid,
  // or you can do a quick count check.

  const checks = await db
    .select()
    .from(checkResults)
    .where(eq(checkResults.monitorId, id))
    .orderBy(desc(checkResults.checkedAt))
    .limit(limitVal)
    .offset(offsetVal)
    .all();

  return c.json({
    data: checks,
    meta: {
      monitorId: id,
      limit: limitVal,
      offset: offsetVal,
    },
  });
});

// Get incidents for a specific monitor (Convenience route per spec)
app.get('/:id/incidents', async c => {
  const id = c.req.param('id');
  const { active, limit, offset } = c.req.query();
  const db = createDb(c.env.DB);

  const limitVal = parseInt(limit || '50');
  const offsetVal = parseInt(offset || '0');

  const conditions = [eq(incidents.monitorId, id)];

  if (active === 'true') {
    conditions.push(isNull(incidents.endedAt));
  }

  const monitorIncidents = await db
    .select()
    .from(incidents)
    .where(and(...conditions))
    .orderBy(desc(incidents.startedAt))
    .limit(limitVal)
    .offset(offsetVal)
    .all();

  return c.json({
    data: monitorIncidents,
    meta: {
      monitorId: id,
      limit: limitVal,
      offset: offsetVal,
    },
  });
});

app.get('/:id/stats', async c => {
  const id = c.req.param('id');
  const db = createDb(c.env.DB);

  // Default to 24 hours ago
  const since = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();

  // We use raw SQL for aggregations as Drizzle's query builder is sometimes verbose for this
  const stats = await db
    .select({
      totalChecks: sql<number>`count(*)`,
      upChecks: sql<number>`sum(case when ${checkResults.status} = 'UP' then 1 else 0 end)`,
      avgResponseTime: sql<number>`avg(${checkResults.responseTimeMs})`,
    })
    .from(checkResults)
    .where(
      and(
        eq(checkResults.monitorId, id),
        sql`${checkResults.checkedAt} >= ${since}`,
      ),
    )
    .get();

  const total = stats?.totalChecks || 0;
  const up = stats?.upChecks || 0;

  // Calculate percentage
  const uptime = total > 0 ? (up / total) * 100 : 0;

  return c.json({
    monitorId: id,
    period: '24h',
    uptime: Number(uptime.toFixed(2)), // Format to 2 decimal places
    avgResponseTime: Math.round(stats?.avgResponseTime || 0),
    totalChecks: total,
  });
});

app.put('/:id', async c => {
  const id = c.req.param('id');
  const db = createDb(c.env.DB);
  const body = await c.req.json();

  // 1. Validate existence
  const existing = await db
    .select()
    .from(monitors)
    .where(eq(monitors.id, id))
    .get();
  if (!existing) {
    return c.json({ error: 'Monitor not found' }, 404);
  }

  // 2. Prepare update data (partial updates allowed)
  const updateData: Partial<MonitorConfig> = {
    updatedAt: new Date().toISOString(),
  };

  if (body.name) updateData.name = body.name;
  if (body.url) updateData.url = body.url;
  if (body.method) updateData.method = body.method;
  if (body.intervalSeconds) updateData.intervalSeconds = body.intervalSeconds;
  if (body.timeoutMs) updateData.timeoutMs = body.timeoutMs;
  if (body.expectedStatus) updateData.expectedStatus = body.expectedStatus;
  if (body.headers !== undefined) updateData.headers = body.headers;
  if (body.body !== undefined) updateData.body = body.body;
  if (body.enabled !== undefined) updateData.enabled = body.enabled;

  // 3. Update DB
  await db.update(monitors).set(updateData).where(eq(monitors.id, id)).run();

  // 4. Notify Durable Object to refresh config
  const doId = c.env.MONITOR.idFromName(id);
  const stub = c.env.MONITOR.get(doId);

  await stub.fetch('http://do/init', {
    method: 'POST',
    body: JSON.stringify({ monitorId: id }),
  });

  return c.json({ success: true, ...updateData });
});

// Delete a monitor
app.delete('/:id', async c => {
  const id = c.req.param('id');
  const db = createDb(c.env.DB);

  // 1. Delete from D1
  const result = await db.delete(monitors).where(eq(monitors.id, id)).run();

  if (result.meta.changes === 0) {
    return c.json({ error: 'Monitor not found' }, 404);
  }

  // 2. Clean up Durable Object (Wipe storage & alarm)
  const doId = c.env.MONITOR.idFromName(id);
  const stub = c.env.MONITOR.get(doId);
  await stub.fetch('http://do/delete', { method: 'POST' });

  return c.json({ success: true });
});

export default app;
