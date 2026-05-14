import type { RuntimeFailure } from '../types/FailureTypes.js';

export interface LoopDetectorResult {
  loopDetected: boolean;
  signature: string;
  occurrences: number;
}

export class LoopDetector {
  private readonly signatures = new Map<string, number>();

  public constructor(private readonly maxOccurrences = 1) {}

  public check(failure: RuntimeFailure): LoopDetectorResult {
    const signature = this.createSignature(failure);
    const occurrences = (this.signatures.get(signature) ?? 0) + 1;

    this.signatures.set(signature, occurrences);

    return {
      loopDetected: occurrences > this.maxOccurrences,
      signature,
      occurrences,
    };
  }

  private createSignature(failure: RuntimeFailure): string {
    return [failure.kind, failure.planId ?? 'no-plan', failure.stepId ?? 'no-step'].join(':');
  }
}
