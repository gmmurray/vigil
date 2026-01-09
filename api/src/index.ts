import { Hono } from 'hono';
import { MonitorObject } from './monitor';
import monitors from './routes/monitors';

export { MonitorObject };

const app = new Hono<{ Bindings: CloudflareBindings }>();

app.get('/', c => {
  return c.text('Vigil API');
});

// Mount sub-apps
app.route('/monitors', monitors);

export default app;
