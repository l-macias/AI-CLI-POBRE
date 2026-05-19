import type {
  AgentDecision,
  AgentLoopInput,
  AgentLoopIssue,
  AgentLoopState,
  AgentLoopStatus,
} from './AgentTypes.js';
import { AgentDecisionPresenter } from './AgentDecisionPresenter.js';
import { AgentLoopReporter } from './AgentLoopReporter.js';
import { AgentLoopStateStore } from './AgentLoopStateStore.js';
import { AgentTurnFactory } from './AgentTurn.js';

export interface InteractiveAgentLoopOptions {
  presenter?: AgentDecisionPresenter | undefined;
  store?: AgentLoopStateStore | undefined;
  reporter?: AgentLoopReporter | undefined;
  turnFactory?: AgentTurnFactory | undefined;
}

export class InteractiveAgentLoop {
  private readonly presenter: AgentDecisionPresenter;
  private readonly store: AgentLoopStateStore;
  private readonly reporter: AgentLoopReporter;
  private readonly turnFactory: AgentTurnFactory;

  public constructor(options: InteractiveAgentLoopOptions = {}) {
    this.presenter = options.presenter ?? new AgentDecisionPresenter();
    this.store = options.store ?? new AgentLoopStateStore();
    this.reporter = options.reporter ?? new AgentLoopReporter();
    this.turnFactory = options.turnFactory ?? new AgentTurnFactory();
  }

  public async start(input: AgentLoopInput): Promise<AgentLoopState> {
    const createdAt = new Date().toISOString();

    const state: AgentLoopState = {
      id: input.id ?? `agent-loop-${createdAt.replaceAll(':', '').replaceAll('.', '')}`,
      status: 'waiting_for_user',
      objective: input.objective,
      projectRoot: input.projectRoot,
      projectName: input.projectName,
      targetFiles: input.targetFiles,
      turns: [
        this.turnFactory.create({
          role: 'user',
          message: input.objective,
        }),
        this.turnFactory.create({
          role: 'runtime',
          message:
            'Agent loop initialized. Runtime will inspect, validate, propose, preview, request approval, apply, and revalidate in controlled phases.',
        }),
      ],
      actions: this.presenter.buildDefaultActions(),
      decisions: [],
      approvals: [],
      issues: [],
      createdAt,
      updatedAt: createdAt,
      metadata: input.metadata,
    };

    await this.store.save(state);
    await this.reporter.write(state);

    return state;
  }

  public async selectAction(
    state: AgentLoopState,
    actionId: string,
    reason: string,
  ): Promise<AgentLoopState> {
    const actionExists = state.actions.some((action) => action.id === actionId);

    if (!actionExists) {
      return this.withIssue(state, {
        code: 'AGENT_ACTION_NOT_FOUND',
        message: `Agent action not found: ${actionId}`,
        severity: 'error',
      });
    }

    const decision: AgentDecision = {
      id: `agent-decision-${new Date().toISOString().replaceAll(':', '').replaceAll('.', '')}`,
      actionId,
      selected: true,
      reason,
      createdAt: new Date().toISOString(),
    };

    const updated: AgentLoopState = {
      ...state,
      status: 'running',
      actions: state.actions.map((action) => {
        if (action.id !== actionId) {
          return action;
        }

        return {
          ...action,
          status: 'selected',
          completedAt: new Date().toISOString(),
        };
      }),
      decisions: [...state.decisions, decision],
      updatedAt: new Date().toISOString(),
    };

    await this.store.save(updated);
    await this.reporter.write(updated);

    return updated;
  }

  public async complete(state: AgentLoopState): Promise<AgentLoopState> {
    return this.transition(state, 'completed');
  }

  public async cancel(state: AgentLoopState, reason: string): Promise<AgentLoopState> {
    const updated: AgentLoopState = {
      ...state,
      status: 'cancelled',
      turns: [
        ...state.turns,
        this.turnFactory.create({
          role: 'runtime',
          message: `Agent loop cancelled: ${reason}`,
        }),
      ],
      updatedAt: new Date().toISOString(),
      completedAt: new Date().toISOString(),
    };

    await this.store.save(updated);
    await this.reporter.write(updated);

    return updated;
  }

  public present(state: AgentLoopState): string {
    return this.presenter.toText(state);
  }

  private async transition(
    state: AgentLoopState,
    status: AgentLoopStatus,
  ): Promise<AgentLoopState> {
    const updated: AgentLoopState = {
      ...state,
      status,
      updatedAt: new Date().toISOString(),
      completedAt:
        status === 'completed' || status === 'cancelled' || status === 'failed'
          ? new Date().toISOString()
          : state.completedAt,
    };

    await this.store.save(updated);
    await this.reporter.write(updated);

    return updated;
  }

  private async withIssue(state: AgentLoopState, issue: AgentLoopIssue): Promise<AgentLoopState> {
    const updated: AgentLoopState = {
      ...state,
      status: issue.severity === 'error' ? 'failed' : state.status,
      issues: [...state.issues, issue],
      updatedAt: new Date().toISOString(),
      completedAt: issue.severity === 'error' ? new Date().toISOString() : state.completedAt,
    };

    await this.store.save(updated);
    await this.reporter.write(updated);

    return updated;
  }
}
