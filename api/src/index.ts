import { Hono } from 'hono';
import { MonitorObject } from './monitor';

export { MonitorObject };

const app = new Hono<{ Bindings: CloudflareBindings }>();

app.get('/', c => {
  return c.text('Vigil API');
});

export default app;
