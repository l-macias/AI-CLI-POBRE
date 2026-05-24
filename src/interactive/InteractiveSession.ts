import type {
  InteractiveSessionMessage,
  InteractiveSessionMessageInput,
  InteractiveSessionRuntimeAction,
  InteractiveSessionRuntimeActionInput,
  InteractiveSessionStartInput,
  InteractiveSessionState,
  InteractiveSessionStatus,
} from './InteractiveSessionTypes.js';
import { InteractiveSessionStore } from './InteractiveSessionStore.js';
import { SessionDecisionLog } from './SessionDecisionLog.js';
import { SessionGoalTracker } from './SessionGoalTracker.js';
import { SessionTimeline } from './SessionTimeline.js';

export interface InteractiveSessionOptions {
  store?: InteractiveSessionStore | undefined;
  timeline?: SessionTimeline | undefined;
  decisionLog?: SessionDecisionLog | undefined;
  goalTracker?: SessionGoalTracker | undefined;
}

export class InteractiveSession {
  private readonly store: InteractiveSessionStore;
  private readonly timeline: SessionTimeline;
  private readonly decisionLog: SessionDecisionLog;
  private readonly goalTracker: SessionGoalTracker;

  public constructor(options: InteractiveSessionOptions = {}) {
    this.store = options.store ?? new InteractiveSessionStore();
    this.timeline = options.timeline ?? new SessionTimeline();
    this.decisionLog = options.decisionLog ?? new SessionDecisionLog();
    this.goalTracker = options.goalTracker ?? new SessionGoalTracker();
  }

  public async start(input: InteractiveSessionStartInput): Promise<InteractiveSessionState> {
    const createdAt = new Date().toISOString();

    const state: InteractiveSessionState = {
      id: input.id ?? this.createId('interactive-session'),
      projectRoot: input.projectRoot,
      projectName: input.projectName,
      status: 'idle',
      goal: {
        original: input.goal,
        current: input.goal,
        updates: [],
      },
      messages: [
        {
          id: this.createId('interactive-message'),
          role: 'user',
          content: input.goal,
          createdAt,
        },
      ],
      decisions: [],
      runtimeActions: [],
      timeline: [
        {
          id: this.createId('timeline-event'),
          kind: 'session_started',
          message: `Interactive session started for ${input.projectName}.`,
          createdAt,
        },
      ],
      createdAt,
      updatedAt: createdAt,
      ...(input.createdBy ? { createdBy: input.createdBy } : {}),
      ...(input.metadata ? { metadata: input.metadata } : {}),
    };

    await this.store.save(state);

    return state;
  }

  public async load(sessionId: string): Promise<InteractiveSessionState> {
    return this.store.load(sessionId);
  }
  public async list(): Promise<InteractiveSessionState[]> {
    return this.store.list();
  }
  public async setStatus(
    state: InteractiveSessionState,
    status: InteractiveSessionStatus,
  ): Promise<InteractiveSessionState> {
    const updated = this.timeline.append(
      {
        ...state,
        status,
      },
      {
        kind: 'status_changed',
        message: `Session status changed from ${state.status} to ${status}.`,
      },
    );

    await this.store.save(updated);

    return updated;
  }

  public async pause(
    state: InteractiveSessionState,
    reason: string,
  ): Promise<InteractiveSessionState> {
    const pausedAt = new Date().toISOString();

    const updated = this.timeline.append(
      {
        ...state,
        status: 'paused',
        pausedAt,
        updatedAt: pausedAt,
      },
      {
        kind: 'session_paused',
        message: `Session paused: ${reason}`,
      },
    );

    await this.store.save(updated);

    return updated;
  }

  public async resume(state: InteractiveSessionState): Promise<InteractiveSessionState> {
    const updated = this.timeline.append(
      {
        ...state,
        status: 'idle',
        pausedAt: undefined,
      },
      {
        kind: 'session_resumed',
        message: 'Session resumed.',
      },
    );

    await this.store.save(updated);

    return updated;
  }

  public async addMessage(
    state: InteractiveSessionState,
    input: InteractiveSessionMessageInput,
  ): Promise<InteractiveSessionState> {
    const createdAt = new Date().toISOString();

    const message: InteractiveSessionMessage = {
      id: this.createId('interactive-message'),
      role: input.role,
      content: input.content,
      createdAt,
      ...(input.metadata ? { metadata: input.metadata } : {}),
    };

    const updated = this.timeline.append(
      {
        ...state,
        messages: [...state.messages, message],
        updatedAt: createdAt,
      },
      {
        kind: 'message_added',
        message: `${input.role} message added.`,
      },
    );

    await this.store.save(updated);

    return updated;
  }

  public async addDecision(
    state: InteractiveSessionState,
    input: Parameters<SessionDecisionLog['append']>[1],
  ): Promise<InteractiveSessionState> {
    const withDecision = this.decisionLog.append(state, input);

    const updated = this.timeline.append(withDecision, {
      kind: 'decision_added',
      message: `Decision added: ${input.title}`,
    });

    await this.store.save(updated);

    return updated;
  }

  public async addRuntimeAction(
    state: InteractiveSessionState,
    input: InteractiveSessionRuntimeActionInput,
  ): Promise<InteractiveSessionState> {
    const createdAt = new Date().toISOString();

    const action: InteractiveSessionRuntimeAction = {
      id: this.createId('runtime-action'),
      title: input.title,
      description: input.description,
      status: input.status,
      createdAt,
      ...(input.status === 'completed' || input.status === 'blocked' || input.status === 'failed'
        ? { completedAt: createdAt }
        : {}),
      ...(input.metadata ? { metadata: input.metadata } : {}),
    };

    const updated = this.timeline.append(
      {
        ...state,
        runtimeActions: [...state.runtimeActions, action],
        updatedAt: createdAt,
      },
      {
        kind: 'runtime_action_added',
        message: `Runtime action added: ${input.title}`,
      },
    );

    await this.store.save(updated);

    return updated;
  }

  public async updateGoal(
    state: InteractiveSessionState,
    input: {
      nextGoal: string;
      reason: string;
    },
  ): Promise<InteractiveSessionState> {
    const withGoal = this.goalTracker.update(state, input);

    const updated = this.timeline.append(withGoal, {
      kind: 'goal_updated',
      message: `Session goal updated: ${input.reason}`,
    });

    await this.store.save(updated);

    return updated;
  }

  public async complete(state: InteractiveSessionState): Promise<InteractiveSessionState> {
    const completedAt = new Date().toISOString();

    const updated = this.timeline.append(
      {
        ...state,
        status: 'completed',
        completedAt,
        updatedAt: completedAt,
      },
      {
        kind: 'session_completed',
        message: 'Session completed.',
      },
    );

    await this.store.save(updated);

    return updated;
  }

  public async fail(
    state: InteractiveSessionState,
    reason: string,
  ): Promise<InteractiveSessionState> {
    const completedAt = new Date().toISOString();

    const updated = this.timeline.append(
      {
        ...state,
        status: 'failed',
        failedReason: reason,
        completedAt,
        updatedAt: completedAt,
      },
      {
        kind: 'session_failed',
        message: `Session failed: ${reason}`,
      },
    );

    await this.store.save(updated);

    return updated;
  }

  private createId(prefix: string): string {
    return `${prefix}-${new Date().toISOString().replaceAll(':', '').replaceAll('.', '')}`;
  }
}
