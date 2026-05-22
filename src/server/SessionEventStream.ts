import type { IncomingMessage, ServerResponse } from 'node:http';
import type { RuntimeEventBus } from './RuntimeEventBus.js';
import type { SessionEvent } from './SessionEventTypes.js';

export interface SessionEventStreamOptions {
  eventBus: RuntimeEventBus;
}

export class SessionEventStream {
  private readonly eventBus: RuntimeEventBus;

  public constructor(options: SessionEventStreamOptions) {
    this.eventBus = options.eventBus;
  }

  public canHandle(request: IncomingMessage): boolean {
    if (request.method !== 'GET') {
      return false;
    }

    const pathname = new URL(request.url ?? '/', 'http://localhost').pathname;

    return (
      pathname === '/events' ||
      pathname === '/api/events' ||
      /^\/sessions\/[^/]+\/events$/.test(pathname) ||
      /^\/api\/sessions\/[^/]+\/events$/.test(pathname)
    );
  }

  public handle(request: IncomingMessage, response: ServerResponse): void {
    const pathname = new URL(request.url ?? '/', 'http://localhost').pathname;
    const sessionId = this.resolveSessionId(pathname);

    response.statusCode = 200;
    response.setHeader('content-type', 'text/event-stream; charset=utf-8');
    response.setHeader('cache-control', 'no-store');
    response.setHeader('connection', 'keep-alive');
    response.flushHeaders();

    response.write(': connected\n\n');

    const initialEvents = sessionId
      ? this.eventBus.listForSession(sessionId)
      : this.eventBus.list();

    for (const event of initialEvents) {
      response.write(this.serialize(event));
    }

    const unsubscribe = this.eventBus.subscribe((event) => {
      if (sessionId && event.sessionId !== sessionId) {
        return;
      }

      response.write(this.serialize(event));
    });

    request.on('close', () => {
      unsubscribe();
      response.end();
    });
  }

  private resolveSessionId(pathname: string): string | undefined {
    const apiMatch = pathname.match(/^\/api\/sessions\/([^/]+)\/events$/);

    if (apiMatch?.[1]) {
      return decodeURIComponent(apiMatch[1]);
    }

    const match = pathname.match(/^\/sessions\/([^/]+)\/events$/);

    if (match?.[1]) {
      return decodeURIComponent(match[1]);
    }

    return undefined;
  }

  private serialize(event: SessionEvent): string {
    return `id: ${event.id}
event: ${event.name}
data: ${JSON.stringify(event)}

`;
  }
}
