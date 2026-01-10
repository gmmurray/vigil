import { eq } from 'drizzle-orm';

import { Hono } from 'hono';
import { ulid } from 'ulid';
import { createDb } from '../db';
import { notificationChannels } from '../schema';
import type { NewChannel, UpdateChannel } from '../types';

const app = new Hono<{ Bindings: CloudflareBindings }>();

app.get('/', async c => {
  const db = createDb(c.env.DB);
  const result = await db.select().from(notificationChannels).all();
  return c.json(result);
});

app.post('/', async c => {
  const db = createDb(c.env.DB);
  const body = (await c.req.json()) as Partial<NewChannel>;

  if (!body.type || !body.config) {
    return c.json({ error: 'Type and Config are required' }, 400);
  }

  const newChannel: NewChannel = {
    id: ulid(),
    type: body.type,
    config: body.config,
    enabled: body.enabled !== undefined ? body.enabled : 1,
    createdAt: new Date().toISOString(),
  };

  await db.insert(notificationChannels).values(newChannel);
  return c.json(newChannel, 201);
});

app.put('/:id', async c => {
  const id = c.req.param('id');
  const db = createDb(c.env.DB);
  const body = (await c.req.json()) as UpdateChannel;

  const existing = await db
    .select()
    .from(notificationChannels)
    .where(eq(notificationChannels.id, id))
    .get();
  if (!existing) {
    return c.json({ error: 'Channel not found' }, 404);
  }

  const updateData: UpdateChannel = {};
  if (body.type) updateData.type = body.type;
  if (body.config) updateData.config = body.config;
  if (body.enabled !== undefined) updateData.enabled = body.enabled;

  if (Object.keys(updateData).length > 0) {
    await db
      .update(notificationChannels)
      .set(updateData)
      .where(eq(notificationChannels.id, id))
      .run();
  }

  return c.json({ success: true, ...updateData });
});

app.delete('/:id', async c => {
  const id = c.req.param('id');
  const db = createDb(c.env.DB);

  const result = await db
    .delete(notificationChannels)
    .where(eq(notificationChannels.id, id))
    .run();

  if (result.meta.changes === 0) {
    return c.json({ error: 'Channel not found' }, 404);
  }

  return c.json({ success: true });
});

export default app;
