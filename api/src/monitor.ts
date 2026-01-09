import { DurableObject } from 'cloudflare:workers';

export class MonitorObject extends DurableObject {
  constructor(state: DurableObjectState, env: CloudflareBindings) {
    super(state, env);
  }

  async fetch(request: Request): Promise<Response> {
    return new Response('Monitor DO active');
  }
}
