import { and, desc, eq, isNull } from 'drizzle-orm';

import { Hono } from 'hono';
import { createDb } from '../db';
import { incidents } from '../schema';

const app = new Hono<{ Bindings: CloudflareBindings }>();

// GET /incidents
// Query Params:
//   - active (boolean): if true, only return ongoing incidents
//   - monitorId (string): filter by monitor
//   - limit (number): default 50
//   - offset (number): default 0
app.get('/', async c => {
  const db = createDb(c.env.DB);
  const { active, monitorId, limit, offset } = c.req.query();

  const limitVal = parseInt(limit || '50');
  const offsetVal = parseInt(offset || '0');

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

  // Get total count for pagination metadata (optional but helpful)
  // const total = await db.select({ count: sql<number>`count(*)` }).from(incidents).where(and(...conditions)).get();

  return c.json({
    data: result,
    meta: {
      limit: limitVal,
      offset: offsetVal,
      // total: total?.count || 0
    },
  });
});

export default app;
