import type { AgentAction, AgentActionKind, AgentLoopState } from './AgentTypes.js';

export class AgentActionMenu {
  public findAction(state: AgentLoopState, actionId: string): AgentAction | undefined {
    return state.actions.find((action) => action.id === actionId);
  }

  public findActionByKind(state: AgentLoopState, kind: AgentActionKind): AgentAction | undefined {
    return state.actions.find((action) => action.kind === kind);
  }

  public requireAction(state: AgentLoopState, actionId: string): AgentAction {
    const action = this.findAction(state, actionId);

    if (!action) {
      throw new Error(`Agent action not found: ${actionId}`);
    }

    return action;
  }

  public hasExecuted(state: AgentLoopState, kind: AgentActionKind): boolean {
    return state.actions.some((action) => action.kind === kind && action.status === 'executed');
  }

  public canExecute(state: AgentLoopState, action: AgentAction): boolean {
    if (state.status === 'cancelled' || state.status === 'completed' || state.status === 'failed') {
      return false;
    }

    if (action.kind === 'request_approval') {
      return true;
    }

    if (action.kind === 'apply_patch') {
      return action.status !== 'executed';
    }

    return action.status !== 'executed' && action.status !== 'blocked';
  }
}
