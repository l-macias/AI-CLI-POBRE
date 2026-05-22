import 'dotenv/config';
import { createServer, type IncomingMessage, type Server, type ServerResponse } from 'node:http';
import { InteractiveCommandRouter } from '../interactive/InteractiveCommandRouter.js';
import { InteractiveSession } from '../interactive/InteractiveSession.js';
import { RuntimeEventBus } from '../server/RuntimeEventBus.js';
import { SessionEventStream } from '../server/SessionEventStream.js';
import { WebUiAssets } from '../web/WebUiAssets.js';
import { RuntimeApiController } from './RuntimeApiController.js';
import { RuntimeApiRequestParser } from './RuntimeApiRequestParser.js';
import { RuntimeApiRouter } from './RuntimeApiRouter.js';
import type { RuntimeApiServerConfig, RuntimeApiStartResult } from './RuntimeApiTypes.js';

export interface RuntimeApiServerOptions {
  config?: Partial<RuntimeApiServerConfig> | undefined;
  parser?: RuntimeApiRequestParser | undefined;
  router?: RuntimeApiRouter | undefined;
  webAssets?: WebUiAssets | undefined;
  eventBus?: RuntimeEventBus | undefined;
  eventStream?: SessionEventStream | undefined;
}

export class RuntimeApiServer {
  private readonly config: RuntimeApiServerConfig;
  private readonly parser: RuntimeApiRequestParser;
  private readonly router: RuntimeApiRouter;
  private readonly webAssets: WebUiAssets;
  private readonly eventStream: SessionEventStream;
  private server: Server | null = null;

  public constructor(options: RuntimeApiServerOptions = {}) {
    this.config = {
      host: options.config?.host ?? '127.0.0.1',
      port: options.config?.port ?? 17871,
    };

    this.parser = options.parser ?? new RuntimeApiRequestParser();
    this.webAssets = options.webAssets ?? new WebUiAssets();

    const eventBus = options.eventBus ?? new RuntimeEventBus();
    this.eventStream =
      options.eventStream ??
      new SessionEventStream({
        eventBus,
      });

    if (options.router) {
      this.router = options.router;
      return;
    }

    const session = new InteractiveSession();

    this.router = new RuntimeApiRouter({
      controller: new RuntimeApiController({
        session,
        eventBus,
        commandRouter: new InteractiveCommandRouter({
          session,
        }),
      }),
    });
  }

  public async start(): Promise<RuntimeApiStartResult> {
    if (this.server) {
      return {
        host: this.config.host,
        port: this.config.port,
        url: this.url(),
      };
    }

    this.server = createServer((request, response) => {
      void this.handleRequest(request, response);
    });

    await new Promise<void>((resolveStart) => {
      this.server?.listen(this.config.port, this.config.host, () => {
        resolveStart();
      });
    });

    return {
      host: this.config.host,
      port: this.config.port,
      url: this.url(),
    };
  }

  public async stop(): Promise<void> {
    if (!this.server) {
      return;
    }

    const server = this.server;
    this.server = null;

    await new Promise<void>((resolveStop, reject) => {
      server.close((error) => {
        if (error) {
          reject(error);
          return;
        }

        resolveStop();
      });
    });
  }

  private async handleRequest(request: IncomingMessage, response: ServerResponse): Promise<void> {
    try {
      if (this.eventStream.canHandle(request)) {
        this.eventStream.handle(request, response);
        return;
      }

      if (request.method === 'GET') {
        const pathname = new URL(request.url ?? '/', 'http://localhost').pathname;
        const asset = this.webAssets.get(pathname);

        if (asset) {
          response.statusCode = 200;
          response.setHeader('content-type', asset.contentType);
          response.setHeader('cache-control', 'no-store');
          response.end(asset.body);
          return;
        }
      }

      const parsed = await this.parser.parse(request);
      const result = await this.router.route(parsed);

      response.statusCode = result.statusCode;
      response.setHeader('content-type', 'application/json; charset=utf-8');
      response.setHeader('cache-control', 'no-store');
      response.end(`${JSON.stringify(result.body, null, 2)}\n`);
    } catch (error) {
      response.statusCode = 500;
      response.setHeader('content-type', 'application/json; charset=utf-8');
      response.setHeader('cache-control', 'no-store');
      response.end(
        `${JSON.stringify(
          {
            status: 'error',
            issues: [
              {
                code: 'RUNTIME_API_INTERNAL_ERROR',
                message: error instanceof Error ? error.message : String(error),
              },
            ],
          },
          null,
          2,
        )}\n`,
      );
    }
  }

  private url(): string {
    return `http://${this.config.host}:${this.config.port}`;
  }
}
