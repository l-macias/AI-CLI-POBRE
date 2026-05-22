import type { RuntimeEventBus } from './RuntimeEventBus.js';

export interface WebSocketGatewayOptions {
  eventBus: RuntimeEventBus;
}

export class WebSocketGateway {
  private readonly eventBus: RuntimeEventBus;

  public constructor(options: WebSocketGatewayOptions) {
    this.eventBus = options.eventBus;
  }

  public isEnabled(): boolean {
    return false;
  }

  public describe(): {
    enabled: boolean;
    reason: string;
    bufferedEvents: number;
  } {
    return {
      enabled: false,
      reason:
        'WebSocket gateway is reserved for a later bidirectional transport. Session 62 uses native Server-Sent Events.',
      bufferedEvents: this.eventBus.list().length,
    };
  }
}
