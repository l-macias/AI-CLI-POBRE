import type {
  InteractiveSessionMessageRole,
  InteractiveSessionRuntimeAction,
  InteractiveSessionState,
  InteractiveSessionStatus,
  InteractiveSessionTimelineEventKind,
} from './InteractiveSessionTypes.js';
import type { JsonObject, JsonValue } from '../types/SharedTypes.js';

export const interactiveSessionStatuses = new Set<InteractiveSessionStatus>([
  'idle',
  'analyzing_project',
  'collecting_context',
  'planning',
  'waiting_user_input',
  'waiting_approval',
  'applying_patch',
  'verifying',
  'completed',
  'failed',
  'paused',
]);

export const interactiveSessionMessageRoles = new Set<InteractiveSessionMessageRole>([
  'user',
  'runtime',
  'assistant',
  'system',
]);

export const interactiveSessionTimelineEventKinds = new Set<InteractiveSessionTimelineEventKind>([
  'session_started',
  'session_paused',
  'session_resumed',
  'status_changed',
  'message_added',
  'decision_added',
  'runtime_action_added',
  'goal_updated',
  'session_completed',
  'session_failed',
]);

export const interactiveSessionRuntimeActionStatuses = new Set<
  InteractiveSessionRuntimeAction['status']
>(['pending', 'running', 'completed', 'blocked', 'failed']);

export interface InteractiveSessionValidationResult {
  valid: boolean;
  issues: string[];
}

export class InteractiveSessionStateValidator {
  public validate(value: unknown): InteractiveSessionValidationResult {
    const issues: string[] = [];

    if (!this.isRecord(value)) {
      return {
        valid: false,
        issues: ['session state root must be an object'],
      };
    }

    if (!this.isNonEmptyString(value['id'])) {
      issues.push('id must be a non-empty string');
    }

    if (!this.isNonEmptyString(value['projectRoot'])) {
      issues.push('projectRoot must be a non-empty string');
    }

    if (!this.isNonEmptyString(value['projectName'])) {
      issues.push('projectName must be a non-empty string');
    }

    if (!this.isStatus(value['status'])) {
      issues.push('status is invalid');
    }

    if (!this.isGoal(value['goal'])) {
      issues.push('goal is invalid');
    }

    if (!this.isMessageArray(value['messages'])) {
      issues.push('messages must be a valid array');
    }

    if (!this.isDecisionArray(value['decisions'])) {
      issues.push('decisions must be a valid array');
    }

    if (!this.isRuntimeActionArray(value['runtimeActions'])) {
      issues.push('runtimeActions must be a valid array');
    }

    if (!this.isTimelineArray(value['timeline'])) {
      issues.push('timeline must be a valid array');
    }

    if (!this.isNonEmptyString(value['createdAt'])) {
      issues.push('createdAt must be a non-empty string');
    }

    if (!this.isNonEmptyString(value['updatedAt'])) {
      issues.push('updatedAt must be a non-empty string');
    }

    if (!this.isOptionalString(value['pausedAt'])) {
      issues.push('pausedAt must be a string when present');
    }

    if (!this.isOptionalString(value['completedAt'])) {
      issues.push('completedAt must be a string when present');
    }

    if (!this.isOptionalString(value['failedReason'])) {
      issues.push('failedReason must be a string when present');
    }

    if (!this.isOptionalString(value['createdBy'])) {
      issues.push('createdBy must be a string when present');
    }

    if (!this.isOptionalJsonObject(value['metadata'])) {
      issues.push('metadata must be a JSON object when present');
    }

    issues.push(...this.validateTerminalConsistency(value));

    return {
      valid: issues.length === 0,
      issues,
    };
  }

  public assertValid(value: unknown): asserts value is InteractiveSessionState {
    const result = this.validate(value);

    if (!result.valid) {
      throw new Error(`Invalid interactive session state: ${result.issues.join('; ')}`);
    }
  }

  private validateTerminalConsistency(state: Record<string, unknown>): string[] {
    const issues: string[] = [];

    if (state['status'] === 'completed' && !this.isNonEmptyString(state['completedAt'])) {
      issues.push('completed session requires completedAt');
    }

    if (state['status'] === 'failed') {
      if (!this.isNonEmptyString(state['completedAt'])) {
        issues.push('failed session requires completedAt');
      }

      if (!this.isNonEmptyString(state['failedReason'])) {
        issues.push('failed session requires failedReason');
      }
    }

    if (state['status'] === 'paused' && !this.isNonEmptyString(state['pausedAt'])) {
      issues.push('paused session requires pausedAt');
    }

    return issues;
  }

  private isGoal(value: unknown): boolean {
    if (!this.isRecord(value)) {
      return false;
    }

    return (
      this.isNonEmptyString(value['original']) &&
      this.isNonEmptyString(value['current']) &&
      Array.isArray(value['updates']) &&
      value['updates'].every((update) => this.isGoalUpdate(update))
    );
  }

  private isGoalUpdate(value: unknown): boolean {
    if (!this.isRecord(value)) {
      return false;
    }

    return (
      this.isNonEmptyString(value['id']) &&
      this.isNonEmptyString(value['previousGoal']) &&
      this.isNonEmptyString(value['nextGoal']) &&
      this.isNonEmptyString(value['reason']) &&
      this.isNonEmptyString(value['createdAt'])
    );
  }

  private isMessageArray(value: unknown): boolean {
    return Array.isArray(value) && value.every((item) => this.isMessage(item));
  }

  private isMessage(value: unknown): boolean {
    if (!this.isRecord(value)) {
      return false;
    }

    return (
      this.isNonEmptyString(value['id']) &&
      typeof value['role'] === 'string' &&
      interactiveSessionMessageRoles.has(value['role'] as InteractiveSessionMessageRole) &&
      this.isNonEmptyString(value['content']) &&
      this.isNonEmptyString(value['createdAt']) &&
      this.isOptionalJsonObject(value['metadata'])
    );
  }

  private isDecisionArray(value: unknown): boolean {
    return Array.isArray(value) && value.every((item) => this.isDecision(item));
  }

  private isDecision(value: unknown): boolean {
    if (!this.isRecord(value)) {
      return false;
    }

    return (
      this.isNonEmptyString(value['id']) &&
      this.isNonEmptyString(value['title']) &&
      this.isNonEmptyString(value['description']) &&
      this.isNonEmptyString(value['reason']) &&
      this.isNonEmptyString(value['createdAt']) &&
      this.isOptionalJsonObject(value['metadata'])
    );
  }

  private isRuntimeActionArray(value: unknown): boolean {
    return Array.isArray(value) && value.every((item) => this.isRuntimeAction(item));
  }

  private isRuntimeAction(value: unknown): boolean {
    if (!this.isRecord(value)) {
      return false;
    }

    return (
      this.isNonEmptyString(value['id']) &&
      this.isNonEmptyString(value['title']) &&
      this.isNonEmptyString(value['description']) &&
      typeof value['status'] === 'string' &&
      interactiveSessionRuntimeActionStatuses.has(
        value['status'] as InteractiveSessionRuntimeAction['status'],
      ) &&
      this.isNonEmptyString(value['createdAt']) &&
      this.isOptionalString(value['completedAt']) &&
      this.isOptionalJsonObject(value['metadata'])
    );
  }

  private isTimelineArray(value: unknown): boolean {
    return Array.isArray(value) && value.every((item) => this.isTimelineEvent(item));
  }

  private isTimelineEvent(value: unknown): boolean {
    if (!this.isRecord(value)) {
      return false;
    }

    return (
      this.isNonEmptyString(value['id']) &&
      typeof value['kind'] === 'string' &&
      interactiveSessionTimelineEventKinds.has(
        value['kind'] as InteractiveSessionTimelineEventKind,
      ) &&
      this.isNonEmptyString(value['message']) &&
      this.isNonEmptyString(value['createdAt']) &&
      this.isOptionalJsonObject(value['metadata'])
    );
  }

  private isStatus(value: unknown): value is InteractiveSessionStatus {
    return (
      typeof value === 'string' && interactiveSessionStatuses.has(value as InteractiveSessionStatus)
    );
  }

  private isOptionalString(value: unknown): boolean {
    return value === undefined || typeof value === 'string';
  }

  private isOptionalJsonObject(value: unknown): boolean {
    return value === undefined || this.isJsonObject(value);
  }

  private isJsonObject(value: unknown): value is JsonObject {
    if (!this.isRecord(value)) {
      return false;
    }

    return Object.values(value).every((item) => this.isJsonValue(item));
  }

  private isJsonValue(value: unknown): value is JsonValue {
    if (
      value === null ||
      typeof value === 'string' ||
      typeof value === 'number' ||
      typeof value === 'boolean'
    ) {
      return true;
    }

    if (Array.isArray(value)) {
      return value.every((item) => this.isJsonValue(item));
    }

    return this.isJsonObject(value);
  }

  private isRecord(value: unknown): value is Record<string, unknown> {
    return typeof value === 'object' && value !== null && !Array.isArray(value);
  }

  private isNonEmptyString(value: unknown): value is string {
    return typeof value === 'string' && value.trim().length > 0;
  }
}
