import { and, desc, eq } from 'drizzle-orm';

import { Hono } from 'hono';
import { createDb } from '../db';
import { monitors, notificationChannels, notificationLogs } from '../schema';

const app = new Hono<{ Bindings: CloudflareBindings }>();

// Query params: channelId (string), monitorId (string), success (boolean), limit (number), offset (number)
app.get('/', async c => {
  const db = createDb(c.env.DB);
  const { channelId, monitorId, success, limit, offset } = c.req.query();

  const limitVal = Math.min(parseInt(limit || '50', 10), 500);
  const offsetVal = parseInt(offset || '0', 10);

  const conditions = [];

  if (channelId) {
    conditions.push(eq(notificationLogs.channelId, channelId));
  }

  if (monitorId) {
    conditions.push(eq(notificationLogs.monitorId, monitorId));
  }

  if (success === 'true') {
    conditions.push(eq(notificationLogs.success, 1));
  } else if (success === 'false') {
    conditions.push(eq(notificationLogs.success, 0));
  }

  const result = await db
    .select({
      id: notificationLogs.id,
      channelId: notificationLogs.channelId,
      monitorId: notificationLogs.monitorId,
      event: notificationLogs.event,
      success: notificationLogs.success,
      error: notificationLogs.error,
      createdAt: notificationLogs.createdAt,
      monitorName: monitors.name,
      channelType: notificationChannels.type,
    })
    .from(notificationLogs)
    .leftJoin(monitors, eq(notificationLogs.monitorId, monitors.id))
    .leftJoin(
      notificationChannels,
      eq(notificationLogs.channelId, notificationChannels.id),
    )
    .where(conditions.length > 0 ? and(...conditions) : undefined)
    .orderBy(desc(notificationLogs.createdAt))
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
