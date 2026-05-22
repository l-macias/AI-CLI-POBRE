import type { JsonObject } from '../types/SharedTypes.js';
import type { SessionEvent, SessionEventName } from './SessionEventTypes.js';

export type RuntimeEventListener = (event: SessionEvent) => void;

export interface RuntimeEventPublishInput {
  name: SessionEventName;
  sessionId?: string | undefined;
  projectRoot?: string | undefined;
  message: string;
  payload?: JsonObject | undefined;
}

export class RuntimeEventBus {
  private readonly listeners = new Set<RuntimeEventListener>();
  private readonly events: SessionEvent[] = [];

  public publish(input: RuntimeEventPublishInput): SessionEvent {
    const createdAt = new Date().toISOString();

    const event: SessionEvent = {
      id: `runtime-event-${createdAt.replaceAll(':', '').replaceAll('.', '')}`,
      name: input.name,
      message: input.message,
      payload: input.payload ?? {},
      createdAt,
      ...(input.sessionId ? { sessionId: input.sessionId } : {}),
      ...(input.projectRoot ? { projectRoot: input.projectRoot } : {}),
    };

    this.events.push(event);

    for (const listener of this.listeners) {
      listener(event);
    }

    return event;
  }

  public subscribe(listener: RuntimeEventListener): () => void {
    this.listeners.add(listener);

    return () => {
      this.listeners.delete(listener);
    };
  }

  public list(): SessionEvent[] {
    return [...this.events];
  }

  public listForSession(sessionId: string): SessionEvent[] {
    return this.events.filter((event) => event.sessionId === sessionId);
  }
}
