import { Hono } from 'hono';
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

export default app;
