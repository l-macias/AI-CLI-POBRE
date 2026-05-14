import type { RuntimeFailure } from '../types/FailureTypes.js';
import type { RuntimeObjectiveInput } from '../types/ObjectiveTypes.js';
import type { RuntimeLoopState } from '../types/RuntimeLoopTypes.js';

export interface ReplannerInput {
  loopState: RuntimeLoopState;
  failure: RuntimeFailure;
}

export interface ReplannerResult {
  allowed: boolean;
  reason: string;
  objective?: RuntimeObjectiveInput | undefined;
}

export class Replanner {
  public suggest(input: ReplannerInput): ReplannerResult {
    if (!input.failure.replanAllowed) {
      return {
        allowed: false,
        reason: `Failure kind "${input.failure.kind}" is not allowed to replan.`,
      };
    }

    if (!input.loopState.objective) {
      return {
        allowed: false,
        reason: 'Cannot replan without original objective.',
      };
    }

    return {
      allowed: true,
      reason: 'A controlled fallback objective was prepared.',
      objective: {
        objective: `${input.loopState.objective.objective}
Recovery constraint: avoid the failed step "${input.failure.stepId ?? 'unknown'}" and produce a safer validated plan.`,
        module: input.loopState.objective.module,
      },
    };
  }
}
