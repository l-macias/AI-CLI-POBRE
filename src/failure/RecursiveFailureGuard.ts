export interface RecursiveFailureGuardResult {
  allowed: boolean;
  reason: string;
}

export class RecursiveFailureGuard {
  public constructor(private readonly maxDepth = 1) {}

  public check(depth: number): RecursiveFailureGuardResult {
    if (depth > this.maxDepth) {
      return {
        allowed: false,
        reason: `Recursive failure depth ${String(depth)} exceeded maxDepth ${String(this.maxDepth)}.`,
      };
    }

    return {
      allowed: true,
      reason: 'Recursive failure depth allowed.',
    };
  }
}
