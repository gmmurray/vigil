import { and, desc, eq, isNull } from 'drizzle-orm';

import { Hono } from 'hono';
import { createDb } from '../db';
import { incidents } from '../schema';

const app = new Hono<{ Bindings: CloudflareBindings }>();

// Query params: active (boolean), monitorId (string), limit (number), offset (number)
app.get('/', async c => {
  const db = createDb(c.env.DB);
  const { active, monitorId, limit, offset } = c.req.query();

  const limitVal = parseInt(limit || '50', 10);
  const offsetVal = parseInt(offset || '0', 10);

  const conditions = [];

  if (active === 'true') {
    conditions.push(isNull(incidents.endedAt));
  }

  if (monitorId) {
    conditions.push(eq(incidents.monitorId, monitorId));
  }

  const result = await db
    .select()
    .from(incidents)
    .where(and(...conditions))
    .orderBy(desc(incidents.startedAt))
    .limit(limitVal)
    .offset(offsetVal)
    .all();

  return c.json({
    data: result,
    meta: {
      limit: limitVal,
      offset: offsetVal,
    },
  });
});

export default app;
