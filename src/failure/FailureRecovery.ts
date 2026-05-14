import type { Logger } from '../observability/Logger.js';
import type {
  FailureRecoveryInput,
  FailureRecoveryResult,
  RuntimeFailure,
} from '../types/FailureTypes.js';
import { FailureClassifier } from './FailureClassifier.js';
import { FailureHistory } from './FailureHistory.js';
import { LoopDetector } from './LoopDetector.js';
import { RecursiveFailureGuard } from './RecursiveFailureGuard.js';
import { Replanner } from './Replanner.js';

export interface FailureRecoveryOptions {
  logger: Logger;
  classifier?: FailureClassifier | undefined;
  recursiveGuard?: RecursiveFailureGuard | undefined;
  loopDetector?: LoopDetector | undefined;
  history?: FailureHistory | undefined;
  replanner?: Replanner | undefined;
}

export class FailureRecovery {
  private readonly logger: Logger;
  private readonly classifier: FailureClassifier;
  private readonly recursiveGuard: RecursiveFailureGuard;
  private readonly loopDetector: LoopDetector;
  private readonly history: FailureHistory;
  private readonly replanner: Replanner;

  public constructor(options: FailureRecoveryOptions) {
    this.logger = options.logger;
    this.classifier = options.classifier ?? new FailureClassifier();
    this.recursiveGuard = options.recursiveGuard ?? new RecursiveFailureGuard();
    this.loopDetector = options.loopDetector ?? new LoopDetector();
    this.history = options.history ?? new FailureHistory();
    this.replanner = options.replanner ?? new Replanner();
  }

  public async recover(input: FailureRecoveryInput): Promise<FailureRecoveryResult> {
    const failure = this.classifier.classify({
      stepResult: input.stepResult,
      error: input.error,
    });

    if (failure.kind === 'none') {
      return this.record({
        recovered: true,
        action: 'none',
        failure,
        reason: 'No failure detected.',
      });
    }

    const recursiveCheck = this.recursiveGuard.check(input.depth);

    if (!recursiveCheck.allowed) {
      return this.record({
        recovered: false,
        action: 'block',
        failure: this.overrideKind(failure, 'recursive_failure'),
        reason: recursiveCheck.reason,
      });
    }

    const loopCheck = this.loopDetector.check(failure);

    if (loopCheck.loopDetected) {
      return this.record({
        recovered: false,
        action: 'block',
        failure: this.overrideKind(failure, 'loop_detected'),
        reason: `Loop detected for signature "${loopCheck.signature}".`,
      });
    }

    if (failure.retryable) {
      return this.record({
        recovered: false,
        action: 'retry_step',
        failure,
        reason: 'Failure is retryable, but automatic retry is deferred.',
      });
    }

    if (failure.replanAllowed) {
      const replan = this.replanner.suggest({
        loopState: input.loopState,
        failure,
      });

      return this.record({
        recovered: false,
        action: replan.allowed ? 'replan' : 'block',
        failure,
        reason: replan.reason,
        suggestedObjective: replan.objective,
      });
    }

    return this.record({
      recovered: false,
      action: 'block',
      failure,
      reason: `Failure kind "${failure.kind}" is blocked.`,
    });
  }

  private async record(input: {
    recovered: boolean;
    action: FailureRecoveryResult['action'];
    failure: RuntimeFailure;
    reason: string;
    suggestedObjective?: FailureRecoveryResult['suggestedObjective'];
  }): Promise<FailureRecoveryResult> {
    const createdAt = new Date().toISOString();

    const result: FailureRecoveryResult = {
      recovered: input.recovered,
      action: input.action,
      failure: input.failure,
      reason: input.reason,
      createdAt,
    };

    if (input.suggestedObjective !== undefined) {
      result.suggestedObjective = input.suggestedObjective;
    }

    await this.history.append({
      failure: input.failure,
      action: input.action,
      recovered: input.recovered,
      reason: input.reason,
      timestamp: createdAt,
    });

    this.logger.warn('Failure recovery evaluated', {
      failureId: input.failure.id,
      kind: input.failure.kind,
      action: input.action,
      recovered: input.recovered,
      reason: input.reason,
    });

    return result;
  }

  private overrideKind(failure: RuntimeFailure, kind: RuntimeFailure['kind']): RuntimeFailure {
    return {
      ...failure,
      kind,
      retryable: false,
      replanAllowed: false,
    };
  }
}
