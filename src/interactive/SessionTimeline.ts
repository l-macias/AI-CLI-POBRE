import type {
  InteractiveSessionState,
  InteractiveSessionTimelineEvent,
  InteractiveSessionTimelineEventKind,
} from './InteractiveSessionTypes.js';
import type { JsonObject } from '../types/SharedTypes.js';

export class SessionTimeline {
  public append(
    state: InteractiveSessionState,
    input: {
      kind: InteractiveSessionTimelineEventKind;
      message: string;
      metadata?: JsonObject | undefined;
    },
  ): InteractiveSessionState {
    const event: InteractiveSessionTimelineEvent = {
      id: this.createId('timeline-event'),
      kind: input.kind,
      message: input.message,
      createdAt: new Date().toISOString(),
      ...(input.metadata ? { metadata: input.metadata } : {}),
    };

    return {
      ...state,
      timeline: [...state.timeline, event],
      updatedAt: event.createdAt,
    };
  }

  private createId(prefix: string): string {
    return `${prefix}-${new Date().toISOString().replaceAll(':', '').replaceAll('.', '')}`;
  }
}
