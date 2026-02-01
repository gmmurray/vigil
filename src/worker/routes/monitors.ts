import { and, desc, eq, gt, isNotNull, isNull, sql } from 'drizzle-orm';
import { Hono } from 'hono';
import { ulid } from 'ulid';
import { createDb } from '../db';
import { checkEndpoint } from '../lib/check-endpoint';
import { checkResults, incidents, monitors } from '../schema';
import type { MonitorConfig } from '../types';

const app = new Hono<{ Bindings: CloudflareBindings }>();

app.get('/', async c => {
  const db = createDb(c.env.DB);
  const monitorsList = await db.select().from(monitors).all();

  const monitorsWithChecks = await Promise.all(
    monitorsList.map(async m => {
      const recent = await db
        .select()
        .from(checkResults)
        .where(eq(checkResults.monitorId, m.id))
        .orderBy(desc(checkResults.checkedAt))
        .limit(20)
        .all();

      return { ...m, recentChecks: recent };
    }),
  );

  return c.json(monitorsWithChecks);
});

app.post('/', async c => {
  const db = createDb(c.env.DB);
  const body = await c.req.json();

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
    status: 'UP',
    enabled: body.enabled === 0 ? 0 : 1,
  };

  await db.insert(monitors).values(newMonitor);

  const id = c.env.MONITOR.idFromName(newMonitor.id);
  const stub = c.env.MONITOR.get(id);

  await stub.fetch('http://do/init', {
    method: 'POST',
    body: JSON.stringify({ monitorId: newMonitor.id }),
  });

  return c.json(newMonitor, 201);
});

app.post('/test', async c => {
  const reqBody = await c.req.json();
  const {
    url,
    method = 'GET',
    timeoutMs = 5000,
    expectedStatus = '200',
    headers: customHeaders,
    body: requestBody,
  } = reqBody;

  if (!url) {
    return c.json({ error: 'URL is required' }, 400);
  }

  try {
    new URL(url);
  } catch {
    return c.json({ success: false, error: 'Invalid URL format' }, 400);
  }

  // Merge custom headers with default User-Agent
  const headers: Record<string, string> = {
    'User-Agent': 'Vigil-Monitor/1.0',
    ...customHeaders,
  };

  // Only include body for methods that support it
  const body =
    requestBody && ['POST', 'PUT', 'PATCH'].includes(method)
      ? requestBody
      : null;

  const result = await checkEndpoint({
    url,
    method,
    headers,
    body,
    timeoutMs,
    expectedStatus,
  });

  return c.json({
    success: result.status === 'UP',
    statusCode: result.statusCode,
    responseTime: result.responseTimeMs,
    error: result.error,
  });
});

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
  const { force } = c.req.query();

  const doId = c.env.MONITOR.idFromName(id);
  const stub = c.env.MONITOR.get(doId);

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

app.get('/:id/sub', async c => {
  const id = c.req.param('id');
  const upgradeHeader = c.req.header('Upgrade');

  if (!upgradeHeader || upgradeHeader !== 'websocket') {
    return c.text('Expected Upgrade: websocket', 426);
  }

  const doId = c.env.MONITOR.idFromName(id);
  const stub = c.env.MONITOR.get(doId);

  return stub.fetch(c.req.raw);
});

app.get('/:id/checks', async c => {
  const id = c.req.param('id');
  const { limit, offset } = c.req.query();
  const db = createDb(c.env.DB);

  const limitVal = Math.min(parseInt(limit || '100', 10), 500);
  const offsetVal = parseInt(offset || '0', 10);

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

app.get('/:id/incidents', async c => {
  const id = c.req.param('id');
  const { active, limit, offset } = c.req.query();
  const db = createDb(c.env.DB);

  const limitVal = parseInt(limit || '50', 10);
  const offsetVal = parseInt(offset || '0', 10);

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

  // Default to 30 days if not specified
  const days = 30;
  const now = new Date();
  const startWindow = new Date(now.getTime() - days * 24 * 60 * 60 * 1000);

  // 1. OPTIMIZED UPTIME: Use Incidents table (fast) instead of counting 260k rows
  const recentIncidents = await db
    .select()
    .from(incidents)
    .where(
      and(
        eq(incidents.monitorId, id),
        gt(incidents.startedAt, startWindow.toISOString()),
      ),
    )
    .all();

  let downSeconds = 0;
  for (const inc of recentIncidents) {
    // Clamp start time to the window
    const start =
      new Date(inc.startedAt).getTime() < startWindow.getTime()
        ? startWindow.getTime()
        : new Date(inc.startedAt).getTime();

    // Use 'now' if incident is still ongoing
    const end = inc.endedAt ? new Date(inc.endedAt).getTime() : now.getTime();

    downSeconds += (end - start) / 1000;
  }

  const totalSeconds = days * 24 * 60 * 60;
  const uptime = ((totalSeconds - downSeconds) / totalSeconds) * 100;

  // 2. OPTIMIZED LATENCY: Sample last 500 checks (sufficient for average)
  const latencyResult = await db
    .select({ avg: sql<number>`avg(response_time_ms)` })
    .from(checkResults)
    .where(
      and(
        eq(checkResults.monitorId, id),
        isNotNull(checkResults.responseTimeMs),
      ),
    )
    .orderBy(desc(checkResults.checkedAt))
    .limit(500) // Sample size
    .get();

  return c.json({
    monitorId: id,
    period: `${days}d`,
    uptime: Number(Math.max(0, Math.min(100, uptime)).toFixed(2)),
    avgResponseTime: Math.round(latencyResult?.avg || 0),
  });
});

app.put('/:id', async c => {
  const id = c.req.param('id');
  const db = createDb(c.env.DB);
  const body = await c.req.json();

  const existing = await db
    .select()
    .from(monitors)
    .where(eq(monitors.id, id))
    .get();
  if (!existing) {
    return c.json({ error: 'Monitor not found' }, 404);
  }

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

  await db.update(monitors).set(updateData).where(eq(monitors.id, id)).run();

  // Refresh Durable Object config
  const doId = c.env.MONITOR.idFromName(id);
  const stub = c.env.MONITOR.get(doId);

  await stub.fetch('http://do/init', {
    method: 'POST',
    body: JSON.stringify({ monitorId: id }),
  });

  return c.json({ success: true, ...updateData });
});

app.delete('/:id', async c => {
  const id = c.req.param('id');
  const db = createDb(c.env.DB);

  const result = await db.delete(monitors).where(eq(monitors.id, id)).run();

  if (result.meta.changes === 0) {
    return c.json({ error: 'Monitor not found' }, 404);
  }

  // Clean up Durable Object state
  const doId = c.env.MONITOR.idFromName(id);
  const stub = c.env.MONITOR.get(doId);
  await stub.fetch('http://do/delete', { method: 'POST' });

  return c.json({ success: true });
});

app.patch('/bulk', async c => {
  const db = createDb(c.env.DB);
  const body = await c.req.json<{
    ids: string[] | null;
    update: { enabled?: number };
  }>();

  if (!body.update || Object.keys(body.update).length === 0) {
    return c.json({ error: 'No update fields provided' }, 400);
  }

  // Build update data
  const updateData: { enabled?: number; updatedAt: string } = {
    updatedAt: new Date().toISOString(),
  };
  if (body.update.enabled !== undefined) {
    updateData.enabled = body.update.enabled;
  }

  // Get affected monitor IDs
  let affectedIds: string[];
  if (body.ids && body.ids.length > 0) {
    affectedIds = body.ids;
    await db
      .update(monitors)
      .set(updateData)
      .where(
        sql`id IN (${sql.join(
          body.ids.map(id => sql`${id}`),
          sql`, `,
        )})`,
      )
      .run();
  } else {
    // Update all
    const allMonitors = await db
      .select({ id: monitors.id })
      .from(monitors)
      .all();
    affectedIds = allMonitors.map(m => m.id);
    await db.update(monitors).set(updateData).run();
  }

  // Refresh each affected Durable Object
  await Promise.allSettled(
    affectedIds.map(async id => {
      const doId = c.env.MONITOR.idFromName(id);
      const stub = c.env.MONITOR.get(doId);
      await stub.fetch('http://do/init', {
        method: 'POST',
        body: JSON.stringify({ monitorId: id }),
      });
    }),
  );

  return c.json({ success: true, affected: affectedIds.length });
});

export default app;
