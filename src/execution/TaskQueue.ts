import type { RuntimePlan, RuntimePlanStep } from '../types/PlanningTypes.js';
import type { ExecutionQueueItem, ExecutionStepState } from '../types/ExecutionTypes.js';
import { StepExecutionStateMachine } from './StepExecutionStateMachine.js';

export class TaskQueue {
  private readonly items: ExecutionQueueItem[];

  public constructor(plan: RuntimePlan, stateMachine = new StepExecutionStateMachine()) {
    this.items = plan.steps.map((step) => ({
      step,
      state: stateMachine.create(step.id),
    }));
  }

  public list(): ExecutionQueueItem[] {
    return this.items.map((item) => ({
      step: item.step,
      state: item.state,
    }));
  }

  public getItem(stepId: string): ExecutionQueueItem | null {
    return this.items.find((item) => item.step.id === stepId) ?? null;
  }

  public getNextPendingItem(): ExecutionQueueItem | null {
    return this.items.find((item) => item.state.status === 'pending') ?? null;
  }

  public updateState(stepId: string, state: ExecutionStepState): void {
    const index = this.items.findIndex((item) => item.step.id === stepId);

    if (index === -1) {
      throw new Error(`Cannot update missing queue step "${stepId}".`);
    }

    const current = this.items[index];

    if (!current) {
      throw new Error(`Cannot update missing queue index for step "${stepId}".`);
    }

    this.items[index] = {
      step: current.step,
      state,
    };
  }

  public getStep(stepId: string): RuntimePlanStep | null {
    return this.getItem(stepId)?.step ?? null;
  }
}
