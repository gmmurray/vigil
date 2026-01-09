import { desc } from 'drizzle-orm';
import { Hono } from 'hono';
import { createDb } from '../db';
import { incidents } from '../schema';

type Bindings = {
  DB: D1Database;
};

const app = new Hono<{ Bindings: Bindings }>();

// List all incidents (Global view)
app.get('/', async c => {
  const db = createDb(c.env.DB);
  const result = await db
    .select()
    .from(incidents)
    .orderBy(desc(incidents.startedAt))
    .limit(50); // Hard limit for now
  return c.json(result);
});

// Get active incidents only
app.get('/active', async c => {
  const db = createDb(c.env.DB);
  // Drizzle doesn't export isNull helper easily in all contexts,
  // but we can query where endedAt is null.
  const result = await db
    .select()
    .from(incidents)
    .orderBy(desc(incidents.startedAt))
    .all();

  // Filter in memory for simplicity or use specific where clause if available in your drizzle version imports
  const active = result.filter(i => i.endedAt === null);

  return c.json(active);
});

export default app;
