import { Hono } from 'hono';
import { MonitorObject } from './monitor';
import channels from './routes/channels';
import incidents from './routes/incidents';
import monitors from './routes/monitors';

export { MonitorObject };

const app = new Hono<{ Bindings: CloudflareBindings }>();

app.get('/', c => {
  return c.text('Vigil API');
});

app.route('/monitors', monitors);
app.route('/incidents', incidents);
app.route('/channels', channels);

export default app;
