import { Hono } from 'hono';
import { cleanupCheckResults } from './jobs/cleanup-check-results';
import { MonitorObject } from './monitor';
import channels from './routes/channels';
import incidents from './routes/incidents';
import monitors from './routes/monitors';
import notifications from './routes/notifications';
import stats from './routes/stats';

export { MonitorObject };

const app = new Hono<{ Bindings: CloudflareBindings }>();

// Root check
app.get('/', c => c.text('Vigil API'));

// Health check endpoint
app.get('/health', c =>
  c.json({ status: 'ok', timestamp: new Date().toISOString() }),
);

// Create API grouping
const api = new Hono<{ Bindings: CloudflareBindings }>();

// Mount routes to API group
api.route('/monitors', monitors);
api.route('/incidents', incidents);
api.route('/channels', channels);
api.route('/notifications', notifications);
api.route('/stats', stats);

// Mount API group to main app under /api/v1
app.route('/api/v1', api);

export default {
  fetch: app.fetch,
  async scheduled(
    _event: ScheduledEvent,
    env: CloudflareBindings,
    ctx: ExecutionContext,
  ) {
    const retentionDays = Number(env.CHECK_RESULTS_RETENTION_DAYS) || 15;
    ctx.waitUntil(
      cleanupCheckResults(env.DB, retentionDays).then(({ deletedCount }) => {
        console.log(
          `[Cleanup] Deleted ${deletedCount} check results older than ${retentionDays} days`,
        );
      }),
    );
  },
};
