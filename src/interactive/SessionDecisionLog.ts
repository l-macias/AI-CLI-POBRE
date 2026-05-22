import type {
  InteractiveSessionDecision,
  InteractiveSessionDecisionInput,
  InteractiveSessionState,
} from './InteractiveSessionTypes.js';

export class SessionDecisionLog {
  public append(
    state: InteractiveSessionState,
    input: InteractiveSessionDecisionInput,
  ): InteractiveSessionState {
    const createdAt = new Date().toISOString();

    const decision: InteractiveSessionDecision = {
      id: this.createId('interactive-decision'),
      title: input.title,
      description: input.description,
      reason: input.reason,
      createdAt,
      ...(input.metadata ? { metadata: input.metadata } : {}),
    };

    return {
      ...state,
      decisions: [...state.decisions, decision],
      updatedAt: createdAt,
    };
  }

  private createId(prefix: string): string {
    return `${prefix}-${new Date().toISOString().replaceAll(':', '').replaceAll('.', '')}`;
  }
}
