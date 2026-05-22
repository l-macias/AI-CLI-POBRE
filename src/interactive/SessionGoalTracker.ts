import type {
  InteractiveSessionGoalUpdate,
  InteractiveSessionState,
} from './InteractiveSessionTypes.js';

export class SessionGoalTracker {
  public update(
    state: InteractiveSessionState,
    input: {
      nextGoal: string;
      reason: string;
    },
  ): InteractiveSessionState {
    const createdAt = new Date().toISOString();

    const update: InteractiveSessionGoalUpdate = {
      id: this.createId('goal-update'),
      previousGoal: state.goal.current,
      nextGoal: input.nextGoal,
      reason: input.reason,
      createdAt,
    };

    return {
      ...state,
      goal: {
        ...state.goal,
        current: input.nextGoal,
        updates: [...state.goal.updates, update],
      },
      updatedAt: createdAt,
    };
  }

  private createId(prefix: string): string {
    return `${prefix}-${new Date().toISOString().replaceAll(':', '').replaceAll('.', '')}`;
  }
}
