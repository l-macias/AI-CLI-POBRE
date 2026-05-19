import type { SandboxCommandRequest, SandboxPolicyDecision } from '../types/SandboxTypes.js';
import { SandboxPolicy } from './SandboxPolicy.js';

export interface SandboxManagerOptions {
  policy?: SandboxPolicy | undefined;
}

export class SandboxManager {
  private readonly policy: SandboxPolicy;

  public constructor(options: SandboxManagerOptions = {}) {
    this.policy = options.policy ?? new SandboxPolicy();
  }

  public evaluate(request: SandboxCommandRequest): SandboxPolicyDecision {
    return this.policy.evaluate(request);
  }
}
