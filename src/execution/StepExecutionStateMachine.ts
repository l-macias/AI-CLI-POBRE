import type { ExecutionStepState } from '../types/ExecutionTypes.js';
import type { ToolExecutionResult } from '../types/ToolTypes.js';

export class StepExecutionStateMachine {
  public create(stepId: string): ExecutionStepState {
    const timestamp = new Date().toISOString();

    return {
      stepId,
      status: 'pending',
      attempts: 0,
      createdAt: timestamp,
      updatedAt: timestamp,
      rollbackAvailable: false,
    };
  }

  public markRunning(state: ExecutionStepState): ExecutionStepState {
    const timestamp = new Date().toISOString();

    return {
      ...state,
      status: 'running',
      attempts: state.attempts + 1,
      startedAt: timestamp,
      updatedAt: timestamp,
    };
  }

  public markFromToolResult(
    state: ExecutionStepState,
    result: ToolExecutionResult,
  ): ExecutionStepState {
    const timestamp = new Date().toISOString();

    const status = this.resolveStatus(result);

    return {
      ...state,
      status,
      result,
      completedAt: timestamp,
      updatedAt: timestamp,
      rollbackAvailable: this.isRollbackAvailable(result),
    };
  }

  public markSkipped(state: ExecutionStepState, reason: string): ExecutionStepState {
    const timestamp = new Date().toISOString();

    return {
      ...state,
      status: 'skipped',
      updatedAt: timestamp,
      completedAt: timestamp,
      rollbackAvailable: false,
      rollbackReason: reason,
    };
  }

  public markRolledBack(state: ExecutionStepState): ExecutionStepState {
    const timestamp = new Date().toISOString();

    return {
      ...state,
      status: 'rolled_back',
      updatedAt: timestamp,
      completedAt: timestamp,
      rollbackAvailable: false,
    };
  }

  private resolveStatus(result: ToolExecutionResult): ExecutionStepState['status'] {
    if (result.status === 'executed') {
      return 'executed';
    }

    if (result.status === 'failed') {
      return 'failed';
    }

    return 'blocked';
  }

  private isRollbackAvailable(result: ToolExecutionResult): boolean {
    if (result.status !== 'executed') {
      return false;
    }

    if (typeof result.output !== 'object' || result.output === null) {
      return false;
    }

    return 'backupPath' in result.output || 'preRestoreBackupPath' in result.output;
  }
}
