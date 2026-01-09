import { eq } from 'drizzle-orm';
import { Hono } from 'hono';
import { ulid } from 'ulid';
import { createDb } from '../db';
import { monitors } from '../schema';

// Define binding type locally to avoid circular deps if you move types out later
type Bindings = {
  DB: D1Database;
};

const app = new Hono<{ Bindings: Bindings }>();

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

// Delete a monitor
app.delete('/:id', async c => {
  const id = c.req.param('id');
  const db = createDb(c.env.DB);

  const result = await db.delete(monitors).where(eq(monitors.id, id)).run();

  if (result.meta.changes === 0) {
    return c.json({ error: 'Monitor not found' }, 404);
  }

  return c.json({ success: true });
});

export default app;
